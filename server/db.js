/**
 * 数据访问层：双模式
 *  - 未设置 MONGODB_URI 时使用本地 JSON 文件（server/data/*.json），适合本地开发
 *  - 设置 MONGODB_URI 时使用 MongoDB，适合云端部署（数据持久化）
 *
 * 所有方法统一返回 Promise，调用方需 await
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'redculture';

const cache = {}; // JSON 模式下的内存缓存 name -> array
let mongoDb = null;
let mongoClient = null;

/* ---------- 初始化 ---------- */

async function init() {
	if (global._mongoDb) { mongoDb = global._mongoDb; return; }
	if (!MONGODB_URI) {
		console.log('[db] 使用本地 JSON 文件存储');
		return;
	}
	try {
		const { MongoClient } = require('mongodb');
		const client = new MongoClient(MONGODB_URI);
		await client.connect();
		mongoDb = client.db(DB_NAME);
		global._mongoClient = client;
		global._mongoDb = mongoDb;
		console.log('[db] MongoDB 已连接，数据库:', DB_NAME);
	} catch (e) {
		console.error('[db] MongoDB 连接失败，回退到 JSON 文件:', e.message);
		mongoDb = null;
	}
}

function useMongo() {
	return !!(global._mongoDb || mongoDb);
}

/* ---------- 内部工具 ---------- */

function ensureDir() {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(name) {
	if (cache[name]) return cache[name];
	ensureDir();
	const file = path.join(DATA_DIR, name + '.json');
	if (!fs.existsSync(file)) return null;
	try {
		cache[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (e) {
		console.error('[db] 解析失败:', name, e.message);
		cache[name] = [];
	}
	return cache[name];
}

function saveJson(name) {
	ensureDir();
	const file = path.join(DATA_DIR, name + '.json');
	fs.writeFileSync(file, JSON.stringify(cache[name] || [], null, 1), 'utf8');
}

async function coll(name) {
	return mongoDb.collection(name);
}

/* ---------- 对外方法（全部 async） ---------- */

async function list(name) {
	if (useMongo()) {
		const c = await coll(name);
		return await c.find({}).toArray();
	}
	const arr = loadJson(name);
	if (arr === null) {
		// 交给 seed 初始化（同步调用）
		const seed = require('./seed');
		seed.initSync(name);
		return cache[name] || [];
	}
	return arr;
}

async function findOne(name, fn) {
	const arr = await list(name);
	return arr.find(fn) || null;
}

async function insert(name, doc) {
	if (useMongo()) {
		const c = await coll(name);
		await c.insertOne(doc);
		return doc;
	}
	const arr = loadJson(name) || [];
	arr.unshift(doc);
	cache[name] = arr;
	saveJson(name);
	return doc;
}

async function update(name, doc) {
	if (useMongo()) {
		const c = await coll(name);
		await c.replaceOne({ _id: doc._id }, doc);
		return doc;
	}
	const arr = loadJson(name) || [];
	const idx = arr.findIndex(x => x._id === doc._id);
	if (idx >= 0) arr[idx] = doc;
	cache[name] = arr;
	saveJson(name);
	return doc;
}

async function remove(name, id) {
	if (useMongo()) {
		const c = await coll(name);
		await c.deleteOne({ _id: id });
		return true;
	}
	const arr = loadJson(name) || [];
	const idx = arr.findIndex(x => x._id === id);
	if (idx >= 0) {
		arr.splice(idx, 1);
		cache[name] = arr;
		saveJson(name);
		return true;
	}
	return false;
}

/** 保存整个集合（JSON 模式下落盘；MongoDB 模式下为 no-op，因为每次写操作已持久化） */
async function save(name) {
	if (useMongo()) return;
	saveJson(name);
}

/** 生成简单自增 id */
function nextId(prefix) {
	return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

/** 检查集合是否存在（用于 seed 判断是否需要初始化） */
async function exists(name) {
	if (useMongo()) {
		const c = await coll(name);
		const cnt = await c.countDocuments({});
		return cnt > 0;
	}
	return fs.existsSync(path.join(DATA_DIR, name + '.json'));
}

/** 批量写入（seed 初始化用） */
async function insertMany(name, docs) {
	if (useMongo()) {
		const c = await coll(name);
		if (docs.length > 0) await c.insertMany(docs);
		return docs.length;
	}
	cache[name] = docs;
	saveJson(name);
	return docs.length;
}

module.exports = {
	init, useMongo, list, findOne, insert, update, remove, save, nextId,
	exists, insertMany, DATA_DIR
};
