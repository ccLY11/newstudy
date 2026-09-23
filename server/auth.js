/**
 * 鉴权：简单 token（用户端 / 管理端）
 * token = md5(类型+id+时间戳+随机)，内存 Map + sessions.json 持久化（重启不掉线）
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'data', '_sessions.json');
const EXPIRE = 24 * 3600 * 1000; // 24 小时

let sessions = {}; // token -> { type, id, expire }

function md5(str) {
	return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function loadSessions() {
	try {
		if (fs.existsSync(SESSION_FILE)) sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
	} catch (e) { sessions = {}; }
}

function persist() {
	try {
		const dir = path.dirname(SESSION_FILE);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions), 'utf8');
	} catch (e) { }
}

function issue(type, id) {
	const token = md5(type + id + Date.now() + Math.random());
	sessions[token] = { type, id, expire: Date.now() + EXPIRE };
	persist();
	return token;
}

/** 校验，返回 {type,id} 或 null */
function verify(token, type) {
	if (!token) return null;
	const s = sessions[token];
	if (!s) return null;
	if (s.expire < Date.now()) {
		delete sessions[token];
		persist();
		return null;
	}
	if (type && s.type !== type) return null;
	return { type: s.type, id: s.id };
}

function revoke(token) {
	if (sessions[token]) {
		delete sessions[token];
		persist();
	}
}

loadSessions();

module.exports = { issue, verify, revoke, md5 };
