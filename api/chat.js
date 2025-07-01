// /api/chat.js
import { kv } from '@vercel/kv';
import { handleGeminiChat } from '../lib/ai-handlers.js';

function refineSystemPrompt(rawPrompt) {
  const instructionMatch = rawPrompt.match(/\*\*Instructions\*\*\s*([\s\S]*?)\s*(?=\*\*Context\*\*|\*\*Examples\*\*|$)/);
  if (instructionMatch && instructionMatch[1]) {
    return instructionMatch[1].trim();
  }
  return rawPrompt;
}

export default async function handler(req, res) {
  try {
    const { agentId, userInput } = req.body;
    if (!agentId || !userInput) {
      return res.status(400).json({ error: "agentId와 userInput은 필수입니다." });
    }

    const basePromptKey = 'prompt:generated-f4b8bd61:v1.0.0';
    const promptData = await kv.get(basePromptKey);
    if (!promptData) {
      return res.status(404).json({ error: "에이전트의 기본 프롬프트를 찾을 수 없습니다." });
    }
    const rawPromptContent = Buffer.from(promptData.content, 'base64').toString('utf-8');
    const systemInstruction = refineSystemPrompt(rawPromptContent);

    const memoryKey = `agent:${agentId}:memory`;
    const conversationHistory = await kv.get(memoryKey) || [];

    // --- Gemini 규칙에 맞춘 메시지 재구성 로직 ---
    const messages = [];
    
    // 이전 대화 기록을 먼저 추가
    conversationHistory.forEach(turn => {
      messages.push({ role: 'user', content: turn.userInput });
      messages.push({ role: 'assistant', content: turn.assistantResponse });
    });

    let finalUserInput = userInput;
    // 만약 이것이 대화의 '첫 번째' 질문이라면, 시스템 지시사항을 질문 앞에 붙여줍니다.
    if (conversationHistory.length === 0) {
      finalUserInput = `
너는 지금부터 아래의 지시사항을 따라야 하는 AI 에이전트다.
---
${systemInstruction}
---

이제 첫 번째 사용자 질문에 답해라.
사용자: ${userInput}
`;
    }
    
    // 현재 사용자 입력을 마지막에 추가
    messages.push({ role: 'user', content: finalUserInput });
    // ------------------------------------------------

    const assistantResponse = await handleGeminiChat(messages);

    // 메모리를 업데이트할 때는 원래의 순수한 userInput을 저장합니다.
    const newHistory = [...conversationHistory, { userInput: userInput, assistantResponse }];
    await kv.set(memoryKey, newHistory);

    res.status(200).json({ response: assistantResponse });

  } catch (e) {
    console.error('채팅 처리 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};