// /api/batch-run.js
import { kv } from '@vercel/kv';
import { handleAIGeneration, handleGeminiGeneration, handleLocalLlm } from '../lib/ai-handlers.js';

/**
 * 단일 프롬프트 요청을 처리하는 내부 함수
 */
async function processSinglePrompt(request) {
  const { promptId, versionTag, user_input } = request;

  // 요청 데이터 유효성 검사
  if (!promptId || !user_input || !versionTag) {
    // 개별 요청이 실패하더라도 전체가 멈추지 않도록 에러를 반환
    return { error: "promptId, versionTag, user_input은 필수입니다.", request };
  }

  const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);
  if (!promptData) {
    return { error: "해당 프롬프트를 찾을 수 없습니다.", request };
  }

  const promptTemplate = Buffer.from(promptData.content, 'base64').toString('utf-8');
  const finalPrompt = promptTemplate.replace(/\{\{(.*?)\}\}/g, (match, key) => (user_input && user_input[key.trim()]) || '');
  const mode = promptData.metadata.execution_mode;

  let resultText;
  if (mode === 'ai_generation') {
    resultText = await handleAIGeneration(finalPrompt);
  } else if (mode === 'gemini_generation') {
    resultText = await handleGeminiGeneration(finalPrompt);
  } else if (mode === 'local_llm') {
    resultText = await handleLocalLlm(finalPrompt);
  } else {
    resultText = finalPrompt;
  }
  
  return { result: resultText, request };
}

export default async function handler(req, res) {
  try {
    // 요청 바디가 배열 형태인지 확인
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "요청은 반드시 배열 형태여야 합니다." });
    }

    const requests = req.body;
    
    // Promise.all을 사용해서 모든 요청을 '동시에' 처리합니다.
    // 각 요청이 하나의 프로미스가 되고, 모든 프로미스가 완료될 때까지 기다립니다.
    const promises = requests.map(request => processSinglePrompt(request));
    const results = await Promise.all(promises);

    res.status(200).json(results);

  } catch (e) {
    console.error('배치 실행 중 오류:', e);
    res.status(500).json({ error: '배치 실행 중 오류가 발생했습니다.' });
  }
};