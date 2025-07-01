// scripts/test-loader.js
import { getAllModules, findModuleById } from '../lib/module-loader.js';

function runTest() {
  console.log('1. 모든 모듈 로드 테스트...');
  const modules = getAllModules();
  if (modules.length > 0) {
    console.log(`✅ 성공! 총 ${modules.length}개의 모듈을 로드했습니다.`);
  } else {
    console.error('❌ 실패! 모듈을 로드하지 못했습니다.');
    return;
  }

  console.log('\n2. 특정 모듈 찾기 테스트 (id: logic__optimize_expression__v1)...');
  const specificModule = findModuleById('logic__optimize_expression__v1');
  if (specificModule) {
    console.log('✅ 성공! 모듈을 찾았습니다:');
    console.log(specificModule);
  } else {
    console.error('❌ 실패! 해당 ID의 모듈을 찾지 못했습니다.');
  }
}

runTest();