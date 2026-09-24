const db = require('../server/db');
const api = require('../server/api');
const seed = require('../server/seed');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, token');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    // Init DB + seeds
    try { await db.init(); await seed.initAll(); } catch (e) { console.error('[init]', e.message); }

    // Parse body
    let body = {};
    if (req.method === 'POST' && req.body) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    // Build pathname from slug
    const slug = req.query.slug || [];
    const pathname = '/api/' + (Array.isArray(slug) ? slug.join('/') : slug);

    const token = req.headers['token'] || '';
    const r = await api.dispatch(pathname, body, token);
    res.status(200).json(r);
};
