// scripts/generate-embeddings.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { kv } from '@vercel/kv';
// 바로 같은 폴더에 있는 파일을 가리키도록 경로 수정
import EmbeddingPipelineSingleton from './embedding-pipeline.js';

async function main() {
  console.log('데이터베이스를 스캔하여 임베딩이 없는 프롬프트를 찾습니다...');
  const extractor = await EmbeddingPipelineSingleton.getInstance();
  let generatedCount = 0;

  for await (const promptKey of kv.scanIterator({ match: 'prompt:*' })) {
    const embeddingKey = promptKey.replace('prompt:', 'embedding:');
    const embeddingExists = await kv.exists(embeddingKey);
    if (embeddingExists) {
      continue;
    }

    console.log(`- 임베딩 생성 중: ${promptKey}`);
    const promptData = await kv.get(promptKey);
    if (promptData && promptData.content) {
      const decodedContent = Buffer.from(promptData.content, 'base64').toString('utf-8');
      const embedding = await extractor(decodedContent, { pooling: 'mean', normalize: true });
      const embeddingArray = Array.from(embedding.data);
      await kv.set(embeddingKey, embeddingArray);
      console.log(`  완료: ${embeddingKey}`);
      generatedCount++;
    }
  }

  if (generatedCount === 0) {
    console.log('모든 프롬프트가 이미 최신 임베딩을 가지고 있습니다.');
  } else {
    console.log(`\n✅ 성공! ${generatedCount}개의 새로운 임베딩을 생성하고 저장했습니다.`);
  }
}

main();