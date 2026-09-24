/**
 * 鉴权：简单 token（用户端 / 管理端）
 * token = md5(类型+id+时间戳+随机)，存入 MongoDB（serverless 友好，无状态）
 */
const crypto = require('crypto');
const db = require('./db');

const EXPIRE = 24 * 3600 * 1000; // 24 小时

function md5(str) {
	return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

async function issue(type, id) {
	const token = md5(type + id + Date.now() + Math.random());
	await db.insert('session', {
		_id: db.nextId('session_'),
		token, type, id,
		expire: Date.now() + EXPIRE
	});
	return token;
}

/** 校验，返回 {type,id} 或 null */
async function verify(token, type) {
	if (!token) return null;
	const s = await db.findOne('session', x => x.token === token);
	if (!s) return null;
	if (s.expire < Date.now()) {
		await db.remove('session', s._id);
		return null;
	}
	if (type && s.type !== type) return null;
	return { type: s.type, id: s.id };
}

async function revoke(token) {
	const s = await db.findOne('session', x => x.token === token);
	if (s) await db.remove('session', s._id);
}

module.exports = { issue, verify, revoke, md5 };
