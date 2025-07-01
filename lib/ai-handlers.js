// lib/ai-handlers.js
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * OpenAI API (gpt-3.5-turbo)를 호출하여 응답을 생성합니다. (단순 텍스트 입력)
 */
export async function handleAIGeneration(prompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}

/**
 * Google Gemini API (gemini-1.5-flash)를 호출하여 응답을 생성합니다. (단순 텍스트 입력)
 */
export async function handleGeminiGeneration(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * 로컬 Ollama 서버의 /api/generate 엔드포인트를 호출합니다. (단순 텍스트 생성용)
 */
export async function handleLocalLlm(prompt) {
  const OLLAMA_API_URL = `http://${process.env.OLLAMA_HOST || '127.0.0.1'}:11434/api/generate`;
  const OLLAMA_DEFAULT_MODEL = 'gemma:2b-instruct-q4_0';
  
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_DEFAULT_MODEL, prompt: prompt, stream: false }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API 요청 실패: ${response.status} ${errorBody}`);
    }
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama 핸들러 오류:', error);
    throw new Error('로컬 AI 모델을 실행하는 중 오류가 발생했습니다.');
  }
}

/**
 * Google Gemini API를 사용하여 대화를 처리합니다. (채팅용)
 */
export async function handleGeminiChat(messages) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: history });
  
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = await result.response;
  return response.text();
}