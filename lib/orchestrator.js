// lib/orchestrator.js
import { findModuleById } from './module-loader.js';
import { handleLocalLlm, handleGeminiGeneration } from './ai-handlers.js';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbeddingForPrompt } from '../scripts/generate-embeddings.js';

async function assembleAndRegister(context) {
  const finalPromptContent = context['export__final_prompt_yaml__v1'];
  if (!finalPromptContent) {
    throw new Error("최종 프롬프트 YAML(export__final_prompt_yaml__v1)을 찾을 수 없습니다.");
  }

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

  console.log(`\n📊 이어서 [${newPromptId}] 프롬프트의 임베딩을 생성합니다...`);
  await generateEmbeddingForPrompt(promptKey);

  return result;
}

/**
 * 워크플로우를 실행하고, 지정된 최종 출력 모듈의 결과를 반환합니다.
 * @param {string[]} workflow - 실행할 모듈 ID의 배열
 * @param {string} initialInput - 최초 사용자 입력
 * @param {string} finalOutputModuleId - 최종적으로 결과를 반환할 모듈의 ID
 * @returns {Promise<any>} 지정된 최종 모듈의 결과물
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
    
    const inputForThisStep = moduleId.startsWith('validation__') || moduleId.startsWith('export__') || moduleId.startsWith('meta__')
      ? JSON.stringify(workflowContext, null, 2)
      : currentInput;

    const finalPrompt = module.prompt_template.replace('{{input}}', inputForThisStep);

    let output;
    if (moduleId.startsWith('example_generator__') || moduleId.startsWith('validation__') || moduleId.startsWith('meta__auto_tagger')) {
      console.log(`  🔥 Creative/Complex Task! Gemini AI를 사용합니다...`);
      output = await handleGeminiGeneration(finalPrompt);
    } else {
      console.log('  ⚡️ Structural Task! Local AI를 사용합니다...');
      output = await handleLocalLlm(finalPrompt);
    }
    
    console.log(`  ✅ 완료: ${module.name}`);
    workflowContext[moduleId] = output;
    currentInput = output;
  }

  console.log('\n✨ 워크플로우 실행 완료!');
  
  // 만약 최종 출력 모듈이 '등록' 자체를 의미한다면, 등록 프로세스를 실행합니다.
  if (finalOutputModuleId === 'register_and_embed') {
    return await assembleAndRegister(workflowContext);
  }

  // 그렇지 않다면, 지정된 모듈의 결과물을 컨텍스트에서 찾아서 반환합니다.
  return workflowContext[finalOutputModuleId];
}