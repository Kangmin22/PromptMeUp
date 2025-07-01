// scripts/export-manifest.js

// 1. .env 파일의 비밀 정보들을 코드에서 사용할 수 있게 불러온다.
require('dotenv').config({ path: '.env.development.local' });
const { createClient } = require('@vercel/kv');
const fs = require('fs');

async function exportManifest(promptId, versionTag) {
  console.log(`'${promptId}' 프롬프트의 매니페스트를 생성합니다...`);

  // 2. Vercel KV 데이터베이스에 연결한다.
  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  // 3. 데이터베이스에서 우리가 저장했던 프롬프트 정보를 가져온다.
  const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);

  if (!promptData) {
    console.error('오류: 해당 프롬프트를 찾을 수 없습니다.');
    return;
  }

  // 4. 가져온 프롬프트 정보를 GPTs 마켓 규격에 맞는 JSON 객체로 변환한다.
  const manifest = {
    name: promptId,
    description: promptData.metadata.description || '설명 없음',
    instructions: Buffer.from(promptData.content, 'base64').toString('utf-8'),
    version: versionTag,
    author: 'PromptMeUp'
  };

  // 5. 'gpts-manifest' 폴더가 없으면 만들어주고, 그 안에 결과물을 파일로 저장한다.
  const outputDir = 'gpts-manifest';
  if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir);
  }

  const outputPath = `${outputDir}/${promptId}-${versionTag}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ 성공! 매니페스트 파일이 '${outputPath}' 경로에 저장되었습니다.`);
}

// 이 스크립트를 실행하면 'hello-world' 프롬프트 v1.0.0 버전을 변환한다.
exportManifest('hello-world', 'v1.0.0');