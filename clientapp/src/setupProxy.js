const proxy = require('http-proxy-middleware');

const pathRewrite = (p) =>  p;//{ console.log(`HIT ${p}`); return p }

module.exports = function(app) {
    app.use(proxy('/api', { target: 'http://localhost:8101', pathRewrite }));
    app.use(proxy('/subscribe', { target: 'ws://localhost:8101', ws: true, pathRewrite  }));
};

