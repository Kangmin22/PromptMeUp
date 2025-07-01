// __tests__/prompts.test.js

import handler from '../api/prompts.js';
import { createMocks } from 'node-mocks-http';
import { kv } from '@vercel/kv';

// @vercel/kv 모듈을 통째로 가짜(mock)로 만들되,
// kv 객체와 그 안의 set 함수까지 구체적으로 흉내 내도록 설정한다.
jest.mock('@vercel/kv', () => ({
  kv: {
    set: jest.fn(),
  },
}));

describe('/api/prompts API 테스트', () => {
  // 테스트가 끝나면 매번 mock 기록을 초기화한다.
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('올바른 요청을 보내면, 프롬프트를 저장하고 성공 메시지를 응답해야 한다', async () => {
    // 1. 가짜 kv.set 함수가 성공적으로 실행된 것처럼 설정한다.
    kv.set.mockResolvedValue('OK');

    // 2. API에 보낼 가짜 요청(req)을 만든다.
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        promptId: 'test-prompt',
        content: 'dGVzdCBjb250ZW50', // "test content"를 Base64로 인코딩한 값
        versionTag: 'v1.0.0',
        metadata: { description: '테스트용 프롬프트' }
      }
    });

    // 3. API 핸들러를 실행한다.
    await handler(req, res);

    // 4. 결과를 확인한다.
    // 가짜 kv.set 함수가 올바른 정보로 호출되었는가?
    expect(kv.set).toHaveBeenCalledWith(
      'prompt:test-prompt:v1.0.0',
      {
        content: 'dGVzdCBjb250ZW50',
        metadata: { description: '테스트용 프롬프트' }
      }
    );
    // 응답 코드가 201 (Created) 인가?
    expect(res._getStatusCode()).toBe(201);
    // 응답 메시지가 정확한가?
    expect(JSON.parse(res._getData())).toEqual({
      message: '프롬프트가 저장되었습니다.',
      promptId: 'test-prompt',
      versionTag: 'v1.0.0'
    });
  });

  test('필수 필드(promptId)가 없으면, status 400 에러를 응답해야 한다', async () => {
    // 이번엔 일부러 promptId를 빼고 잘못된 요청을 만든다.
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        content: 'dGVzdCBjb250ZW50',
        versionTag: 'v1.0.0',
      }
    });

    await handler(req, res);

    // 에러 응답이 정확한지 확인한다.
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        error: 'promptId, content는 필수입니다.'
      })
    );
  });
});