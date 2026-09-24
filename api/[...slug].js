const db = require('../server/db');
const api = require('../server/api');
const seed = require('../server/seed');

function pickPathname(req) {
    try {
        const u = new URL(req.url, 'http://localhost');
        if (u.pathname && u.pathname.startsWith('/api/') && u.pathname.indexOf('[') === -1 && u.pathname !== '/api/') {
            return u.pathname;
        }
    } catch (e) {}
    const hdr = req.headers || {};
    const fromHeader = hdr['x-vercel-original-pathname'] || hdr['x-matched-path'] || '';
    if (fromHeader.startsWith('/api/') && fromHeader.indexOf('[') === -1) return fromHeader;
    const slug = (req.query && req.query.slug) || [];
    const joined = Array.isArray(slug) ? slug.join('/') : String(slug);
    if (joined) return '/api/' + joined;
    return '';
}

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

    const pathname = pickPathname(req);
    if (!pathname) {
        res.status(200).json({ ok: 0, msg: 'no route resolved', debug: { url: req.url, query: req.query || null, matchedPath: req.headers['x-matched-path'] || '', originalPath: req.headers['x-vercel-original-pathname'] || '' } });
        return;
    }

    const token = req.headers['token'] || '';
    const r = await api.dispatch(pathname, body, token);
    res.status(200).json(r);
};
