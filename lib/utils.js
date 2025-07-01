// /api/lib/utils.js
/**
 * 두 벡터(숫자 배열)의 코사인 유사도를 계산합니다.
 * 벡터는 정규화(길이가 1)되었다고 가정하고 내적(dot product)을 계산합니다.
 * @param {number[]} vecA 첫 번째 벡터
 * @param {number[]} vecB 두 번째 벡터
 * @returns {number} -1과 1 사이의 유사도 점수
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}