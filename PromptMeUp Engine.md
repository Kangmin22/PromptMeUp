## ## 1. 단일 프롬프트 실행`/api/run.js`

```jsx
// /api/run.js
import { kv } from '@vercel/kv';
import { handleAIGeneration, handleGeminiGeneration, handleLocalLlm } from '../lib/ai-handlers.js';

/**
 * 프롬프트 템플릿에 사용자 입력을 적용합니다.
 */
function applyTemplate(template, context) {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => (context && context[key.trim()]) || '');
}

/**
 * @api {post} /api/run
 * @description 특정 프롬프트를 일회성으로 실행합니다. (대화 기록 없음)
 * @param {string} promptId - 실행할 프롬프트의 ID
 * @param {string} versionTag - 프롬프트의 버전
 * @param {object} user_input - 프롬프트 템플릿에 주입할 값
 */
export default async function handler(req, res) {
  try {
    const { promptId, versionTag, user_input } = req.body;
    if (!promptId || !user_input || !versionTag) {
      return res.status(400).json({ error: "promptId, versionTag, user_input은 필수입니다." });
    }

    const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);
    if (!promptData) {
      return res.status(404).json({ error: "해당 프롬프트를 찾을 수 없습니다." });
    }
    
    const promptTemplate = Buffer.from(promptData.content, 'base64').toString('utf-8');
    const finalPrompt = applyTemplate(promptTemplate, user_input);
    const mode = promptData.metadata.execution_mode;

    let resultText;
    if (mode === 'ai_generation') {
      resultText = await handleAIGeneration(finalPrompt);
    } else if (mode === 'gemini_generation') {
      resultText = await handleGeminiGeneration(finalPrompt);
    } else if (mode === 'local_llm') {
      resultText = await handleLocalLlm(finalPrompt);
    } else {
      resultText = finalPrompt;
    }

    res.status(200).json({ result: resultText });
  } catch (e) {
    console.error('프롬프트 실행 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};
```

---

## ## 2. AI 핸들러 (`lib/ai-handlers.js`)

```jsx
// lib/ai-handlers.js
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * OpenAI API (gpt-3.5-turbo)를 호출하여 응답을 생성합니다. (단순 텍스트 입력용)
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleAIGeneration(prompt) {
  // 함수가 호출될 때만 OpenAI 클라이언트를 생성 (Lazy Initialization)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}

/**
 * Google Gemini API (gemini-1.5-flash)를 호출하여 응답을 생성합니다. (단순 텍스트 입력용)
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleGeminiGeneration(prompt) {
  // 함수가 호출될 때만 Gemini 클라이언트를 생성 (Lazy Initialization)
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * 로컬 Ollama 서버의 /api/generate 엔드포인트를 호출합니다. (단순 텍스트 생성용)
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleLocalLlm(prompt) {
  const OLLAMA_API_URL = `http://${process.env.OLLAMA_HOST || '127.0.0.1'}:11434/api/generate`;
  const OLLAMA_DEFAULT_MODEL = 'gemma:2b-instruct-q4_0';
  
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_DEFAULT_MODEL, prompt: prompt, stream: false }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API 요청 실패: ${response.status} ${errorBody}`);
    }
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama 핸들러 오류:', error);
    throw new Error('로컬 AI 모델을 실행하는 중 오류가 발생했습니다.');
  }
}

/**
 * Google Gemini API를 사용하여 대화를 처리합니다. (채팅용)
 * @param {Array<object>} messages - {role: '...', content: '...'} 형식의 메시지 배열
 * @returns {Promise<string>} Gemini의 응답 메시지
 */
export async function handleGeminiChat(messages) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Gemini API는 'assistant' 역할을 'model'로 인식하므로 변환해줍니다.
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: history });
  
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = await result.response;
  return response.text();
}
```

---

## ## 3. 오케스트레이터 (`lib/orchestrator.js`)

```jsx
// lib/orchestrator.js
import { findModuleById } from './module-loader.js';
import { handleLocalLlm, handleGeminiGeneration } from './ai-handlers.js';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbeddingForPrompt } from '../scripts/generate-embeddings.js';

/**
 * 워크플로우를 통해 생성된 최종 결과물들을 조합하여,
 * 새로운 프롬프트를 시스템에 등록하고 임베딩까지 완료합니다.
 * @param {object} context - 모든 단계의 결과물이 담긴 워크플로우 컨텍스트 객체
 * @returns {Promise<object>} /api/prompts API의 최종 등록 결과 객체
 */
async function assembleAndRegister(context) {
  // 1. 최종 프롬프트의 '본문'이 될 내용을 찾습니다. (YAML 포맷 단계의 결과물)
  const finalPromptContent = context['export__final_prompt_yaml__v1'];
  if (!finalPromptContent) {
    throw new Error("최종 프롬프트 YAML(export__final_prompt_yaml__v1)을 찾을 수 없습니다.");
  }

  // 2. 프롬프트의 '메타데이터'가 될 내용을 찾습니다. (자동 태깅 단계의 결과물)
  let newMetadata = { generated_by: 'PromptMeUpBuilder' };
  const tagsOutput = context['meta__auto_tagger__v1'];
  if (tagsOutput) {
    try {
      const parsedTags = JSON.parse(tagsOutput.replace(/```json\n|```/g, ''));
      newMetadata = { ...newMetadata, ...parsedTags };
    } catch (e) {
      console.warn("태그 정보 파싱 실패:", tagsOutput);
    }
  }

  // 3. 고유 ID를 가진 새 프롬프트를 등록합니다.
  const newPromptId = `generated-${uuidv4().slice(0, 8)}`;
  const versionTag = 'v1.0.0';
  const promptKey = `prompt:${newPromptId}:${versionTag}`;

  const registrationBody = {
    promptId: newPromptId,
    content: finalPromptContent,
    versionTag: versionTag,
    metadata: newMetadata,
  };
  
  console.log(`\n📦 [${newPromptId}] 이름으로 새 프롬프트를 시스템에 등록합니다...`);
  console.log('최종 메타데이터:', registrationBody.metadata);

  const registrationUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/prompts`
    : 'http://localhost:3000/api/prompts';

  const response = await fetch(registrationUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationBody)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`프롬프트 등록 실패: ${errorBody}`);
  }

  const result = await response.json();
  console.log(`  ✅ 등록 성공!`);

  // 4. 등록 성공 후, 즉시 임베딩을 생성합니다.
  console.log(`\n📊 이어서 [${newPromptId}] 프롬프트의 임베딩을 생성합니다...`);
  await generateEmbeddingForPrompt(promptKey);

  return result;
}

/**
 * 정의된 워크플로우를 순서대로 실행하고, 지정된 최종 출력 모듈의 결과를 반환합니다.
 * @param {string[]} workflow - 실행할 모듈 ID의 배열
 * @param {string} initialInput - 최초 사용자 입력
 * @param {string} finalOutputModuleId - 최종적으로 결과를 반환할 모듈의 ID. 'register_and_embed'를 전달하면 최종 등록 프로세스를 실행합니다.
 * @returns {Promise<any>} 지정된 최종 모듈의 결과물 또는 등록 결과 객체
 */
export async function runWorkflow(workflow, initialInput, finalOutputModuleId) {
  console.log(`🚀 워크플로우 실행 시작: ${workflow.length}개의 단계`);
  
  const workflowContext = { initialInput: initialInput };
  let currentInput = initialInput;

  for (const moduleId of workflow) {
    console.log(`\n▶️ [${moduleId}] 모듈 실행 중...`);
    const module = findModuleById(moduleId);

    if (!module) { throw new Error(`오류: 모듈 ID [${moduleId}]를 찾을 수 없습니다.`); }
    if (!module.prompt_template) { throw new Error(`오류: 모듈 [${moduleId}]에 prompt_template이 정의되지 않았습니다.`); }
    
    // 특정 모듈들은 이전 단계 결과가 아닌, 전체 컨텍스트를 입력으로 받습니다.
    const inputForThisStep = moduleId.startsWith('validation__') || moduleId.startsWith('export__') || moduleId.startsWith('meta__')
      ? JSON.stringify(workflowContext, null, 2)
      : currentInput;

    const finalPrompt = module.prompt_template.replace('{{input}}', inputForThisStep);

    let output;
    // 복잡하거나 창의적인 작업은 Gemini, 그 외는 로컬 AI를 사용하는 하이브리드 전략
    if (moduleId.startsWith('example_generator__') || moduleId.startsWith('validation__') || moduleId.startsWith('meta__auto_tagger')) {
      console.log(`  🔥 Creative/Complex Task! Gemini AI를 사용합니다...`);
      output = await handleGeminiGeneration(finalPrompt);
    } else {
      console.log('  ⚡️ Structural Task! Local AI를 사용합니다...`);
      output = await handleLocalLlm(finalPrompt);
    }
    
    console.log(`  ✅ 완료: ${module.name}`);
    workflowContext[moduleId] = output;
    currentInput = output;
  }

  console.log('\n✨ 워크플로우 실행 완료!');
  
  // 최종 목표가 '등록'일 경우, 조립 및 등록 프로세스를 실행합니다.
  if (finalOutputModuleId === 'register_and_embed') {
    return await assembleAndRegister(workflowContext);
  }

  // 그 외의 경우, 지정된 모듈의 결과물을 컨텍스트에서 찾아 반환합니다.
  return workflowContext[finalOutputModuleId];
}
```

---

## ## 4. 채팅 API (`/api/chat.js`)

```jsx
// /api/chat.js
import { kv } from '@vercel/kv';
import { handleGeminiChat } from '../lib/ai-handlers.js';

/**
 * 복잡한 프롬프트 YAML 문자열에서 실제 AI가 따라야 할 지시사항 부분만 추출합니다.
 * @param {string} rawPrompt - Base64로 디코딩된 프롬프트 YAML 원본 문자열
 * @returns {string} 정제된 시스템 지시사항
 */
function refineSystemPrompt(rawPrompt) {
  // "**Instructions**" 섹션부터 "**Context**" 또는 "**Examples**" 섹션 전까지의 내용을 추출
  const instructionMatch = rawPrompt.match(/\*\*Instructions\*\*\s*([\s\S]*?)\s*(?=\*\*Context\*\*|\*\*Examples\*\*|$)/);
  if (instructionMatch && instructionMatch[1]) {
    return instructionMatch[1].trim();
  }
  // 만약 Instructions 섹션을 찾지 못하면, 원본을 그대로 반환 (안전장치)
  return rawPrompt;
}

/**
 * @api {post} /api/chat
 * @description agentId를 기반으로 지속적인 대화를 처리합니다.
 * @param {string} agentId - 대화 세션을 식별하는 고유 ID
 * @param {string} userInput - 현재 사용자의 입력 메시지
 */
export default async function handler(req, res) {
  try {
    const { agentId, userInput } = req.body;
    if (!agentId || !userInput) {
      return res.status(400).json({ error: "agentId와 userInput은 필수입니다." });
    }

    // 1. 에이전트의 기본 역할을 정의하는 프롬프트를 가져옵니다.
    // (테스트를 위해 특정 ID를 하드코딩. 실제 서비스에서는 agentId로 프롬프트를 조회해야 함)
    const basePromptKey = 'prompt:generated-f4b8bd61:v1.0.0';
    const promptData = await kv.get(basePromptKey);
    if (!promptData) {
      return res.status(404).json({ error: "에이전트의 기본 프롬프트를 찾을 수 없습니다." });
    }
    const rawPromptContent = Buffer.from(promptData.content, 'base64').toString('utf-8');

    // 2. 프롬프트 내용을 AI가 이해하기 쉬운 핵심 지시사항으로 정제합니다.
    const systemInstruction = refineSystemPrompt(rawPromptContent);
    
    // 3. 이 에이전트의 이전 대화 기록(메모리)을 KV 데이터베이스에서 가져옵니다.
    const memoryKey = `agent:${agentId}:memory`;
    const conversationHistory = await kv.get(memoryKey) || [];

    // 4. AI에게 전달할 구조화된 메시지 배열을 구성합니다.
    const messages = [];
    
    // 대화의 첫 턴일 경우에만 시스템 지시사항을 주입합니다.
    if (conversationHistory.length === 0) {
      const firstUserInput = `
너는 지금부터 아래의 지시사항을 따라야 하는 AI 에이전트다.
---
${systemInstruction}
---

이제 첫 번째 사용자 질문에 답해라.
사용자: ${userInput}
`;
      messages.push({ role: 'user', content: firstUserInput });
    } else {
      // 이전 대화 기록을 메시지 배열에 추가
      conversationHistory.forEach(turn => {
        messages.push({ role: 'user', content: turn.userInput });
        messages.push({ role: 'assistant', content: turn.assistantResponse });
      });
      // 현재 사용자 입력을 마지막에 추가
      messages.push({ role: 'user', content: userInput });
    }

    // 5. 대화에 최적화된 Gemini 핸들러를 호출합니다.
    const assistantResponse = await handleGeminiChat(messages);

    // 6. 새로운 대화 내용을 기록에 추가하여 메모리를 업데이트합니다.
    const newHistory = [...conversationHistory, { userInput: userInput, assistantResponse }];
    await kv.set(memoryKey, newHistory);

    res.status(200).json({ response: assistantResponse });

  } catch (e) {
    console.error('채팅 처리 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};
```

---

## ## 5. 프롬프트 등록 `/api/prompts.js`

```jsx
// /api/prompts.js
import { kv } from '@vercel/kv';

/**
 * @api {post} /api/prompts
 * @description 새로운 프롬프트를 시스템에 등록합니다.
 * @param {string} promptId - 새 프롬프트의 고유 ID
 * @param {string} content - 프롬프트의 내용 (일반 텍스트)
 * @param {string} versionTag - 프롬프트의 버전
 * @param {object} metadata - 실행 모드, 카테고리 등 추가 정보
 */
export default async function handler(req, res) {
  try {
    const { promptId, content, versionTag, metadata } = req.body;

    if (!promptId || !content) {
      return res.status(400).json({ error: "promptId, content는 필수입니다." });
    }
    
    // 서버에서 안정적으로 Base64 인코딩을 수행
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64');
    
    await kv.set(`prompt:${promptId}:${versionTag}`, { content: encodedContent, metadata });

    res.status(201).json({ 
      message: "프롬프트가 성공적으로 저장되었습니다.", 
      promptId, 
      versionTag,
    });

  } catch (e) {
    console.error('프롬프트 등록 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};
```

---

## ## 6. 배치 실행 `/api/batch-run.js`

```jsx
// /api/batch-run.js
import { kv } from '@vercel/kv';
import { handleAIGeneration, handleGeminiGeneration, handleLocalLlm } from '../lib/ai-handlers.js';

/**
 * 단일 프롬프트 요청을 처리하는 내부 헬퍼 함수
 */
async function processSinglePrompt(request) {
  const { promptId, versionTag, user_input } = request;

  if (!promptId || !user_input || !versionTag) {
    return { error: "promptId, versionTag, user_input은 필수입니다.", request };
  }

  const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);
  if (!promptData) {
    return { error: "해당 프롬프트를 찾을 수 없습니다.", request };
  }

  const promptTemplate = Buffer.from(promptData.content, 'base64').toString('utf-8');
  const finalPrompt = promptTemplate.replace(/\{\{(.*?)\}\}/g, (match, key) => (user_input && user_input[key.trim()]) || '');
  const mode = promptData.metadata.execution_mode;

  let resultText;
  if (mode === 'ai_generation') {
    resultText = await handleAIGeneration(finalPrompt);
  } else if (mode === 'gemini_generation') {
    resultText = await handleGeminiGeneration(finalPrompt);
  } else if (mode === 'local_llm') {
    resultText = await handleLocalLlm(finalPrompt);
  } else {
    resultText = finalPrompt;
  }
  
  return { result: resultText, request };
}

/**
 * @api {post} /api/batch-run
 * @description 여러 개의 프롬프트 실행 요청을 배열로 받아 동시에 처리합니다.
 * @param {Array<object>} - 각 요소는 /api/run의 body와 동일한 구조를 가집니다.
 */
export default async function handler(req, res) {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "요청은 반드시 배열 형태여야 합니다." });
    }

    const requests = req.body;
    
    // Promise.all을 사용해서 모든 요청을 병렬로 동시에 처리
    const promises = requests.map(request => processSinglePrompt(request));
    const results = await Promise.all(promises);

    res.status(200).json(results);
  } catch (e) {
    console.error('배치 실행 중 오류:', e);
    res.status(500).json({ error: '배치 실행 중 오류가 발생했습니다.' });
  }
};
```

---

## ## 7. 유사도 검색 `/api/find-similar.js`

```jsx
// /api/find-similar.js
import { kv } from '@vercel/kv';
import { cosineSimilarity } from '../lib/utils.js';

/**
 * @api {get} /api/find-similar
 * @description 특정 프롬프트와 의미적으로 가장 유사한 다른 프롬프트들을 검색합니다.
 * @param {string} promptId - 기준이 될 프롬프트의 ID
 * @param {string} versionTag - 프롬프트의 버전
 */
export default async function handler(req, res) {
  try {
    const { promptId, versionTag } = req.query;
    if (!promptId || !versionTag) {
      return res.status(400).json({ error: "promptId와 versionTag는 필수입니다." });
    }

    const targetKey = `embedding:${promptId}:${versionTag}`;
    const targetVector = await kv.get(targetKey);
    if (!targetVector) {
      return res.status(404).json({ error: "기준 프롬프트를 찾을 수 없습니다." });
    }

    const allEmbeddingKeys = [];
    for await (const key of kv.scanIterator({ match: 'embedding:*' })) {
      allEmbeddingKeys.push(key);
    }
    
    const allVectors = await kv.mget(...allEmbeddingKeys);
    const similarities = [];

    for (let i = 0; i < allEmbeddingKeys.length; i++) {
      const currentKey = allEmbeddingKeys[i];
      if (currentKey === targetKey) continue;

      const currentVector = allVectors[i];
      if (currentVector) {
        const similarity = cosineSimilarity(targetVector, currentVector);
        similarities.push({
          key: currentKey.replace('embedding:', 'prompt:'),
          similarity: similarity,
        });
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    res.status(200).json(similarities);
  } catch (error) {
    console.error('유사 프롬프트 검색 중 오류:', error);
    res.status(500).json({ error: '유사 프롬프트 검색 중 오류가 발생했습니다.' });
  }
};
```

---

## ## 8. 빌더 엔진 테스트용 `/scripts/test-orchestrator.js`

```jsx
// scripts/test-orchestrator.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { runWorkflow } from '../lib/orchestrator.js';

/**
 * @fileoverview PromptMeUp 빌더 엔진의 전체 워크플로우를 테스트하는 스크립트.
 * 사용자의 아이디어를 입력받아 프롬프트를 생성, 검증, 패키징 후 최종적으로 시스템에 등록하고 임베딩까지 완료합니다.
 */

// 테스트를 위한 예시 사용자 아이디어
const userInput = "우리 동네 맛집을 추천해주는 챗봇을 만들어줘. 위치 기반으로 추천하고, 리뷰도 요약해줬으면 좋겠어.";

// 실행할 전체 모듈 파이프라인
const workflow = [
  'input__core_extract__v1',
  'logic__directive_translate__v1',
  'structure__separate_instruction_context__v1',
  'logic__optimize_expression__v1',
  'example_generator__positive_negative__v1',
  'validation__conflict_detector__v1',
  'export__final_prompt_yaml__v1',
  'meta__auto_tagger__v1'
];

async function main() {
  console.log('--- 최종 프롬프트 생성 및 등록 워크플로우 ---');
  console.log('사용자 입력:', userInput);
  try {
    // 최종 목표는 '등록 및 임베딩'이라고 명시적으로 전달
    const finalResult = await runWorkflow(workflow, userInput, 'register_and_embed');
    console.log('\n--- 🚀 최종 등록된 프롬프트 정보 ---');
    console.dir(finalResult, { depth: null });
  } catch (error) {
    console.error('\n--- 워크플로우 실행 중 오류 발생 ---');
    console.error(error.message);
  }
}

main();
```

## ## 9. 프롬프트 재실행용 `/scripts/replay.js`

```jsx
// scripts/replay.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import fs from 'fs/promises';

/**
 * @fileoverview 특정 ID의 프롬프트를 재실행하고, 그 결과를 터미널과 로그 파일에 출력합니다.
 * @usage npm run replay [promptId]
 */

async function replayPrompt() {
  // node, replay.js, [promptId] 순서이므로 3번째 인자를 가져옵니다.
  const promptId = process.argv[2]; 
  
  if (!promptId) {
    console.error('❌ 오류: promptId가 필요합니다. 예: npm run replay local-hello');
    return;
  }

  console.log(`▶️ 프롬프트 [${promptId}]를 재실행합니다...`);

  try {
    const response = await fetch('http://localhost:3000/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptId: promptId,
        versionTag: 'v1.0.0', // 지금은 v1.0.0으로 고정
        user_input: {} // 재실행 시에는 빈 값으로 시작
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
    }

    console.log('✅ 실행 성공!');
    console.log('\n--- AI 응답 결과 ---');
    console.log(result.result);

    // 응답 결과를 로그 파일로 저장
    const logFileName = `logs/replay-${promptId}-${new Date().getTime()}.json`;
    await fs.mkdir('logs', { recursive: true });
    await fs.writeFile(logFileName, JSON.stringify(result, null, 2));
    console.log(`\n📄 로그가 ${logFileName} 파일로 저장되었습니다.`);

  } catch (error) {
    console.error(`\n❌ 프롬프트 실행 중 오류 발생:`, error.message);
  }
}

replayPrompt();
```

---
## ## 10. 유사도 검색용 `/scripts/search.js`

```jsx
// scripts/search.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { kv } from '@vercel/kv';
import EmbeddingPipelineSingleton from './embedding-pipeline.js';
import { cosineSimilarity } from '../lib/utils.js';

/**
 * @fileoverview 자연어 검색어와 의미적으로 가장 유사한 프롬프트를 검색합니다.
 * @usage npm run search "[search query]"
 */
async function searchSimilarPrompts() {
  const query = process.argv[2];
  if (!query) {
    console.error('❌ 오류: 검색어가 필요합니다. 예: npm run search "강남 맛집 챗봇"');
    return;
  }

  console.log(`🔍 검색어 "${query}"와(과) 유사한 프롬프트를 찾습니다...`);

  try {
    // 1. 사용자 검색어의 임베딩 벡터를 생성합니다.
    const extractor = await EmbeddingPipelineSingleton.getInstance();
    const queryEmbedding = await extractor(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(queryEmbedding.data);

    // 2. 데이터베이스의 모든 임베딩을 가져옵니다.
    const allEmbeddingKeys = [];
    for await (const key of kv.scanIterator({ match: 'embedding:*' })) {
      allEmbeddingKeys.push(key);
    }
    const allVectors = await kv.mget(...allEmbeddingKeys);

    // 3. 모든 프롬프트 벡터와의 유사도를 계산합니다.
    const similarities = [];
    for (let i = 0; i < allEmbeddingKeys.length; i++) {
      const currentKey = allEmbeddingKeys[i];
      const currentVector = allVectors[i];
      if (currentVector) {
        const similarity = cosineSimilarity(queryVector, currentVector);
        similarities.push({
          key: currentKey.replace('embedding:', 'prompt:'),
          similarity: similarity,
        });
      }
    }

    // 4. 유사도 순으로 정렬하고 상위 5개를 테이블로 출력합니다.
    similarities.sort((a, b) => b.similarity - a.similarity);
    const top5 = similarities.slice(0, 5);

    console.log('\n--- 🚀 유사도 검색 결과 (Top 5) ---');
    console.table(top5);

  } catch (error) {
    console.error('\n❌ 검색 중 오류 발생:', error.message);
  }
}

searchSimilarPrompts();
```
