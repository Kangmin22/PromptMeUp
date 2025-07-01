// scripts/embed.js

console.log('Hugging Face Transformers.js 라이브러리를 로드하는 중입니다...');
const { pipeline } = require('@xenova/transformers');
const fs = require('fs');

async function createEmbedding(text) {
  try {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    console.log('임베딩 생성 완료!');
    return Array.from(output.data);
  } catch (error) {
    console.error('임베딩 생성 중 오류 발생:', error);
    return null;
  }
}

async function main() {
  // --- 이 부분만 수정 ---
  const inputText1 = "AI가 맛있는 딸기 케이크 레시피를 알려줬어.";
  const inputText2 = "인공지능 덕분에 최고의 스트로베리 케이크 만드는 법을 배웠다.";
  
  const embedding1 = await createEmbedding(inputText1);
  const embedding2 = await createEmbedding(inputText2);

  if (embedding1 && embedding2) {
    const outputDir = 'embeddings';
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }
    
    fs.writeFileSync(`${outputDir}/embedding-1.json`, JSON.stringify(embedding1, null, 2));
    fs.writeFileSync(`${outputDir}/embedding-2.json`, JSON.stringify(embedding2, null, 2));

    console.log(`✅ 성공! 2개의 임베딩 파일이 ${outputDir} 폴더에 저장되었습니다.`);
  }
}

main();