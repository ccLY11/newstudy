/**
 * API 路由：POST /api/<route>
 * 响应统一 { ok: 1, data } 或 { ok: 0, msg }
 * 鉴权：请求头 token（user- / admin-）
 */
const db = require('./db');
const auth = require('./auth');
const ai = require('./ai');

const NEWS_CATE = { 1: '公告通知', 2: '丝路小程序介绍', 3: '文化教育', 4: '安全教育' };
const ENROLL_CATE = { 1: '普通话教学', 2: '实战检验', 3: 'AI助学', 4: '我要报名' };
const USER_FIELDS_DEF = [
	{ mark: 'sex', title: '性别', type: 'select', selectOptions: ['男', '女'], must: true },
	{ mark: 'birth', title: '生日', type: 'date', must: true },
	{ mark: 'address', title: '住址', type: 'text', must: false }
];
const JOIN_FIELDS_DEF = [
	{ mark: 'name', type: 'text', title: '姓名', must: true, max: 30, edit: false },
	{ mark: 'sex', title: '性别', type: 'select', selectOptions: ['男', '女'], must: true, edit: false },
	{ mark: 'birth', type: 'date', title: '出生日期', must: true, edit: true },
	{ mark: 'phone', type: 'mobile', title: '电话号码', must: true, edit: true },
	{ mark: 'address', type: 'textarea', title: '家庭住址', must: true }
];

const now = () => Math.floor(Date.now() / 1000);

/* ==================== 工具 ==================== */

function fmtTime(ts) {
	if (!ts) return '';
	const d = new Date(ts * 1000);
	const p = n => (n < 10 ? '0' + n : '' + n);
	return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function fmtDate(ts) {
	return fmtTime(ts).split(' ')[0];
}

async function writeLog(adminName, content, type) {
	await db.insert('log', {
		_id: db.nextId('log_'), LOG_ADMIN_NAME: adminName, LOG_CONTENT: content,
		LOG_TYPE: type || 'content', LOG_ADD_TIME: now()
	});
}

function paginate(arr, page, size) {
	page = Math.max(1, parseInt(page) || 1);
	size = Math.min(50, Math.max(1, parseInt(size) || 10));
	const total = arr.length;
	const start = (page - 1) * size;
	return { list: arr.slice(start, start + size), total, page, size };
}

function newsBrief(n) {
	return {
		_id: n._id, NEWS_TITLE: n.NEWS_TITLE, NEWS_DESC: n.NEWS_DESC, NEWS_CATE_ID: n.NEWS_CATE_ID,
		NEWS_CATE_NAME: n.NEWS_CATE_NAME, NEWS_TAB: n.NEWS_TAB || '', NEWS_ORDER: n.NEWS_ORDER,
		NEWS_VOUCH: n.NEWS_VOUCH, NEWS_PIC: n.NEWS_PIC, NEWS_VIEW_CNT: n.NEWS_VIEW_CNT,
		NEWS_STATUS: n.NEWS_STATUS, time: fmtDate(n.NEWS_ADD_TIME), NEWS_ADD_TIME: n.NEWS_ADD_TIME
	};
}

function enrollStatus(e) {
	if (e.ENROLL_STATUS === 0) return '已停止';
	const t = now();
	if (e.ENROLL_START && t < e.ENROLL_START) return '未开始';
	if (e.ENROLL_END && t > e.ENROLL_END) return '已结束';
	return '进行中';
}

function joinStatusDesc(s) {
	return s === 0 ? '待审核' : (s === 1 ? '报名成功' : (s === 99 ? '审核未通过' : '已取消'));
}

function userBrief(u) {
	return {
		_id: u._id, USER_NAME: u.USER_NAME, USER_MOBILE: u.USER_MOBILE, USER_STATUS: u.USER_STATUS,
		USER_FORMS: u.USER_FORMS, USER_LOGIN_CNT: u.USER_LOGIN_CNT,
		USER_LOGIN_TIME: fmtTime(u.USER_LOGIN_TIME), USER_ADD_TIME: fmtDate(u.USER_ADD_TIME)
	};
}

function publicUser(u) {
	return {
		_id: u._id, USER_NAME: u.USER_NAME, USER_MOBILE: u.USER_MOBILE,
		USER_STATUS: u.USER_STATUS, USER_FORMS: u.USER_FORMS, USER_OBJ: u.USER_OBJ || {}
	};
}

function formToObj(forms) {
	const obj = {};
	(forms || []).forEach(f => { obj[f.mark] = f.val; });
	return obj;
}

function checkMustForms(defs, forms) {
	const map = formToObj(forms);
	for (const d of defs) {
		if (d.must !== false && (map[d.mark] === undefined || map[d.mark] === '')) {
			return '请填写' + (d.title || d.mark);
		}
		if (d.type === 'mobile' && map[d.mark] && !/^1\d{10}$/.test(map[d.mark])) {
			return '请填写正确的手机号';
		}
	}
	return null;
}

/* ==================== 路由表 ==================== */

const routes = {};

/* ---------- 用户端 ---------- */

// 注册（姓名+手机号；USER_REG_CHECK=false 直接通过）
routes['user/register'] = async (body) => {
	const name = (body.name || '').trim();
	const mobile = (body.mobile || '').trim();
	if (!name) return { msg: '请填写姓名' };
	if (!/^1\d{10}$/.test(mobile)) return { msg: '请填写正确的手机号' };
	const forms = body.forms || [];
	const err = checkMustForms(USER_FIELDS_DEF, forms);
	if (err) return { msg: err };

	if (await db.findOne('user', u => u.USER_MOBILE === mobile)) return { msg: '该手机号已注册，请直接登录' };

	const user = {
		_id: db.nextId('user_'), USER_NAME: name, USER_MOBILE: mobile,
		USER_STATUS: 1, USER_CHECK_REASON: '', USER_FORMS: formToObj(forms),
		USER_LOGIN_CNT: 1, USER_LOGIN_TIME: now(), USER_ADD_TIME: now(), USER_OBJ: { desc: '' }
	};
	await db.insert('user', user);
	return { data: { token: await auth.issue('user', user._id), user: publicUser(user) } };
};

// 登录（手机号）
routes['user/login'] = async (body) => {
	const mobile = (body.mobile || '').trim();
	const user = await db.findOne('user', u => u.USER_MOBILE === mobile);
	if (!user) return { msg: '该手机号尚未注册' };
	if (user.USER_STATUS === 9) return { msg: '账号已被禁用，请联系管理员' };
	user.USER_LOGIN_CNT = (user.USER_LOGIN_CNT || 0) + 1;
	user.USER_LOGIN_TIME = now();
	await db.update('user', user);
	return { data: { token: await auth.issue('user', user._id), user: publicUser(user) } };
};

// 我的详情
routes['user/detail'] = async (body, sess) => {
	const user = await db.findOne('user', u => u._id === sess.id);
	if (!user) return { code: 401, msg: '请先登录' };
	return { data: { user: publicUser(user) } };
};

// 修改资料
routes['user/edit'] = async (body, sess) => {
	const user = await db.findOne('user', u => u._id === sess.id);
	if (!user) return { code: 401, msg: '请先登录' };
	const forms = body.forms || [];
	const err = checkMustForms(USER_FIELDS_DEF, forms);
	if (err) return { msg: err };
	if (body.name) user.USER_NAME = body.name.trim();
	user.USER_FORMS = formToObj(forms);
	await db.update('user', user);
	return { data: { user: publicUser(user) } };
};

// 首页列表（推荐 + 最新）
routes['home/list'] = async () => {
	const arr = (await db.list('news'))
		.filter(n => n.NEWS_STATUS === 1)
		.sort((a, b) => (b.NEWS_VOUCH - a.NEWS_VOUCH) || (b.NEWS_ORDER - a.NEWS_ORDER) || (b.NEWS_ADD_TIME - a.NEWS_ADD_TIME))
		.slice(0, 10)
		.map(newsBrief);
	return { data: arr };
};

// 资讯列表（cateId 1-4 / search / 分页）
routes['news/list'] = async (body) => {
	let arr = (await db.list('news')).filter(n => n.NEWS_STATUS === 1);
	if (body.cateId) arr = arr.filter(n => n.NEWS_CATE_ID === body.cateId);
	if (body.tab) arr = arr.filter(n => (n.NEWS_TAB || '') === body.tab);
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(n => (n.NEWS_TITLE + (n.NEWS_DESC || '')).toLowerCase().includes(kw));
	}
	arr.sort((a, b) => (b.NEWS_ORDER - a.NEWS_ORDER) || (b.NEWS_ADD_TIME - a.NEWS_ADD_TIME));
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(newsBrief);
	return { data: ret };
};

// 资讯详情（浏览量+1）
routes['news/view'] = async (body) => {
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	n.NEWS_VIEW_CNT = (n.NEWS_VIEW_CNT || 0) + 1;
	await db.update('news', n);
	return {
		data: Object.assign(newsBrief(n), {
			NEWS_CONTENT: n.NEWS_CONTENT, time: fmtTime(n.NEWS_ADD_TIME)
		})
	};
};

// 关于我们等配置
routes['setup/get'] = async (body) => {
	const s = await db.findOne('setup', x => x.key === (body.key || 'SETUP_CONTENT_ABOUT'));
	return { data: { key: body.key, content: s ? s.content : [] } };
};

/* ---------- 收藏 ---------- */

routes['fav/update'] = async (body, sess) => {
	const exist = await db.findOne('fav', f => f.FAV_USER_ID === sess.id && f.FAV_OID === body.oid);
	if (exist) return { data: { fav: true } };
	await db.insert('fav', {
		_id: db.nextId('fav_'), FAV_USER_ID: sess.id, FAV_TITLE: body.title || '',
		FAV_TYPE: body.type || 'news', FAV_OID: body.oid, FAV_PATH: body.path || '',
		FAV_ADD_TIME: now()
	});
	return { data: { fav: true } };
};

routes['fav/del'] = async (body, sess) => {
	const exist = await db.findOne('fav', f => f.FAV_USER_ID === sess.id && f.FAV_OID === body.oid);
	if (exist) await db.remove('fav', exist._id);
	return { data: { fav: false } };
};

routes['fav/is_fav'] = async (body, sess) => {
	const exist = await db.findOne('fav', f => f.FAV_USER_ID === sess.id && f.FAV_OID === body.oid);
	return { data: { fav: !!exist } };
};

routes['fav/my_list'] = async (body, sess) => {
	const arr = (await db.list('fav'))
		.filter(f => f.FAV_USER_ID === sess.id)
		.sort((a, b) => b.FAV_ADD_TIME - a.FAV_ADD_TIME)
		.map(f => ({ _id: f._id, FAV_OID: f.FAV_OID, FAV_TYPE: f.FAV_TYPE, FAV_TITLE: f.FAV_TITLE, FAV_PATH: f.FAV_PATH, time: fmtDate(f.FAV_ADD_TIME) }));
	return { data: { list: arr } };
};

/* ---------- 报名 ---------- */

function enrollBrief(e) {
	return {
		_id: e._id, ENROLL_TITLE: e.ENROLL_TITLE, ENROLL_CATE_ID: e.ENROLL_CATE_ID,
		ENROLL_CATE_NAME: e.ENROLL_CATE_NAME, ENROLL_MAX_CNT: e.ENROLL_MAX_CNT,
		ENROLL_OBJ: e.ENROLL_OBJ || {}, cover: coverOf(e), desc: descOf(e),
		statusDesc: enrollStatus(e), ENROLL_JOIN_CNT: e.ENROLL_JOIN_CNT || 0,
		ENROLL_VIEW_CNT: e.ENROLL_VIEW_CNT || 0, ENROLL_VOUCH: e.ENROLL_VOUCH
	};
}
function coverOf(e) {
	const f = (e.ENROLL_FORMS || []).find(x => x.mark === 'cover');
	return f && f.val && f.val[0] ? f.val[0] : '';
}
function descOf(e) {
	const f = (e.ENROLL_FORMS || []).find(x => x.mark === 'desc');
	return f ? f.val : '';
}
function enrollDetail(e) {
	return Object.assign(enrollBrief(e), {
		ENROLL_FORMS: e.ENROLL_FORMS, ENROLL_CHECK_SET: e.ENROLL_CHECK_SET,
		ENROLL_CANCEL_SET: e.ENROLL_CANCEL_SET, ENROLL_EDIT_SET: e.ENROLL_EDIT_SET,
		ENROLL_START: fmtDate(e.ENROLL_START), ENROLL_END: fmtDate(e.ENROLL_END)
	});
}

routes['enroll/list'] = async (body) => {
	let arr = (await db.list('enroll')).filter(e => e.ENROLL_STATUS === 1 || body.all);
	if (body.cateId) arr = arr.filter(e => e.ENROLL_CATE_ID === body.cateId);
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(e => (e.ENROLL_TITLE + descOf(e)).toLowerCase().includes(kw));
	}
	arr.sort((a, b) => (b.ENROLL_VOUCH - a.ENROLL_VOUCH) || (b.ENROLL_ADD_TIME - a.ENROLL_ADD_TIME));
	return { data: { list: arr.map(enrollBrief) } };
};

routes['enroll/view'] = async (body) => {
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	e.ENROLL_VIEW_CNT = (e.ENROLL_VIEW_CNT || 0) + 1;
	await db.update('enroll', e);
	return { data: enrollDetail(e) };
};

// 报名前详情（含我的报名状态、校验）
routes['enroll/detail_for_join'] = async (body, sess) => {
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	const data = enrollDetail(e);
	data.JOIN_FIELDS = JOIN_FIELDS_DEF;
	const user = sess ? await db.findOne('user', u => u._id === sess.id) : null;
	data.myJoin = user ? await db.findOne('enroll_join', j =>
		j.ENROLL_JOIN_ENROLL_ID === e._id && j.ENROLL_JOIN_USER_ID === user._id && j.ENROLL_JOIN_STATUS !== 9) || null : null;
	if (data.myJoin) data.myJoin.statusDesc = joinStatusDesc(data.myJoin.ENROLL_JOIN_STATUS);
	if (e.ENROLL_MAX_CNT > 0 && (e.ENROLL_JOIN_CNT || 0) >= e.ENROLL_MAX_CNT) data.full = true;
	return { data };
};

// 提交报名
routes['enroll/join'] = async (body, sess) => {
	const e = await db.findOne('enroll', x => x._id === body.enrollId);
	if (!e) return { msg: '项目不存在' };
	const st = enrollStatus(e);
	if (st !== '进行中') return { msg: '该项目当前为「' + st + '」，不能报名' };
	if (e.ENROLL_MAX_CNT > 0 && (e.ENROLL_JOIN_CNT || 0) >= e.ENROLL_MAX_CNT) return { msg: '报名人数已满' };

	const forms = body.forms || [];
	const err = checkMustForms(JOIN_FIELDS_DEF, forms);
	if (err) return { msg: err };

	// 重复报名校验
	if (await db.findOne('enroll_join', j => j.ENROLL_JOIN_ENROLL_ID === e._id && j.ENROLL_JOIN_USER_ID === sess.id && j.ENROLL_JOIN_STATUS !== 9)) {
		return { msg: '您已报名过该项目，请勿重复报名' };
	}

	const status = e.ENROLL_CHECK_SET === 1 ? 0 : 1; // 需审核 -> 待审
	const user = await db.findOne('user', u => u._id === sess.id);
	await db.insert('enroll_join', {
		_id: db.nextId('join_'), ENROLL_JOIN_ENROLL_ID: e._id, ENROLL_JOIN_USER_ID: sess.id,
		ENROLL_JOIN_ENROLL_TITLE: e.ENROLL_TITLE, ENROLL_JOIN_FORMS: forms,
		ENROLL_JOIN_STATUS: status, ENROLL_JOIN_REASON: '',
		ENROLL_JOIN_LAST_TIME: now(), ENROLL_JOIN_ADD_TIME: now()
	});
	e.ENROLL_JOIN_CNT = (e.ENROLL_JOIN_CNT || 0) + 1;
	await db.update('enroll', e);
	await writeLog('system', '用户「' + (user ? user.USER_NAME : sess.id) + '」报名「' + e.ENROLL_TITLE + '」', 'enroll');
	return { data: { status } };
};

// 修改报名（按 ENROLL_EDIT_SET 控制可改字段 edit:true）
routes['enroll/join_edit'] = async (body, sess) => {
	const j = await db.findOne('enroll_join', x => x._id === body.id && x.ENROLL_JOIN_USER_ID === sess.id);
	if (!j) return { msg: '报名记录不存在' };
	const e = await db.findOne('enroll', x => x._id === j.ENROLL_JOIN_ENROLL_ID);
	if (e && e.ENROLL_EDIT_SET !== 1) return { msg: '该项目不允许修改报名信息' };

	const map = formToObj(body.forms || []);
	j.ENROLL_JOIN_FORMS = j.ENROLL_JOIN_FORMS.map(f => {
		if (map[f.mark] !== undefined) {
			const def = JOIN_FIELDS_DEF.find(d => d.mark === f.mark);
			if (!def || def.edit) f.val = map[f.mark];
		}
		return f;
	});
	j.ENROLL_JOIN_LAST_TIME = now();
	await db.update('enroll_join', j);
	return { data: { ok: 1 } };
};

routes['enroll/my_join_list'] = async (body, sess) => {
	const arr = (await db.list('enroll_join'))
		.filter(j => j.ENROLL_JOIN_USER_ID === sess.id)
		.sort((a, b) => b.ENROLL_JOIN_ADD_TIME - a.ENROLL_JOIN_ADD_TIME)
		.map(j => ({
			_id: j._id, ENROLL_JOIN_ENROLL_ID: j.ENROLL_JOIN_ENROLL_ID, title: j.ENROLL_JOIN_ENROLL_TITLE,
			status: j.ENROLL_JOIN_STATUS, statusDesc: joinStatusDesc(j.ENROLL_JOIN_STATUS),
			name: formToObj(j.ENROLL_JOIN_FORMS).name || '', time: fmtTime(j.ENROLL_JOIN_ADD_TIME)
		}));
	return { data: { list: arr } };
};

routes['enroll/my_join_detail'] = async (body, sess) => {
	const j = await db.findOne('enroll_join', x => x._id === body.id && x.ENROLL_JOIN_USER_ID === sess.id);
	if (!j) return { msg: '报名记录不存在' };
	const e = await db.findOne('enroll', x => x._id === j.ENROLL_JOIN_ENROLL_ID);
	return {
		data: {
			_id: j._id, ENROLL_JOIN_ENROLL_ID: j.ENROLL_JOIN_ENROLL_ID, title: j.ENROLL_JOIN_ENROLL_TITLE,
			status: j.ENROLL_JOIN_STATUS, statusDesc: joinStatusDesc(j.ENROLL_JOIN_STATUS),
			reason: j.ENROLL_JOIN_REASON || '', forms: j.ENROLL_JOIN_FORMS,
			formsDef: JOIN_FIELDS_DEF, canEdit: e ? e.ENROLL_EDIT_SET === 1 : false,
			canCancel: e ? e.ENROLL_CANCEL_SET === 1 : false,
			time: fmtTime(j.ENROLL_JOIN_ADD_TIME)
		}
	};
};

routes['enroll/my_join_cancel'] = async (body, sess) => {
	const j = await db.findOne('enroll_join', x => x._id === body.id && x.ENROLL_JOIN_USER_ID === sess.id);
	if (!j) return { msg: '报名记录不存在' };
	const e = await db.findOne('enroll', x => x._id === j.ENROLL_JOIN_ENROLL_ID);
	if (e && e.ENROLL_CANCEL_SET !== 1) return { msg: '该项目不允许取消报名' };
	j.ENROLL_JOIN_STATUS = 9;
	j.ENROLL_JOIN_LAST_TIME = now();
	await db.update('enroll_join', j);
	if (e) {
		e.ENROLL_JOIN_CNT = Math.max(0, (e.ENROLL_JOIN_CNT || 0) - 1);
		await db.update('enroll', e);
	}
	return { data: { ok: 1 } };
};

/* ---------- AI ---------- */

routes['ai/chat'] = async (body) => {
	try {
		const r = await ai.aiChat(body);
		return { data: r };
	} catch (e) {
		return { msg: e.message };
	}
};

/* ---------- 管理端 ---------- */

function requireAdmin(sess) {
	return sess && sess.type === 'admin';
}

routes['admin/login'] = async (body) => {
	const name = (body.name || '').trim();
	const pwd = auth.md5(body.password || '');
	const admin = await db.findOne('admin', a => a.ADMIN_NAME === name && a.ADMIN_PASSWORD === pwd);
	if (!admin) return { msg: '账号或密码错误' };
	if (admin.ADMIN_STATUS === 0) return { msg: '该管理员已被禁用' };
	admin.ADMIN_LOGIN_CNT = (admin.ADMIN_LOGIN_CNT || 0) + 1;
	admin.ADMIN_LOGIN_TIME = now();
	await db.update('admin', admin);
	await writeLog(admin.ADMIN_NAME, '登录系统', 'login');
	return {
		data: {
			token: await auth.issue('admin', admin._id),
			admin: { _id: admin._id, ADMIN_NAME: admin.ADMIN_NAME, ADMIN_TYPE: admin.ADMIN_TYPE, ADMIN_DESC: admin.ADMIN_DESC }
		}
	};
};

routes['admin/home'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录管理后台' };
	const [users, news, enrolls, joins, favs] = await Promise.all([
		db.list('user'), db.list('news'), db.list('enroll'),
		db.list('enroll_join'), db.list('fav')
	]);
	return {
		data: {
			userCnt: users.length,
			newsCnt: news.length,
			enrollCnt: enrolls.length,
			joinCnt: joins.filter(j => j.ENROLL_JOIN_STATUS !== 9).length,
			favCnt: favs.length,
			viewCnt: news.reduce((s, n) => s + (n.NEWS_VIEW_CNT || 0), 0)
		}
	};
};

routes['admin/clear_vouch'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const list = await db.list('news');
	for (const n of list) { n.NEWS_VIEW_CNT = 0; await db.update('news', n); }
	await writeLog('admin', '清空资讯浏览量');
	return { data: { ok: 1 } };
};

/* --- 管理端：资讯 --- */

routes['admin/news_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	let arr = [...await db.list('news')];
	if (body.cateId) arr = arr.filter(n => n.NEWS_CATE_ID === body.cateId);
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(n => n.NEWS_TITLE.toLowerCase().includes(kw));
	}
	arr.sort((a, b) => (b.NEWS_ORDER - a.NEWS_ORDER) || (b.NEWS_ADD_TIME - a.NEWS_ADD_TIME));
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(newsBrief);
	return { data: ret };
};

function newsBodyToDoc(body, doc) {
	doc.NEWS_TITLE = (body.title || '').trim();
	doc.NEWS_CATE_ID = body.cateId || 1;
	doc.NEWS_CATE_NAME = NEWS_CATE[doc.NEWS_CATE_ID];
	doc.NEWS_TAB = body.tab || '';
	doc.NEWS_ORDER = parseInt(body.order) || 0;
	doc.NEWS_VOUCH = body.vouch ? 1 : 0;
	doc.NEWS_STATUS = body.status === undefined ? 1 : (body.status ? 1 : 0);
	if (body.desc !== undefined) doc.NEWS_DESC = body.desc;
	if (body.pic) doc.NEWS_PIC = body.pic;
	if (body.content) doc.NEWS_CONTENT = body.content;
	return doc;
}

routes['admin/news_insert'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	if (!body.title || !String(body.title).trim()) return { msg: '请填写标题' };
	const doc = newsBodyToDoc(body, {
		_id: db.nextId('news_'), NEWS_QR: '', NEWS_VIEW_CNT: 0, NEWS_FORMS: [], NEWS_OBJ: {}, NEWS_ADD_TIME: now()
	});
	await db.insert('news', doc);
	await writeLog('admin', '新增资讯「' + doc.NEWS_TITLE + '」');
	return { data: { _id: doc._id } };
};

routes['admin/news_detail'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	return { data: Object.assign({}, n, { time: fmtTime(n.NEWS_ADD_TIME) }) };
};

routes['admin/news_edit'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	newsBodyToDoc(body, n);
	await db.update('news', n);
	await writeLog('admin', '修改资讯「' + n.NEWS_TITLE + '」');
	return { data: { ok: 1 } };
};

routes['admin/news_del'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	await db.remove('news', body.id);
	await writeLog('admin', '删除资讯');
	return { data: { ok: 1 } };
};

routes['admin/news_status'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	n.NEWS_STATUS = body.status ? 1 : 0;
	await db.update('news', n);
	return { data: { ok: 1 } };
};

routes['admin/news_vouch'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	n.NEWS_VOUCH = body.vouch ? 1 : 0;
	await db.update('news', n);
	return { data: { ok: 1 } };
};

routes['admin/news_sort'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const n = await db.findOne('news', x => x._id === body.id);
	if (!n) return { msg: '资讯不存在' };
	n.NEWS_ORDER = parseInt(body.order) || 0;
	await db.update('news', n);
	return { data: { ok: 1 } };
};

/* --- 管理端：报名项目 --- */

routes['admin/enroll_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	let arr = [...await db.list('enroll')];
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(e => e.ENROLL_TITLE.toLowerCase().includes(kw));
	}
	arr.sort((a, b) => b.ENROLL_ADD_TIME - a.ENROLL_ADD_TIME);
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(enrollBrief);
	return { data: ret };
};

function enrollBodyToDoc(body, doc) {
	doc.ENROLL_TITLE = (body.title || '').trim();
	doc.ENROLL_CATE_ID = body.cateId || 1;
	doc.ENROLL_CATE_NAME = ENROLL_CATE[doc.ENROLL_CATE_ID];
	doc.ENROLL_STATUS = body.status === undefined ? 1 : (body.status ? 1 : 0);
	doc.ENROLL_MAX_CNT = parseInt(body.maxCnt) || 0;
	doc.ENROLL_CHECK_SET = body.checkSet ? 1 : 0;
	doc.ENROLL_CANCEL_SET = body.cancelSet === undefined ? 1 : (body.cancelSet ? 1 : 0);
	doc.ENROLL_EDIT_SET = body.editSet === undefined ? 1 : (body.editSet ? 1 : 0);
	doc.ENROLL_VOUCH = body.vouch ? 1 : 0;
	doc.ENROLL_ORDER = parseInt(body.order) || 0;
	let forms = doc.ENROLL_FORMS || [];
	const setF = (mark, title, type, val) => {
		let f = forms.find(x => x.mark === mark);
		if (f) f.val = val;
		else forms.push({ mark, title, type, val });
	};
	if (body.cover) setF('cover', '封面图片', 'image', body.cover);
	if (body.desc !== undefined) setF('desc', '简介', 'textarea', body.desc);
	if (body.intro) setF('intro', '详细介绍', 'content', body.intro);
	doc.ENROLL_FORMS = forms;
	return doc;
}

routes['admin/enroll_insert'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	if (!body.title || !String(body.title).trim()) return { msg: '请填写标题' };
	const t = now();
	const doc = enrollBodyToDoc(body, {
		_id: db.nextId('enroll_'), ENROLL_START: body.start || t - 86400, ENROLL_END: body.end || t + 30 * 86400,
		ENROLL_OBJ: {}, ENROLL_QR: '', ENROLL_VIEW_CNT: 0, ENROLL_JOIN_CNT: 0, ENROLL_ADD_TIME: t
	});
	await db.insert('enroll', doc);
	await writeLog('admin', '新增报名项目「' + doc.ENROLL_TITLE + '」');
	return { data: { _id: doc._id } };
};

routes['admin/enroll_detail'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	return { data: Object.assign(enrollDetail(e), { ENROLL_START_RAW: e.ENROLL_START, ENROLL_END_RAW: e.ENROLL_END }) };
};

routes['admin/enroll_edit'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	enrollBodyToDoc(body, e);
	if (body.start) e.ENROLL_START = body.start;
	if (body.end) e.ENROLL_END = body.end;
	await db.update('enroll', e);
	await writeLog('admin', '修改报名项目「' + e.ENROLL_TITLE + '」');
	return { data: { ok: 1 } };
};

routes['admin/enroll_del'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	await db.remove('enroll', body.id);
	await writeLog('admin', '删除报名项目');
	return { data: { ok: 1 } };
};

routes['admin/enroll_status'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	e.ENROLL_STATUS = body.status ? 1 : 0;
	await db.update('enroll', e);
	return { data: { ok: 1 } };
};

routes['admin/enroll_vouch'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	e.ENROLL_VOUCH = body.vouch ? 1 : 0;
	await db.update('enroll', e);
	return { data: { ok: 1 } };
};

routes['admin/enroll_sort'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const e = await db.findOne('enroll', x => x._id === body.id);
	if (!e) return { msg: '项目不存在' };
	e.ENROLL_ORDER = parseInt(body.order) || 0;
	await db.update('enroll', e);
	return { data: { ok: 1 } };
};

/* --- 管理端：报名名单 --- */

routes['admin/enroll_join_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	let arr = await db.list('enroll_join');
	if (body.enrollId) arr = arr.filter(j => j.ENROLL_JOIN_ENROLL_ID === body.enrollId);
	if (body.status !== undefined && body.status !== '') arr = arr.filter(j => j.ENROLL_JOIN_STATUS === body.status);
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(j => {
			const o = formToObj(j.ENROLL_JOIN_FORMS);
			return ((o.name || '') + (o.phone || '')).toLowerCase().includes(kw);
		});
	}
	arr.sort((a, b) => b.ENROLL_JOIN_ADD_TIME - a.ENROLL_JOIN_ADD_TIME);
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(j => ({
		_id: j._id, ENROLL_JOIN_ENROLL_ID: j.ENROLL_JOIN_ENROLL_ID, title: j.ENROLL_JOIN_ENROLL_TITLE,
		status: j.ENROLL_JOIN_STATUS, statusDesc: joinStatusDesc(j.ENROLL_JOIN_STATUS),
		forms: j.ENROLL_JOIN_FORMS, formsObj: formToObj(j.ENROLL_JOIN_FORMS),
		time: fmtTime(j.ENROLL_JOIN_ADD_TIME)
	}));
	return { data: ret };
};

routes['admin/enroll_join_status'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const j = await db.findOne('enroll_join', x => x._id === body.id);
	if (!j) return { msg: '记录不存在' };
	j.ENROLL_JOIN_STATUS = body.status;
	j.ENROLL_JOIN_REASON = body.reason || '';
	j.ENROLL_JOIN_LAST_TIME = now();
	await db.update('enroll_join', j);
	await writeLog('admin', '审核报名「' + j.ENROLL_JOIN_ENROLL_TITLE + '」-> ' + joinStatusDesc(body.status));
	return { data: { ok: 1 } };
};

routes['admin/enroll_join_del'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const j = await db.findOne('enroll_join', x => x._id === body.id);
	if (j) {
		const e = await db.findOne('enroll', x => x._id === j.ENROLL_JOIN_ENROLL_ID);
		if (e) { e.ENROLL_JOIN_CNT = Math.max(0, (e.ENROLL_JOIN_CNT || 0) - 1); await db.update('enroll', e); }
		await db.remove('enroll_join', body.id);
	}
	await writeLog('admin', '删除报名记录');
	return { data: { ok: 1 } };
};

routes['admin/enroll_cancel_join_all'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const all = await db.list('enroll_join');
	const list = all.filter(j => j.ENROLL_JOIN_ENROLL_ID === body.enrollId && j.ENROLL_JOIN_STATUS !== 9);
	for (const j of list) {
		j.ENROLL_JOIN_STATUS = 9;
		j.ENROLL_JOIN_LAST_TIME = now();
		await db.update('enroll_join', j);
	}
	const e = await db.findOne('enroll', x => x._id === body.enrollId);
	if (e) { e.ENROLL_JOIN_CNT = 0; await db.update('enroll', e); }
	await writeLog('admin', '清空报名名单');
	return { data: { ok: 1, cnt: list.length } };
};

// 导出 CSV 文本
routes['admin/enroll_join_export'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const arr = (await db.list('enroll_join')).filter(j => j.ENROLL_JOIN_ENROLL_ID === body.enrollId && j.ENROLL_JOIN_STATUS !== 9);
	const rows = [['姓名', '性别', '出生日期', '电话号码', '家庭住址', '报名状态', '报名时间']];
	for (const j of arr) {
		const o = formToObj(j.ENROLL_JOIN_FORMS);
		rows.push([o.name || '', o.sex || '', o.birth || '', o.phone || '', o.address || '', joinStatusDesc(j.ENROLL_JOIN_STATUS), fmtTime(j.ENROLL_JOIN_ADD_TIME)]);
	}
	return { data: { name: '报名名单.csv', csv: rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n') } };
};

/* --- 管理端：用户 --- */

routes['admin/user_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	let arr = [...await db.list('user')];
	if (body.search) {
		const kw = String(body.search).trim().toLowerCase();
		arr = arr.filter(u => (u.USER_NAME + u.USER_MOBILE).toLowerCase().includes(kw));
	}
	arr.sort((a, b) => b.USER_ADD_TIME - a.USER_ADD_TIME);
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(userBrief);
	return { data: ret };
};

routes['admin/user_detail'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const u = await db.findOne('user', x => x._id === body.id);
	if (!u) return { msg: '用户不存在' };
	const [joins, favs] = await Promise.all([
		db.list('enroll_join'), db.list('fav')
	]);
	return { data: Object.assign(userBrief(u), {
		joinCnt: joins.filter(j => j.ENROLL_JOIN_USER_ID === u._id).length,
		favCnt: favs.filter(f => f.FAV_USER_ID === u._id).length
	}) };
};

routes['admin/user_del'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	await db.remove('user', body.id);
	await writeLog('admin', '删除用户');
	return { data: { ok: 1 } };
};

routes['admin/user_status'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const u = await db.findOne('user', x => x._id === body.id);
	if (!u) return { msg: '用户不存在' };
	u.USER_STATUS = body.status;
	await db.update('user', u);
	return { data: { ok: 1 } };
};

routes['admin/user_export'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const rows = [['姓名', '手机号', '性别', '生日', '住址', '状态', '登录次数', '注册时间']];
	const ST = { 0: '待审核', 1: '正常', 8: '未通过', 9: '已禁用' };
	for (const u of await db.list('user')) {
		const f = u.USER_FORMS || {};
		rows.push([u.USER_NAME, u.USER_MOBILE, f.sex || '', f.birth || '', f.address || '', ST[u.USER_STATUS] || '', u.USER_LOGIN_CNT || 0, fmtDate(u.USER_ADD_TIME)]);
	}
	return { data: { name: '用户名单.csv', csv: rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n') } };
};

/* --- 管理端：管理员 --- */

function adminBrief(a) {
	return {
		_id: a._id, ADMIN_NAME: a.ADMIN_NAME, ADMIN_PHONE: a.ADMIN_PHONE, ADMIN_DESC: a.ADMIN_DESC,
		ADMIN_TYPE: a.ADMIN_TYPE, ADMIN_STATUS: a.ADMIN_STATUS, ADMIN_LOGIN_CNT: a.ADMIN_LOGIN_CNT || 0,
		ADMIN_LOGIN_TIME: fmtTime(a.ADMIN_LOGIN_TIME)
	};
}

routes['admin/mgr_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	return { data: { list: (await db.list('admin')).map(adminBrief) } };
};

routes['admin/mgr_insert'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const name = (body.name || '').trim();
	if (!name) return { msg: '请填写账号' };
	if (!body.password || String(body.password).length < 6) return { msg: '密码至少6位' };
	if (await db.findOne('admin', a => a.ADMIN_NAME === name)) return { msg: '账号已存在' };
	await db.insert('admin', {
		_id: db.nextId('admin_'), ADMIN_NAME: name, ADMIN_PASSWORD: auth.md5(body.password),
		ADMIN_STATUS: 1, ADMIN_TYPE: body.type ? 1 : 0, ADMIN_PHONE: body.phone || '',
		ADMIN_DESC: body.desc || '', ADMIN_LOGIN_CNT: 0, ADMIN_LOGIN_TIME: 0
	});
	await writeLog('admin', '新增管理员「' + name + '」');
	return { data: { ok: 1 } };
};

routes['admin/mgr_detail'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const a = await db.findOne('admin', x => x._id === body.id);
	if (!a) return { msg: '管理员不存在' };
	return { data: adminBrief(a) };
};

routes['admin/mgr_edit'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const a = await db.findOne('admin', x => x._id === body.id);
	if (!a) return { msg: '管理员不存在' };
	a.ADMIN_PHONE = body.phone || '';
	a.ADMIN_DESC = body.desc || '';
	a.ADMIN_TYPE = body.type ? 1 : 0;
	await db.update('admin', a);
	await writeLog('admin', '修改管理员「' + a.ADMIN_NAME + '」');
	return { data: { ok: 1 } };
};

routes['admin/mgr_status'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const a = await db.findOne('admin', x => x._id === body.id);
	if (!a) return { msg: '管理员不存在' };
	if (a.ADMIN_NAME === 'admin') return { msg: '内置超管不可禁用' };
	a.ADMIN_STATUS = body.status ? 1 : 0;
	await db.update('admin', a);
	return { data: { ok: 1 } };
};

routes['admin/mgr_del'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const a = await db.findOne('admin', x => x._id === body.id);
	if (!a) return { msg: '管理员不存在' };
	if (a.ADMIN_NAME === 'admin') return { msg: '内置超管不可删除' };
	await db.remove('admin', body.id);
	await writeLog('admin', '删除管理员「' + a.ADMIN_NAME + '」');
	return { data: { ok: 1 } };
};

routes['admin/mgr_pwd'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const a = await db.findOne('admin', x => x._id === body.id);
	if (!a) return { msg: '管理员不存在' };
	if (!body.password || String(body.password).length < 6) return { msg: '密码至少6位' };
	a.ADMIN_PASSWORD = auth.md5(body.password);
	await db.update('admin', a);
	await writeLog('admin', '修改管理员「' + a.ADMIN_NAME + '」密码');
	return { data: { ok: 1 } };
};

/* --- 管理端：日志 / 配置 --- */

routes['admin/log_list'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	let arr = [...await db.list('log')].sort((a, b) => b.LOG_ADD_TIME - a.LOG_ADD_TIME);
	const ret = paginate(arr, body.page, body.size);
	ret.list = ret.list.map(l => ({ _id: l._id, LOG_ADMIN_NAME: l.LOG_ADMIN_NAME, LOG_CONTENT: l.LOG_CONTENT, LOG_TYPE: l.LOG_TYPE, time: fmtTime(l.LOG_ADD_TIME) }));
	return { data: ret };
};

routes['admin/log_clear'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const logs = await db.list('log');
	for (const l of logs) { await db.remove('log', l._id); }
	return { data: { ok: 1 } };
};

routes['admin/setup_set'] = async (body, sess) => {
	if (!requireAdmin(sess)) return { code: 401, msg: '请先登录' };
	const key = body.key || 'SETUP_CONTENT_ABOUT';
	let s = await db.findOne('setup', x => x.key === key);
	if (!s) {
		await db.insert('setup', { key, content: body.content || [] });
	} else {
		s.content = body.content || [];
		await db.update('setup', s);
	}
	await writeLog('admin', '修改系统配置「' + key + '」');
	return { data: { ok: 1 } };
};

/* ==================== 分发 ==================== */

async function dispatch(pathname, body, token) {
	const route = pathname.replace(/^\/api\//, '');
	const handler = routes[route];
	if (!handler) return { ok: 0, msg: '接口不存在: ' + route };

	let sess = await auth.verify(token);
	if (sess && sess.expire !== undefined && sess.expire < Date.now()) sess = null;

	try {
		const r = await handler(body || {}, sess);
		if (r && r.code === 401) return { ok: 0, code: 401, msg: r.msg };
		if (r && r.msg) return { ok: 0, msg: r.msg };
		return { ok: 1, data: r ? r.data : null };
	} catch (e) {
		console.error('[api]', route, e);
		return { ok: 0, msg: '服务器错误: ' + e.message };
	}
}

module.exports = { dispatch };
