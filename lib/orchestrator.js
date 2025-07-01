// lib/orchestrator.js
import { findModuleById } from './module-loader.js';
import { handleLocalLlm, handleGeminiGeneration } from './ai-handlers.js';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbeddingForPrompt } from '../scripts/generate-embeddings.js';

/**
 * 최종 결과물들을 조합하여 새 프롬프트를 등록하고 임베딩합니다.
 */
async function assembleAndRegister(context) {
  // 1. 최종 프롬프트의 '본문'이 될 내용을 찾습니다. (6단계 결과물)
  const finalPromptContent = context['export__final_prompt_yaml__v1'];
  if (!finalPromptContent) {
    throw new Error("최종 프롬프트 YAML(export__final_prompt_yaml__v1)을 찾을 수 없습니다.");
  }

  // 2. 프롬프트의 '메타데이터'가 될 내용을 찾습니다. (7단계 결과물)
  let newMetadata = { generated_by: 'PromptMeUpBuilder' };
  const tagsOutput = context['meta__auto_tagger__v1'];
  if (tagsOutput) {
    try {
      // AI가 생성한 태그 JSON 문자열을 실제 객체로 파싱합니다.
      const parsedTags = JSON.parse(tagsOutput.replace(/```json\n|```/g, ''));
      newMetadata = { ...newMetadata, ...parsedTags };
    } catch (e) {
      console.warn("태그 정보 파싱 실패:", tagsOutput);
    }
  }

  // 3. 새 프롬프트를 등록합니다.
  const newPromptId = `generated-${uuidv4().slice(0, 8)}`;
  const versionTag = 'v1.0.0';
  const promptKey = `prompt:${newPromptId}:${versionTag}`;

  const registrationBody = {
    promptId: newPromptId,
    content: finalPromptContent,
    versionTag: versionTag,
    metadata: newMetadata, // 태그가 포함된 새로운 메타데이터
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

export async function runWorkflow(workflow, initialInput) {
  console.log(`🚀 워크플로우 실행 시작: ${workflow.length}개의 단계`);
  
  const workflowContext = { initialInput: initialInput };
  let currentInput = initialInput;

  for (const moduleId of workflow) {
    console.log(`\n▶️ [${moduleId}] 모듈 실행 중...`);
    const module = findModuleById(moduleId);

    if (!module) { throw new Error(`오류: 모듈 ID [${moduleId}]를 찾을 수 없습니다.`); }
    if (!module.prompt_template) { throw new Error(`오류: 모듈 [${moduleId}]에 prompt_template이 정의되지 않았습니다.`); }
    
    const inputForThisStep = moduleId === 'export__final_prompt_yaml__v1' || moduleId === 'meta__auto_tagger__v1'
      ? JSON.stringify(workflowContext, null, 2)
      : currentInput;

    const finalPrompt = module.prompt_template.replace('{{input}}', inputForThisStep);

    let output;
    if (moduleId === 'example_generator__positive_negative__v1') {
      output = await handleGeminiGeneration(finalPrompt);
    } else {
      // 태깅 모듈도 더 정확한 JSON 생성을 위해 Gemini를 사용하도록 변경
      output = await (moduleId === 'meta__auto_tagger__v1' ? handleGeminiGeneration(finalPrompt) : handleLocalLlm(finalPrompt));
    }
    
    console.log(`  ✅ 완료: ${module.name}`);
    workflowContext[moduleId] = output;
    currentInput = output;
  }

  console.log('\n✨ 워크플로우 실행 완료!');
  
  // 최종 조립 및 등록 함수를 호출합니다.
  const finalResult = await assembleAndRegister(workflowContext);
  
  return finalResult;
}