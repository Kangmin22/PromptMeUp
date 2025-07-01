// /lib/embedding-pipeline.js (최상위 폴더)
import { pipeline } from '@xenova/transformers';

// 이 클래스는 이제 API가 아닌 로컬 스크립트에서만 사용됩니다.
export default class EmbeddingPipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance() {
    if (this.instance === null) {
      console.log('임베딩 파이프라인을 새로 생성합니다.');
      this.instance = await pipeline(this.task, this.model);
    }
    return this.instance;
  }
}