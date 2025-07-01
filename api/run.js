// /api/run.js
import { kv } from '@vercel/kv';
// 상위 폴더의 통합된 lib 디렉토리를 참조합니다.
import { handleAIGeneration, handleGeminiGeneration, handleLocalLlm } from '../lib/ai-handlers.js';

/**
 * 프롬프트 템플릿에 사용자 입력을 적용합니다.
 * 예: "내 이름은 {{name}}이야" + {name: "철수"} -> "내 이름은 철수이야"
 * @param {string} template - {{}} 플레이스홀더를 포함한 템플릿 문자열
 * @param {object} context - 플레이스홀더에 채워넣을 값을 가진 객체
 * @returns {string} - 사용자 입력이 적용된 최종 프롬프트
 */
function applyTemplate(template, context) {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => context[key.trim()] || '');
}

export default async function handler(req, res) {
  try {
    const { promptId, versionTag, user_input } = req.body;
    if (!promptId || !user_input || !versionTag) {
      return res.status(400).json({ error: "promptId, versionTag, user_input은 필수입니다." });
    }

    const promptData = await kv.get(`prompt:${promptId}:${versionTag}`);
    if (!promptData) {
      return res.status(404).json({ error: "해당 프롬프트를 찾을 수 없습니다." });
    }
    
    const promptTemplate = Buffer.from(promptData.content, 'base64').toString('utf-8');
    const finalPrompt = applyTemplate(promptTemplate, user_input);
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

    res.status(200).json({ result: resultText });

  } catch (e) {
    console.error('프롬프트 실행 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};