// lib/orchestrator.js
import { findModuleById } from './module-loader.js';
import { handleLocalLlm, handleGeminiGeneration } from './ai-handlers.js';

export async function runWorkflow(workflow, initialInput) {
  console.log(`🚀 워크플로우 실행 시작: ${workflow.length}개의 단계`);
  
  // 모든 단계의 결과물을 저장할 컨텍스트 객체
  const workflowContext = {
    initialInput: initialInput,
  };
  
  let currentInput = initialInput;

  for (const moduleId of workflow) {
    console.log(`\n▶️ [${moduleId}] 모듈 실행 중...`);
    const module = findModuleById(moduleId);

    if (!module) { throw new Error(`오류: 모듈 ID [${moduleId}]를 찾을 수 없습니다.`); }
    if (!module.prompt_template) { throw new Error(`오류: 모듈 [${moduleId}]에 prompt_template이 정의되지 않았습니다.`); }

    // export 모듈은 전체 컨텍스트를, 다른 모듈은 이전 단계의 출력을 입력으로 사용
    const inputForThisStep = moduleId.startsWith('export__') 
      ? JSON.stringify(workflowContext, null, 2) // 전체 컨텍스트를 JSON 문자열로 전달
      : currentInput;

    const finalPrompt = module.prompt_template.replace('{{input}}', inputForThisStep);

    let output;
    if (moduleId === 'example_generator__positive_negative__v1') {
      console.log('  🔥 Creative Task! Gemini AI를 사용합니다...');
      output = await handleGeminiGeneration(finalPrompt);
    } else {
      console.log('  ⚡️ Structural Task! Local AI를 사용합니다...');
      output = await handleLocalLlm(finalPrompt);
    }
    
    console.log(`  ✅ 완료: ${module.name}`);
    
    // 현재 단계의 결과물을 컨텍스트와 다음 단계의 입력값으로 저장
    workflowContext[moduleId] = output;
    currentInput = output;
  }

  console.log('\n✨ 워크플로우 실행 완료!');
  // 최종 결과는 마지막 단계의 결과물만 반환
  return workflowContext;
}