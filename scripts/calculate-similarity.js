// scripts/calculate-similarity.js

const fs = require('fs');

// 두 벡터(숫자 배열)의 코사인 유사도를 계산하는 함수
function cosineSimilarity(vecA, vecB) {
  // 참고: 우리는 임베딩을 만들 때 normalize: true 옵션을 사용했어.
  // 그래서 모든 벡터의 길이는 이미 1이야.
  // 따라서 복잡한 코사인 유사도 공식 (A·B / ||A||*||B||) 은
  // 단순히 두 벡터의 내적(dot product)으로 간단해져.

  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // 결과값은 -1에서 1 사이. 1에 가까울수록 비슷하다는 의미.
  return dotProduct;
}

function main() {
  try {
    // 1. 저장된 두 개의 임베딩 파일을 읽어온다.
    const vectorA = JSON.parse(fs.readFileSync('embeddings/embedding-1.json', 'utf-8'));
    const vectorB = JSON.parse(fs.readFileSync('embeddings/embedding-2.json', 'utf-8'));

    // 2. 유사도를 계산한다.
    const similarity = cosineSimilarity(vectorA, vectorB);

    console.log('문장 1: "AI가 맛있는 딸기 케이크 레시피를 알려줬어."');
    console.log('문장 2: "인공지능 덕분에 최고의 스트로베리 케이크 만드는 법을 배웠다."');
    console.log('----------------------------------------------------');
    console.log(`두 문장의 코사인 유사도: ${similarity.toFixed(4)}`);

    if (similarity > 0.8) {
      console.log("결론: 두 문장은 의미적으로 매우 유사합니다!");
    } else if (similarity > 0.5) {
      console.log("결론: 두 문장은 어느 정도 관련이 있습니다.");
    } else {
      console.log("결론: 두 문장은 관련성이 낮습니다.");
    }

  } catch (error) {
    console.error("오류가 발생했습니다:", error.message);
  }
}

main();