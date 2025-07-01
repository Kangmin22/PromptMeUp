// scripts/generate-embeddings.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { kv } from '@vercel/kv';
import EmbeddingPipelineSingleton from './embedding-pipeline.js';

/**
 * 단일 프롬프트에 대한 임베딩을 생성하고 저장하는 함수
 * @param {string} promptKey - 'prompt:id:version' 형식의 프롬프트 키
 */
export async function generateEmbeddingForPrompt(promptKey) {
  const extractor = await EmbeddingPipelineSingleton.getInstance();
  const embeddingKey = promptKey.replace('prompt:', 'embedding:');
  
  // 이미 임베딩이 존재하면 건너뜀
  const embeddingExists = await kv.exists(embeddingKey);
  if (embeddingExists) {
    console.log(`  이미 존재함: ${embeddingKey}`);
    return;
  }

  console.log(`- 임베딩 생성 중: ${promptKey}`);
  const promptData = await kv.get(promptKey);
  if (promptData && promptData.content) {
    const decodedContent = Buffer.from(promptData.content, 'base64').toString('utf-8');
    const embedding = await extractor(decodedContent, { pooling: 'mean', normalize: true });
    const embeddingArray = Array.from(embedding.data);
    await kv.set(embeddingKey, embeddingArray);
    console.log(`  ✅ 완료: ${embeddingKey}`);
  }
}

/**
 * 스크립트를 직접 실행할 때 호출되는 메인 함수
 */
async function main() {
  console.log('데이터베이스를 스캔하여 임베딩이 없는 프롬프트를 찾습니다...');
  let generatedCount = 0;

  for await (const promptKey of kv.scanIterator({ match: 'prompt:*' })) {
    await generateEmbeddingForPrompt(promptKey);
    generatedCount++;
  }

  if (generatedCount === 0) {
    console.log('모든 프롬프트가 이미 최신 임베딩을 가지고 있습니다.');
  } else {
    console.log(`\n✅ 성공! ${generatedCount}개의 프롬프트를 확인하고 필요한 임베딩을 생성했습니다.`);
  }
}

// 이 파일이 직접 실행될 때만 main() 함수를 호출
if (process.argv[1].includes('generate-embeddings.js')) {
    main();
}