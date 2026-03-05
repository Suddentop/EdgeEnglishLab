/**
 * 개발 서버(localhost)에서 /secure-api-proxy.php 를 edgeenglish.net 으로 프록시.
 * 근본 원인: edgeenglish.net 서버가 CORS 헤더를 보내지 않아 브라우저가 cross-origin 요청을 차단함.
 * 이 프록시로 브라우저는 localhost로만 요청하고, Node가 edgeenglish.net으로 전달함. (docs/CORS_AND_API_PROXY.md)
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/secure-api-proxy.php',
    createProxyMiddleware({
      target: 'https://edgeenglish.net',
      changeOrigin: true,
      secure: true,
    })
  );
};
