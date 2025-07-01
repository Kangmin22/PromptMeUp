// scripts/export-markdown.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { runWorkflow } from '../lib/orchestrator.js';

const userInput = "우리 동네 맛집을 추천해주는 챗봇을 만들어줘. 위치 기반으로 추천하고, 리뷰도 요약해줬으면 좋겠어.";

const workflow = [
  'input__core_extract__v1',
  'logic__directive_translate__v1',
  'structure__separate_instruction_context__v1',
  'logic__optimize_expression__v1',
  'example_generator__positive_negative__v1',
  'validation__conflict_detector__v1',
  'export__markdown_table__v1' 
];

async function main() {
  console.log('--- Markdown 테이블 Export 워크플로우 ---');
  console.log('사용자 입력:', userInput);
  try {
    // 최종 목표는 'Markdown 테이블 생성'이라고 명시적으로 전달
    const finalMarkdown = await runWorkflow(workflow, userInput, 'export__markdown_table__v1');
    console.log('\n--- 🚀 최종 완제품 (Markdown 테이블) ---');
    console.log(finalMarkdown);
  } catch (error) {
    console.error('\n--- 워크플로우 실행 중 오류 발생 ---');
    console.error(error.message);
  }
}

main();