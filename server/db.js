/**
 * JSON 文件数据库（模拟小程序云开发 bx_ 集合）
 * 数据文件位于 server/data/*.json，首次运行由 seed.js 自动生成
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const cache = {}; // name -> array

function ensureDir() {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load(name) {
	if (cache[name]) return cache[name];
	ensureDir();
	const file = path.join(DATA_DIR, name + '.json');
	if (!fs.existsSync(file)) return null; // 交给 seed 初始化
	try {
		cache[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (e) {
		console.error('[db] 解析失败:', name, e.message);
		cache[name] = [];
	}
	return cache[name];
}

function save(name) {
	ensureDir();
	const file = path.join(DATA_DIR, name + '.json');
	fs.writeFileSync(file, JSON.stringify(cache[name] || [], null, 1), 'utf8');
}

function list(name) {
	const arr = load(name);
	if (arr === null) {
		const seed = require('./seed');
		seed.init(name);
		return cache[name] || [];
	}
	return arr;
}

/** 生成简单自增 id（前缀 + 时间戳36进制 + 随机） */
function nextId(prefix) {
	return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

/** 按字段查找 */
function findOne(name, fn) {
	return list(name).find(fn) || null;
}

function insert(name, doc) {
	const arr = list(name);
	arr.unshift(doc);
	save(name);
	return doc;
}

function update(name, doc) {
	const arr = list(name);
	const idx = arr.findIndex(x => x._id === doc._id);
	if (idx >= 0) {
		arr[idx] = doc;
		save(name);
	}
	return doc;
}

function remove(name, id) {
	const arr = list(name);
	const idx = arr.findIndex(x => x._id === id);
	if (idx >= 0) {
		arr.splice(idx, 1);
		save(name);
		return true;
	}
	return false;
}

module.exports = { list, save, nextId, findOne, insert, update, remove, DATA_DIR };
