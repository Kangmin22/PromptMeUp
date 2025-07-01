// scripts/test-orchestrator.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { runWorkflow } from '../lib/orchestrator.js';

const userInput = "우리 동네 맛집을 추천해주는 챗봇을 만들어줘. 위치 기반으로 추천하고, 리뷰도 요약해줬으면 좋겠어.";

// 모든 단계를 순서대로 실행하는 최종 워크플로우
const simpleWorkflow = [
  'input__core_extract__v1',
  'logic__directive_translate__v1',
  'structure__separate_instruction_context__v1',
  'logic__optimize_expression__v1',
  'example_generator__positive_negative__v1',
  'export__final_prompt_yaml__v1',
  'export__gpt_market_config__v1' // GPTs 마켓용 변환 단계 추가
];

async function main() {
  console.log('--- GPTs 패키지 생성 전체 워크플로우 테스트 ---');
  console.log('사용자 입력:', userInput);
  try {
    const finalPackage = await runWorkflow(simpleWorkflow, userInput);
    console.log('\n--- 🚀 최종 완제품 (GPTs 마켓플레이스용 JSON) ---');
    console.log(finalPackage);
  } catch (error) {
    console.error('\n--- 워크플로우 실행 중 오류 발생 ---');
    console.error(error.message);
  }
}

main();