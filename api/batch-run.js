// /api/batch-run.js

const { kv } = require('@vercel/kv');
const { handleAIGeneration } = require('../core/ai/openai.js');
const { handleGeminiGeneration } = require('../core/ai/gemini.js');

// 단일 프롬프트를 실행하는 로직을 별도 함수로 분리
async function processSinglePrompt(runRequest) {
  const { promptId, versionTag, user_input } = runRequest;

  // 입력값 유효성 검사
  if (!promptId || !user_input || !versionTag) {
    // 개별 요청이 실패하더라도 전체가 멈추지 않도록 에러를 반환
    return { error: "promptId, versionTag, user_input은 필수입니다.", request: runRequest };
  }

  const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);
  if (!promptData) {
    return { error: "해당 프롬프트를 찾을 수 없습니다.", request: runRequest };
  }
  
  const promptTemplate = Buffer.from(promptData.content, 'base64').toString('utf-8');
  
  const applyTemplate = (template, context) => 
    template.replace(/\{\{(.*?)\}\}/g, (match, key) => context[key.trim()] || '');

  const finalPrompt = applyTemplate(promptTemplate, user_input);
  const mode = promptData.metadata.execution_mode;

  let resultText;
  if (mode === 'ai_generation') {
    resultText = await handleAIGeneration(finalPrompt);
  } else if (mode === 'gemini_generation') {
    resultText = await handleGeminiGeneration(finalPrompt);
  } else {
    resultText = finalPrompt;
  }
  
  return { result: resultText };
}

module.exports = async (req, res) => {
  try {
    // 요청 body에서 'requests'라는 이름의 배열을 받는다.
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: "requests 배열이 비어있거나 올바르지 않습니다." });
    }

    // --- 여기가 핵심: Promise.all로 모든 프롬프트 실행을 병렬 처리 ---
    // 1. 각 요청을 비동기 처리 함수(processSinglePrompt)로 매핑하여 프로미스 배열을 만든다.
    const promises = requests.map(runRequest => processSinglePrompt(runRequest));
    
    // 2. Promise.all을 사용해 모든 프로미스가 완료될 때까지 기다린다.
    const results = await Promise.all(promises);

    // 3. 모든 작업이 완료되면, 그 결과들을 한 번에 응답으로 보낸다.
    res.status(200).json(results);

  } catch (e) {
    console.error('배치 실행 중 오류:', e);
    res.status(500).json({ error: '배치 실행 중 오류가 발생했습니다.' });
  }
};