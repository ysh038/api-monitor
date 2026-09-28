const crypto = require('node:crypto');
const express = require('express');
const { INSERT_SQL, toRow } = require('./db');

/**
 * 개발 모드(npm run dev) 전용 API. 화면 확인용 Mock 데이터를 넣고 지운다.
 * Mock 데이터는 is_mock = 1 로 저장되어 화면에 MOCK 표시가 붙고, 실제 수신 데이터와 따로 지울 수 있다.
 */
function devRouter(db) {
  const router = express.Router();
  const insert = db.prepare(INSERT_SQL);
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));

  router.post('/api/dev/mock', (req, res) => {
    const now = Date.now();
    const rows = mockEvents(now).map((e) => ({ ...toRow(e, now), is_mock: 1 }));
    insertMany(rows);
    res.json({ inserted: rows.length });
  });

  router.delete('/api/dev/mock', (req, res) => {
    const { changes } = db.prepare('DELETE FROM api_logs WHERE is_mock = 1').run();
    res.json({ deleted: changes });
  });

  return router;
}

const id = () => crypto.randomUUID();

const STACK_DB = [
  'org.springframework.dao.DataIntegrityViolationException: could not execute statement',
  '\tat org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:290)',
  '\tat com.example.order.application.OrderService.create(OrderService.java:77)',
  '\tat com.example.order.web.OrderController.create(OrderController.java:40)',
  '\tat java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)',
  '\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:258)',
  '\tat org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:903)',
  '\tat jakarta.servlet.http.HttpServlet.service(HttpServlet.java:614)',
  '\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:139)',
  '\tat org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:52)',
  '\tat java.base/java.lang.Thread.run(Thread.java:1583)',
  'Caused by: org.hibernate.exception.ConstraintViolationException: could not execute statement',
  '\t... 42 more',
  'Caused by: java.sql.SQLIntegrityConstraintViolationException: Cannot add or update a child row: a foreign key constraint fails',
  '\t... 50 more',
].join('\n');

/** 화면의 모든 표시 경우가 한 번씩 나오도록 구성한 Mock 이벤트 (최근 몇 분에 걸쳐 분포). */
function mockEvents(now) {
  const t = (secAgo) => now - secAgo * 1000;
  const json = { 'content-type': 'application/json' };
  const auth = { authorization: '****', accept: 'application/json' };
  const svc = 'mock-order-api';
  const svc2 = 'mock-payment-api';

  const riskId = id();
  const slowId = id();
  const failId = id();
  const chatId = id();

  return [
    // 정상 조회
    { requestId: id(), serviceName: svc, method: 'GET', path: '/api/v1/orders?page=0&size=20', requestHeaders: auth,
      statusCode: 200, responseHeaders: json, responseBody: JSON.stringify({ success: true, data: { items: [{ id: 1, item: '노트북', amount: 1290000 }, { id: 2, item: '모니터', amount: 349000 }], total: 2 } }),
      durationMs: 38, clientIp: '10.0.0.5', timestamp: t(170) },
    // 생성 성공
    { requestId: id(), serviceName: svc, method: 'POST', path: '/api/v1/orders', requestHeaders: { ...auth, ...json },
      requestBody: JSON.stringify({ item: '키보드', amount: 89000, quantity: 2 }), statusCode: 201, responseHeaders: json,
      responseBody: JSON.stringify({ success: true, data: { id: 3 } }), durationMs: 64, clientIp: '10.0.0.5', timestamp: t(160) },
    // 로그인 성공 (마스킹 표시)
    { requestId: id(), serviceName: svc, method: 'POST', path: '/api/v1/auth/login', requestHeaders: json,
      requestBody: JSON.stringify({ loginId: 'admin', password: '****' }), statusCode: 200,
      responseHeaders: { ...json, 'set-cookie': '****' }, responseBody: JSON.stringify({ success: true, data: { accessToken: '****' } }),
      durationMs: 91, clientIp: '10.0.0.7', timestamp: t(150) },
    // 비즈니스 예외 → 401 (앱이 처리)
    { requestId: id(), serviceName: svc, method: 'POST', path: '/api/v1/auth/login', requestHeaders: json,
      requestBody: JSON.stringify({ loginId: 'admin', password: '****' }), statusCode: 401, responseHeaders: json,
      responseBody: JSON.stringify({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' }), durationMs: 12, clientIp: '10.0.0.7', timestamp: t(140),
      exception: { exceptionClass: 'com.example.auth.domain.LoginFailedException', message: '아이디 또는 비밀번호가 일치하지 않습니다.', handled: true,
        stackTrace: 'com.example.auth.domain.LoginFailedException: 아이디 또는 비밀번호가 일치하지 않습니다.\n\tat com.example.auth.application.AuthService.login(AuthService.java:52)\n\tat com.example.auth.web.AuthController.login(AuthController.java:31)' } },
    // 인증 필터에서 거부 → 401 (예외 정보 없음)
    { requestId: id(), serviceName: svc, method: 'GET', path: '/api/v1/orders/3?accessToken=****', requestHeaders: { accept: 'application/json' },
      statusCode: 401, responseHeaders: json, responseBody: JSON.stringify({ success: false, message: '인증이 필요합니다.' }), durationMs: 3, clientIp: '10.0.0.9', timestamp: t(132) },
    // 검증 실패 → 400
    { requestId: id(), serviceName: svc, method: 'POST', path: '/api/v1/orders', requestHeaders: { ...auth, ...json }, requestBody: '{}',
      statusCode: 400, responseHeaders: json, responseBody: JSON.stringify({ success: false, message: '요청 형식이 올바르지 않습니다.' }), durationMs: 9, clientIp: '10.0.0.5', timestamp: t(125),
      exception: { exceptionClass: 'org.springframework.web.bind.MethodArgumentNotValidException', message: "Validation failed for argument [0]: [Field error in object 'orderRequest' on field 'item': rejected value [null]]", handled: true,
        stackTrace: 'org.springframework.web.bind.MethodArgumentNotValidException: Validation failed for argument [0]\n\tat org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor.resolveArgument(RequestResponseBodyMethodProcessor.java:159)' } },
    // 없는 경로 → 404
    { requestId: id(), serviceName: svc, method: 'GET', path: '/api/v1/order', requestHeaders: auth, statusCode: 404, responseHeaders: json,
      responseBody: JSON.stringify({ status: 404, error: 'Not Found', path: '/api/v1/order' }), durationMs: 4, clientIp: '10.0.0.5', timestamp: t(118) },
    // DB 예외 → 500 (cause 체인, 긴 스택트레이스)
    { requestId: id(), serviceName: svc, method: 'POST', path: '/api/v1/orders', requestHeaders: { ...auth, ...json },
      requestBody: JSON.stringify({ item: '마우스', amount: 39000, customerId: 99999 }), statusCode: 500, responseHeaders: json,
      responseBody: JSON.stringify({ success: false, message: '서버 내부 오류가 발생했습니다.' }), durationMs: 1204, clientIp: '10.0.0.5', timestamp: t(110),
      exception: { exceptionClass: 'org.springframework.dao.DataIntegrityViolationException', message: 'could not execute statement', handled: true, stackTrace: STACK_DB,
        causes: [
          { exceptionClass: 'org.hibernate.exception.ConstraintViolationException', message: 'could not execute statement' },
          { exceptionClass: 'java.sql.SQLIntegrityConstraintViolationException', message: 'Cannot add or update a child row: a foreign key constraint fails' },
        ] } },
    // 외부 호출 성공 (부모 요청에 묶임)
    { kind: 'OUTBOUND', requestId: id(), parentRequestId: riskId, serviceName: svc, method: 'GET', targetHost: 'ai-server:8000', path: '/risk?month=2026-09',
      requestHeaders: { 'x-api-key': '****', 'x-request-id': riskId }, statusCode: 200, responseHeaders: json,
      responseBody: JSON.stringify({ month: '2026-09', items: [{ id: 'A-100', score: 0.82 }, { id: 'A-203', score: 0.41 }] }), durationMs: 420, timestamp: t(100) },
    { requestId: riskId, serviceName: svc, method: 'GET', path: '/api/v1/risk-scores', requestHeaders: auth, statusCode: 200, responseHeaders: json,
      responseBody: JSON.stringify({ success: true, data: { month: '2026-09', count: 2 } }), durationMs: 436, clientIp: '10.0.0.5', timestamp: t(100.5) },
    // 외부 서버 500 → 앱도 500
    { kind: 'OUTBOUND', requestId: id(), parentRequestId: failId, serviceName: svc, method: 'POST', targetHost: 'ai-server:8000', path: '/predict',
      requestHeaders: { 'x-api-key': '****', ...json, 'x-request-id': failId }, requestBody: JSON.stringify({ orderId: 3, apiToken: '****' }),
      statusCode: 500, responseHeaders: json, responseBody: JSON.stringify({ detail: 'model not loaded: risk-model-v3' }), durationMs: 45, timestamp: t(90) },
    { requestId: failId, serviceName: svc, method: 'POST', path: '/api/v1/orders/3/predict', requestHeaders: auth, statusCode: 500, responseHeaders: json,
      responseBody: JSON.stringify({ success: false, message: '서버 내부 오류가 발생했습니다.' }), durationMs: 52, clientIp: '10.0.0.5', timestamp: t(90.1),
      exception: { exceptionClass: 'org.springframework.web.client.HttpServerErrorException$InternalServerError', message: '500 Internal Server Error: "{"detail": "model not loaded: risk-model-v3"}"', handled: true,
        stackTrace: 'org.springframework.web.client.HttpServerErrorException$InternalServerError: 500 Internal Server Error\n\tat org.springframework.web.client.DefaultRestClient$DefaultResponseSpec.onStatus(DefaultRestClient.java:845)\n\tat com.example.order.infra.AiClient.predict(AiClient.java:61)' } },
    // 외부 호출 타임아웃 (응답 없음 ERR) → 앱 500, 느린 요청
    { kind: 'OUTBOUND', requestId: id(), parentRequestId: slowId, serviceName: svc2, method: 'GET', targetHost: 'pg-gateway:9000', path: '/payments/7781/status',
      requestHeaders: { 'x-request-id': slowId }, statusCode: null, durationMs: 3003, timestamp: t(80),
      exception: { exceptionClass: 'java.net.SocketTimeoutException', message: 'Read timed out', stackTrace: 'java.net.SocketTimeoutException: Read timed out\n\tat java.base/sun.nio.ch.NioSocketImpl.timedRead(NioSocketImpl.java:278)' } },
    { requestId: slowId, serviceName: svc2, method: 'GET', path: '/api/v1/payments/7781', requestHeaders: auth, statusCode: 500, responseHeaders: json,
      responseBody: JSON.stringify({ success: false, message: '서버 내부 오류가 발생했습니다.' }), durationMs: 3021, clientIp: '10.0.0.8', timestamp: t(80.1),
      exception: { exceptionClass: 'org.springframework.web.client.ResourceAccessException', message: 'I/O error on GET request for "http://pg-gateway:9000/payments/7781/status": Read timed out', handled: true,
        stackTrace: 'org.springframework.web.client.ResourceAccessException: I/O error on GET request\n\tat org.springframework.web.client.DefaultRestClient.createResourceAccessException(DefaultRestClient.java:697)\n\tat com.example.payment.infra.PgClient.status(PgClient.java:44)\nCaused by: java.net.SocketTimeoutException: Read timed out',
        causes: [{ exceptionClass: 'java.net.SocketTimeoutException', message: 'Read timed out' }] } },
    // SSE (비동기) + 백그라운드 외부 호출
    { requestId: chatId, serviceName: svc, method: 'POST', path: '/api/v1/chat-sessions', requestHeaders: { ...auth, ...json },
      requestBody: JSON.stringify({ message: '이번 달 주문 현황 알려줘' }), statusCode: 200, responseHeaders: { 'content-type': 'text/event-stream' },
      responseBody: 'event:token\ndata:{"text": "이번 달"}\n\nevent:token\ndata:{"text": " 주문은 128건"}\n\nevent:done\ndata:{}\n\n',
      durationMs: 1234, async: true, clientIp: '10.0.0.9', timestamp: t(60) },
    { kind: 'OUTBOUND', requestId: id(), serviceName: svc, method: 'POST', targetHost: 'ai-server:8000', path: '/query',
      requestHeaders: { 'x-api-key': '****', ...json, accept: 'text/event-stream' }, requestBody: JSON.stringify({ message: '이번 달 주문 현황 알려줘' }),
      statusCode: 200, responseHeaders: { 'content-type': 'text/event-stream' },
      responseBody: 'event: token\ndata: {"text": "이번 달"}\n\nevent: token\ndata: {"text": " 주문은 128건"}\n\n', durationMs: 1210, timestamp: t(59.9) },
    // 파일 업로드 / 다운로드 (요약만 저장)
    { requestId: id(), serviceName: svc2, method: 'POST', path: '/api/v1/receipts', requestHeaders: { ...auth, 'content-type': 'multipart/form-data; boundary=----X' },
      requestBody: '[multipart/form-data, 3.2MB]', statusCode: 200, responseHeaders: json, responseBody: JSON.stringify({ success: true, data: { fileId: 'f-2931' } }),
      durationMs: 210, clientIp: '10.0.0.8', timestamp: t(40) },
    { requestId: id(), serviceName: svc2, method: 'GET', path: '/api/v1/receipts/f-2931/download', requestHeaders: auth, statusCode: 200,
      responseHeaders: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename=receipt.pdf' },
      responseBody: '[binary application/octet-stream, 195.3KB]', responseBodyTruncated: true, durationMs: 18, clientIp: '10.0.0.8', timestamp: t(30) },
    // 결제 서비스 정상
    { requestId: id(), serviceName: svc2, method: 'GET', path: '/api/v1/payments?status=PAID', requestHeaders: auth, statusCode: 200, responseHeaders: json,
      responseBody: JSON.stringify({ success: true, data: { items: [{ id: 7780, amount: 89000, status: 'PAID' }] } }), durationMs: 27, clientIp: '10.0.0.8', timestamp: t(10) },
  ];
}

module.exports = { devRouter };
