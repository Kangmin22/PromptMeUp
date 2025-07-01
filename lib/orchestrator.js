// lib/orchestrator.js
import { findModuleById } from './module-loader.js';
// 이제 모든 AI 핸들러를 가져옵니다.
import { handleLocalLlm, handleGeminiGeneration } from './ai-handlers.js';

/**
 * 모듈 ID 배열(워크플로우)과 초기 입력을 받아 순서대로 실행합니다.
 * @param {string[]} workflow - 실행할 모듈 ID의 배열
 * @param {string} initialInput - 워크플로우를 시작할 최초의 사용자 입력
 * @returns {Promise<Array>} 각 단계의 실행 결과 배열
 */
export async function runWorkflow(workflow, initialInput) {
  console.log(`🚀 워크플로우 실행 시작: ${workflow.length}개의 단계`);
  
  let currentInput = initialInput;
  const results = [];

  for (const moduleId of workflow) {
    console.log(`\n▶️ [${moduleId}] 모듈 실행 중...`);
    const module = findModuleById(moduleId);

    if (!module) { throw new Error(`오류: 모듈 ID [${moduleId}]를 찾을 수 없습니다.`); }
    if (!module.prompt_template) { throw new Error(`오류: 모듈 [${moduleId}]에 prompt_template이 정의되지 않았습니다.`); }

    const finalPrompt = module.prompt_template.replace('{{input}}', currentInput);

    let output;
    // --- 하이브리드 AI 선택 로직 ---
    // 5단계 '예시 생성' 모듈일 경우, 창의적인 능력이 더 뛰어난 Gemini를 사용합니다.
    if (moduleId === 'example_generator__positive_negative__v1') {
      console.log('  🔥 Creative Task! Gemini AI를 사용합니다...');
      output = await handleGeminiGeneration(finalPrompt);
    } else {
      // 그 외의 모든 구조적인 작업은 로컬 AI를 사용합니다.
      console.log('  ⚡️ Structural Task! Local AI를 사용합니다...');
      output = await handleLocalLlm(finalPrompt);
    }
    // ---------------------------------
    
    console.log(`  ✅ 완료: ${module.name}`);
    currentInput = output;
    
    results.push({
      moduleId: module.id,
      status: 'success',
      output: output,
    });
  }

  console.log('\n✨ 워크플로우 실행 완료!');
  return results;
}