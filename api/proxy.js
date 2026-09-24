const db = require('../server/db');
const api = require('../server/api');
const seed = require('../server/seed');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, token');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    try { await db.init(); await seed.initAll(); } catch (e) { console.error('[init]', e.message); }

    let body = {};
    if (req.method === 'POST' && req.body) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    let path = (req.query && req.query.path) || '';
    if (Array.isArray(path)) path = path.join('/');
    const pathname = path ? '/api/' + String(path).replace(/^\/+/, '') : '';

    if (!pathname) {
        res.status(200).json({ ok: 0, msg: 'no path', debug: { url: req.url, query: req.query || null } });
        return;
    }

    const token = req.headers['token'] || '';
    const r = await api.dispatch(pathname, body, token);
    res.status(200).json(r);
};
