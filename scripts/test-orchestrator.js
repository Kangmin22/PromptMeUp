// scripts/test-orchestrator.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { runWorkflow } from '../lib/orchestrator.js';

const userInput = "우리 동네 맛집을 추천해주는 챗봇을 만들어줘. 위치 기반으로 추천하고, 리뷰도 요약해줬으면 좋겠어.";

// 1~5단계를 순서대로 실행하는 워크플로우로 확장
const simpleWorkflow = [
  'input__core_extract__v1',
  'logic__directive_translate__v1',
  'structure__separate_instruction_context__v1',
  'logic__optimize_expression__v1',
  'example_generator__positive_negative__v1'
];

async function main() {
  console.log('--- AI 연동 워크플로우 테스트 시작 (5단계) ---');
  console.log('사용자 입력:', userInput);
  try {
    const finalResult = await runWorkflow(simpleWorkflow, userInput);
    console.log('\n--- 최종 결과 ---');
    console.log('마지막 단계의 결과물 (생성된 예시):');
    // 마지막 단계의 결과물만 깔끔하게 확인
    console.log(finalResult[finalResult.length - 1].output);
  } catch (error) {
    console.error('\n--- 워크플로우 실행 중 오류 발생 ---');
    console.error(error.message);
  }
}

main();