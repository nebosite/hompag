const { createProxyMiddleware } = require('http-proxy-middleware');

const pathRewrite = (p) => p;// { console.log(`HIT ${p}`); return p }


module.exports = function(app) {
    app.use(createProxyMiddleware('/api', { target: 'http://localhost:8101', pathRewrite }));
    app.use(createProxyMiddleware('/subscribe', { target: 'ws://localhost:8101', pathRewrite }));
};