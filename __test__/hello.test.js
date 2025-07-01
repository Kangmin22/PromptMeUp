// __tests__/hello.test.js

import handler from '../api/hello.js';
import { createMocks } from 'node-mocks-http';

describe('/api/hello API 테스트', () => {
  test('요청을 보내면 status 200과 Hello World 메시지를 응답해야 한다', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'Hello World',
      })
    );
  });
});