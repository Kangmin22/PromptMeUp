// /api/prompts.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const { promptId, content, versionTag, metadata } = req.body;

    if (!promptId || !content) {
      return res.status(400).json({ error: "promptId, content는 필수입니다." });
    }
    
    // 이제 서버는 받은 텍스트를 Base64로 인코딩해서 저장만 합니다.
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64');
    
    await kv.set(`prompt:${promptId}:${versionTag}`, { content: encodedContent, metadata });

    res.status(201).json({ 
      message: "프롬프트가 성공적으로 저장되었습니다. (임베딩은 별도 생성 필요)", 
      promptId, 
      versionTag,
    });

  } catch (e) {
    console.error('프롬프트 등록 중 오류:', e);
    res.status(500).json({ error: e.message });
  }
};