// scripts/search.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

import { kv } from '@vercel/kv';
import EmbeddingPipelineSingleton from './embedding-pipeline.js';
import { cosineSimilarity } from '../lib/utils.js';

async function searchSimilarPrompts() {
  const query = process.argv[2];
  if (!query) {
    console.error('❌ 오류: 검색어가 필요합니다. 예: npm run search "강남 맛집 챗봇"');
    return;
  }

  console.log(`🔍 검색어 "${query}"와(과) 유사한 프롬프트를 찾습니다...`);

  try {
    // 1. 사용자 검색어의 임베딩 벡터를 생성합니다.
    const extractor = await EmbeddingPipelineSingleton.getInstance();
    const queryEmbedding = await extractor(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(queryEmbedding.data);

    // 2. 데이터베이스의 모든 임베딩 키와 벡터를 가져옵니다.
    const allEmbeddingKeys = [];
    for await (const key of kv.scanIterator({ match: 'embedding:*' })) {
      allEmbeddingKeys.push(key);
    }
    const allVectors = await kv.mget(...allEmbeddingKeys);

    // 3. 검색어 벡터와 모든 프롬프트 벡터 간의 유사도를 계산합니다.
    const similarities = [];
    for (let i = 0; i < allEmbeddingKeys.length; i++) {
      const currentKey = allEmbeddingKeys[i];
      const currentVector = allVectors[i];
      if (currentVector) {
        const similarity = cosineSimilarity(queryVector, currentVector);
        similarities.push({
          key: currentKey.replace('embedding:', 'prompt:'),
          similarity: similarity,
        });
      }
    }

    // 4. 유사도 순으로 정렬하고 상위 5개를 출력합니다.
    similarities.sort((a, b) => b.similarity - a.similarity);
    const top5 = similarities.slice(0, 5);

    console.log('\n--- 🚀 유사도 검색 결과 (Top 5) ---');
    console.table(top5);

  } catch (error) {
    console.error('\n❌ 검색 중 오류 발생:', error.message);
  }
}

searchSimilarPrompts();