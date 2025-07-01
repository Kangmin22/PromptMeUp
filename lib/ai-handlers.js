// lib/ai-handlers.js
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * OpenAI API (gpt-3.5-turbo)를 호출하여 응답을 생성합니다.
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleAIGeneration(prompt) {
  // 함수가 호출될 때만 OpenAI 클라이언트를 생성합니다.
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0].message.content;
}

/**
 * Google Gemini API (gemini-1.5-flash)를 호출하여 응답을 생성합니다.
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleGeminiGeneration(prompt) {
  // 함수가 호출될 때만 Gemini 클라이언트를 생성합니다.
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * 로컬 Ollama 서버 (gemma:2b)를 호출하여 응답을 생성합니다.
 * @param {string} prompt - AI에게 전달할 최종 프롬프트
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
export async function handleLocalLlm(prompt) {
  const OLLAMA_API_URL = `http://${process.env.OLLAMA_HOST || '127.0.0.1'}:11434/api/generate`;
  const OLLAMA_DEFAULT_MODEL = 'gemma:2b';
  
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_DEFAULT_MODEL,
        prompt: prompt,
        stream: false,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API 요청 실패: ${response.status} ${errorBody}`);
    }
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama 핸들러 오류:', error);
    throw new Error('로컬 AI 모델을 실행하는 중 오류가 발생했습니다. Ollama가 켜져 있는지, OLLAMA_HOST 환경변수가 올바른지 확인하세요.');
  }
}