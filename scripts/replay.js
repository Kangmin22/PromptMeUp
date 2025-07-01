// scripts/replay.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import fs from 'fs/promises';

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

    const logFileName = `logs/replay-${promptId}-${new Date().getTime()}.json`;
    await fs.mkdir('logs', { recursive: true });
    await fs.writeFile(logFileName, JSON.stringify(result, null, 2));
    console.log(`\n📄 로그가 ${logFileName} 파일로 저장되었습니다.`);

  } catch (error) {
    console.error(`\n❌ 프롬프트 실행 중 오류 발생:`, error.message);
  }
}

replayPrompt();