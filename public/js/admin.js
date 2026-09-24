/* ============================================================
 * 红色文化馆 · 管理后台 admin.js（原生 JS 单文件）
 * 约定：POST /api/<route>，请求头 token；响应 {ok:1,data} / {ok:0,msg}
 * ============================================================ */
'use strict';

/* ---------- 常量 ---------- */
const TOKEN_KEY = 'kk_admin_token';
const ADMIN_INFO_KEY = 'kk_admin_info';
const NEWS_CATE = { 1: '公告通知', 2: '丝路小程序介绍', 3: '文化教育', 4: '安全教育' };
const NEWS_TABS = ['活动通知', '培训通知', '重要通知', '政策通知'];
const ENROLL_CATE = { 1: '普通话教学', 2: '实战检验', 3: 'AI助学', 4: '我要报名' };
const NEWS_PICS = [
	'/assets/img/news/cate-notice.jpg',
	'/assets/img/news/cate-hall.jpg',
	'/assets/img/news/cate-heritage.jpg',
	'/assets/img/news/cate-training.jpg'
];
const JOIN_STATUS = { 0: ['待审核', 'warn'], 1: ['报名成功', 'ok'], 99: ['审核未通过', 'bad'], 9: ['已取消', 'mute'] };
const USER_STATUS = { 0: ['待审核', 'warn'], 1: ['正常', 'ok'], 8: ['未通过', 'bad'], 9: ['已禁用', 'mute'] };
const LOG_TYPE = { login: '登录', enroll: '报名', content: '内容' };

/* ---------- 小工具 ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
function esc(v) {
	return v === undefined || v === null ? '' : String(v)
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function joinContentText(content) {
	return (content || []).filter(c => c && c.type === 'text').map(c => c.val || '').join('\n');
}
function lineToContent(text) {
	return String(text || '').split('\n').map(s => ({ type: 'text', val: s }));
}

let toastTimer = null;
function toast(msg) {
	const t = $('#toastBox');
	t.textContent = msg;
	t.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* 异步操作统一兜底：401 已由 api() 处理，其余 toast 提示 */
async function guard(fn) {
	try { return await fn(); }
	catch (e) { if (e.code !== 401) toast(e.message || '操作失败'); }
}

/* ============================================================
 * API 封装
 * ============================================================ */
async function api(route, data = {}) {
	let res;
	try {
		res = await fetch('/api/' + route, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'token': localStorage.getItem(TOKEN_KEY) || '' },
			body: JSON.stringify(data)
		});
	} catch (e) { throw new Error('网络异常，请稍后重试'); }
	let r;
	try { r = await res.json(); } catch (e) { throw new Error('响应解析失败'); }
	if (!r.ok) {
		if (r.code === 401) { clearAuth(); showLogin(); }
		const err = new Error(r.msg || '请求失败');
		err.code = r.code;
		throw err;
	}
	return r.data;
}

function clearAuth() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(ADMIN_INFO_KEY);
}

function downloadCSV(name, csv) {
	const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name || 'export.csv';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
 * 弹窗 / 确认 / 输入
 * ============================================================ */
function closeModal() { $('#modalMask').hidden = true; $('#modalBox').innerHTML = ''; }

/**
 * openModal(标题, 内容HTML, 按钮)
 * 按钮: { text, cls, onClick(close) } —— onClick 返回 false 则不自动关闭
 */
function openModal(title, bodyHTML, buttons, wide) {
	const mask = $('#modalMask'), box = $('#modalBox');
	box.className = 'modal-box' + (wide ? ' wide' : '');
	box.innerHTML =
		'<div class="modal-head"><span>' + esc(title) + '</span><a class="modal-x">&times;</a></div>' +
		'<div class="modal-body">' + bodyHTML + '</div>' +
		'<div class="modal-foot"></div>';
	const foot = $('.modal-foot', box);
	(buttons || [{ text: '取消' }]).forEach(b => {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'btn ' + (b.cls || '');
		btn.textContent = b.text;
		btn.onclick = async () => {
			if (b.onClick) {
				let r;
				try { r = await b.onClick(closeModal); }
				catch (e) {
					// 出错时保留弹窗内容，便于修改后重试；401 已由 api() 处理
					if (e.code !== 401) toast(e.message || '操作失败');
					return;
				}
				if (r === false) return;
				closeModal();
			} else closeModal();
		};
		foot.appendChild(btn);
	});
	$('.modal-x', box).onclick = closeModal;
	mask.hidden = false;
	mask.onclick = e => { if (e.target === mask) closeModal(); };
	const first = $('.modal-body input, .modal-body textarea, .modal-body select', box);
	if (first) setTimeout(() => first.focus(), 50);
}

function confirmBox(msg, onOk, danger) {
	openModal('提示', '<div class="confirm-text">' + esc(msg) + '</div>', [
		{ text: '取消' },
		{ text: '确定', cls: danger ? 'danger' : 'primary', onClick: async () => { await onOk(); } }
	]);
}

function promptBox(title, opts, onOk) {
	opts = opts || {};
	openModal(title,
		'<div class="form-item"><label>' + esc(opts.label || '请输入') + '</label>' +
		'<input type="' + (opts.type || 'text') + '" id="promptInput" class="ipt" value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '"></div>',
		[
			{ text: '取消' },
			{
				text: '确定', cls: 'primary', onClick: async () => {
					const v = $('#promptInput').value.trim();
					if (!v && !opts.allowEmpty) { toast('请输入内容'); return false; }
					const r = await onOk(v);
					return r === false ? false : undefined;
				}
			}
		]);
}

/* ============================================================
 * 通用片段
 * ============================================================ */
function switchHTML(id, checked, label) {
	return '<label class="switch-wrap"><span class="switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><i></i></span><span>' + esc(label) + '</span></label>';
}

function picPickerHTML(name, current) {
	const opts = [''].concat(NEWS_PICS);
	return '<div class="pic-picker">' + opts.map(p =>
		'<label class="pic-opt' + (current === p ? ' on' : '') + '">' +
		'<input type="radio" name="' + name + '" value="' + p + '"' + (current === p ? ' checked' : '') + '>' +
		(p ? '<img src="' + esc(p) + '" alt="">' : '<span class="pic-none">无封面</span>') +
		'</label>').join('') + '</div>';
}
function bindPicPicker(root) {
	$$('.pic-picker', root).forEach(pk => pk.addEventListener('change', () => {
		$$('.pic-opt', pk).forEach(l => l.classList.toggle('on', $('input', l).checked));
	}));
}
function getPicVal(name) {
	const c = $('input[name="' + name + '"]:checked');
	return c ? c.value : '';
}
function setPicPicker(name, val) {
	const any = $('input[name="' + name + '"]');
	if (!any) return;
	const picker = any.closest('.pic-picker');
	// 当前封面若不在预设图中（如历史数据），动态补充一个选项，避免保存时被误清
	if (val && !$('input[name="' + name + '"][value="' + val + '"]', picker)) {
		const label = document.createElement('label');
		label.className = 'pic-opt';
		label.innerHTML = '<input type="radio" name="' + name + '" value="' + esc(val) + '"><img src="' + esc(val) + '" alt="">';
		picker.appendChild(label);
	}
	const c = $('input[name="' + name + '"][value="' + val + '"]', picker);
	if (c) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }
}

function renderPager(el, d, goPage) {
	if (!d || !d.total) { el.innerHTML = ''; return; }
	const totalPage = Math.max(1, Math.ceil(d.total / d.size));
	el.innerHTML =
		'<span class="pg-info">共 ' + d.total + ' 条 · 第 ' + d.page + '/' + totalPage + ' 页</span>' +
		'<button class="pg-btn' + (d.page <= 1 ? ' disabled' : '') + '" data-p="prev">上一页</button>' +
		'<button class="pg-btn' + (d.page >= totalPage ? ' disabled' : '') + '" data-p="next">下一页</button>';
	const [prev, next] = $$('.pg-btn', el);
	prev.onclick = () => { if (d.page > 1) goPage(d.page - 1); };
	next.onclick = () => { if (d.page < totalPage) goPage(d.page + 1); };
}

function bindEnter(input, fn) {
	input.addEventListener('keyup', e => { if (e.key === 'Enter') fn(); });
}

function infoRows(rows) {
	return '<div class="info-rows">' + rows.map(r =>
		'<div class="info-row"><label>' + esc(r[0]) + '</label><div class="v">' +
		(r[1] === '' || r[1] === undefined || r[1] === null ? '—' : esc(r[1])) + '</div></div>').join('') + '</div>';
}

/* ============================================================
 * 路由 / 框架
 * ============================================================ */
const NAVS = [
	['home', '首页概览'],
	['news', '资讯管理'],
	['enroll', '报名项目'],
	['join', '报名名单'],
	['user', '用户管理'],
	['mgr', '管理员'],
	['log', '系统日志'],
	['setup', '系统设置']
];
const PAGES = {};
const state = { page: 'home', admin: null };

function nav(key) {
	state.page = key;
	$$('.menu-item').forEach(a => a.classList.toggle('active', a.dataset.page === key));
	renderPage();
}

async function renderPage() {
	const page = PAGES[state.page];
	$('#pageTitle').textContent = page.title;
	const el = $('#pageBody');
	el.innerHTML = '<div class="loading">加载中…</div>';
	try { await page.render(el); }
	catch (e) {
		if (e.code !== 401) el.innerHTML = '<div class="empty">' + esc(e.message || '加载失败') + '</div>';
	}
}

function showLogin() {
	$('#loginView').hidden = false;
	$('#appView').hidden = true;
	$('#modalMask').hidden = true;
	$('#loginName').value = '';
	$('#loginPwd').value = '';
	setTimeout(() => $('#loginName').focus(), 50);
}

function enterApp() {
	$('#loginView').hidden = true;
	$('#appView').hidden = false;
	state.admin = JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || '{}');
	$('#adminName').textContent = state.admin.ADMIN_NAME || '管理员';
	if (!$('#menu').children.length) {
		$('#menu').innerHTML = NAVS.map(n =>
			'<a class="menu-item" data-page="' + n[0] + '">' + n[1] + '</a>').join('');
		$$('.menu-item').forEach(a => a.onclick = () => nav(a.dataset.page));
	}
	nav('home');
}

async function doLogin() {
	const name = $('#loginName').value.trim();
	const password = $('#loginPwd').value;
	if (!name) return toast('请输入账号');
	if (!password) return toast('请输入密码');
	const btn = $('#btnLogin');
	btn.disabled = true;
	btn.textContent = '登录中…';
	try {
		const r = await api('admin/login', { name, password });
		localStorage.setItem(TOKEN_KEY, r.token);
		localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(r.admin || {}));
		toast('欢迎回来，' + (r.admin && r.admin.ADMIN_NAME || '管理员'));
		enterApp();
	} catch (e) {
		toast(e.message || '登录失败');
	}
	btn.disabled = false;
	btn.textContent = '登 录';
}

/* ============================================================
 * 1. 首页概览
 * ============================================================ */
PAGES.home = {
	title: '首页概览',
	async render(el) {
		const d = await api('admin/home');
		const items = [
			['用户数', d.userCnt], ['资讯数', d.newsCnt], ['报名项目数', d.enrollCnt],
			['报名记录数', d.joinCnt], ['收藏数', d.favCnt], ['资讯总浏览量', d.viewCnt]
		];
		el.innerHTML =
			'<div class="stat-grid">' + items.map(x =>
				'<div class="stat-card"><div class="stat-num">' + toInt(x[1]) + '</div>' +
				'<div class="stat-label">' + x[0] + '</div></div>').join('') + '</div>' +
			'<div class="panel"><div class="panel-title">维护操作</div><div class="panel-body">' +
			'<span class="tip">将所有资讯的浏览量清零，操作不可恢复，请谨慎操作。</span>' +
			'<button class="btn danger" id="btnClearVouch">清空资讯浏览量</button>' +
			'</div></div>';
		$('#btnClearVouch', el).onclick = () => confirmBox('确定清空所有资讯的浏览量？', async () => {
			await api('admin/clear_vouch');
			toast('已清空资讯浏览量');
			renderPage();
		}, true);
	}
};

/* ============================================================
 * 2. 资讯管理
 * ============================================================ */
const newsQuery = { page: 1, search: '', cateId: '' };

PAGES.news = {
	title: '资讯管理',
	async render(el) {
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<input type="text" id="newsKw" class="ipt" style="width:200px" placeholder="搜索标题" value="' + esc(newsQuery.search) + '">' +
			'<select id="newsCate" class="ipt"><option value="">全部分类</option>' +
			Object.keys(NEWS_CATE).map(k => '<option value="' + k + '"' + (String(newsQuery.cateId) === k ? ' selected' : '') + '>' + NEWS_CATE[k] + '</option>').join('') +
			'</select>' +
			'<button class="btn primary" id="newsSearch">查询</button>' +
			'<span class="flex1"></span>' +
			'<button class="btn primary" id="newsAdd">＋ 新增资讯</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>标题</th><th>分类</th><th>推荐</th><th>状态</th><th>排序值</th><th>浏览量</th><th>时间</th><th>操作</th>' +
			'</tr></thead><tbody id="newsTbody"></tbody></table></div>' +
			'<div class="pager" id="newsPager"></div></div>';
		$('#newsSearch', el).onclick = () => {
			newsQuery.search = $('#newsKw', el).value.trim();
			newsQuery.cateId = $('#newsCate', el).value;
			newsQuery.page = 1;
			loadNews();
		};
		$('#newsCate', el).onchange = () => $('#newsSearch', el).click();
		bindEnter($('#newsKw', el), () => $('#newsSearch', el).click());
		$('#newsAdd', el).onclick = () => openNewsForm('');
		await loadNews();
	}
};

async function loadNews() {
	const body = { page: newsQuery.page, size: 10 };
	if (newsQuery.search) body.search = newsQuery.search;
	if (newsQuery.cateId) body.cateId = Number(newsQuery.cateId);
	const d = await api('admin/news_list', body);
	const tb = $('#newsTbody');
	if (!d.list.length) {
		tb.innerHTML = '<tr><td colspan="8" class="empty">暂无数据</td></tr>';
		$('#newsPager').innerHTML = '';
		return;
	}
	tb.innerHTML = d.list.map(n => '<tr>' +
		'<td class="td-title ellipsis" title="' + esc(n.NEWS_TITLE) + '">' + esc(n.NEWS_TITLE) + '</td>' +
		'<td>' + esc(n.NEWS_CATE_NAME) + (n.NEWS_TAB ? '<div class="td-sub">' + esc(n.NEWS_TAB) + '</div>' : '') + '</td>' +
		'<td>' + (n.NEWS_VOUCH ? '<span class="tag red">推荐</span>' : '<span class="tag mute">普通</span>') + '</td>' +
		'<td>' + (n.NEWS_STATUS ? '<span class="tag ok">显示</span>' : '<span class="tag mute">隐藏</span>') + '</td>' +
		'<td>' + toInt(n.NEWS_ORDER) + '</td>' +
		'<td>' + toInt(n.NEWS_VIEW_CNT) + '</td>' +
		'<td>' + esc(n.time) + '</td>' +
		'<td class="td-ops">' +
		'<a class="op" data-act="edit">编辑</a>' +
		'<a class="op" data-act="vouch">' + (n.NEWS_VOUCH ? '取消推荐' : '设为推荐') + '</a>' +
		'<a class="op" data-act="status">' + (n.NEWS_STATUS ? '隐藏' : '显示') + '</a>' +
		'<a class="op danger" data-act="del">删除</a></td></tr>').join('');
	$$('#newsTbody tr').forEach((tr, i) => {
		const n = d.list[i];
		$$('.op', tr).forEach(a => a.onclick = () => guard(() => newsOp(a.dataset.act, n)));
	});
	renderPager($('#newsPager'), d, p => { newsQuery.page = p; loadNews(); });
}

async function newsOp(act, n) {
	if (act === 'edit') return openNewsForm(n._id);
	if (act === 'vouch') {
		await api('admin/news_vouch', { id: n._id, vouch: !n.NEWS_VOUCH });
		toast('已更新推荐状态'); loadNews(); return;
	}
	if (act === 'status') {
		await api('admin/news_status', { id: n._id, status: !n.NEWS_STATUS });
		toast('已更新显示状态'); loadNews(); return;
	}
	if (act === 'del') {
		confirmBox('确定删除资讯「' + n.NEWS_TITLE + '」？删除后不可恢复。', async () => {
			await api('admin/news_del', { id: n._id });
			toast('已删除'); loadNews();
		}, true);
	}
}

function openNewsForm(id) {
	const isNew = !id;
	const bodyHTML =
		'<div class="form-item"><label><i class="req">*</i>标题</label>' +
		'<input type="text" id="nf_title" class="ipt" maxlength="60" placeholder="请输入资讯标题"></div>' +
		'<div class="form-row2">' +
		'<div class="form-item"><label>分类</label><select id="nf_cate" class="ipt">' +
		Object.keys(NEWS_CATE).map(k => '<option value="' + k + '">' + NEWS_CATE[k] + '</option>').join('') +
		'</select></div>' +
		'<div class="form-item"><label>通知Tab</label><select id="nf_tab" class="ipt">' +
		'<option value="">无</option>' + NEWS_TABS.map(t => '<option>' + t + '</option>').join('') +
		'</select></div></div>' +
		'<div class="form-item"><label>简介</label>' +
		'<textarea id="nf_desc" class="ipt" rows="2" placeholder="列表页简介（选填）"></textarea></div>' +
		'<div class="form-item"><label>正文</label>' +
		'<textarea id="nf_content" class="ipt" rows="7" placeholder="每行一段文字，保存时按行拆分为正文段落"></textarea></div>' +
		'<div class="form-item"><label>封面</label>' + picPickerHTML('npic', '') + '</div>' +
		'<div class="form-row2">' +
		'<div class="form-item"><label>排序值</label><input type="number" id="nf_order" class="ipt" value="0"></div>' +
		'<div class="form-item"><label>属性</label><div class="switch-line">' +
		switchHTML('nf_vouch', false, '推荐') + switchHTML('nf_status', true, '显示') +
		'</div></div></div>';
	openModal(isNew ? '新增资讯' : '编辑资讯', bodyHTML, [
		{ text: '取消' },
		{ text: '保 存', cls: 'primary', onClick: async () => saveNews(id) }
	], true);
	bindPicPicker($('#modalBox'));
	if (!isNew) guard(async () => {
		const n = await api('admin/news_detail', { id });
		$('#nf_title').value = n.NEWS_TITLE || '';
		$('#nf_cate').value = String(n.NEWS_CATE_ID || 1);
		$('#nf_tab').value = n.NEWS_TAB || '';
		$('#nf_desc').value = n.NEWS_DESC || '';
		$('#nf_content').value = joinContentText(n.NEWS_CONTENT);
		const pic = Array.isArray(n.NEWS_PIC) ? (n.NEWS_PIC[0] || '') : (n.NEWS_PIC || '');
		setPicPicker('npic', pic);
		$('#nf_order').value = toInt(n.NEWS_ORDER);
		$('#nf_vouch').checked = !!n.NEWS_VOUCH;
		$('#nf_status').checked = n.NEWS_STATUS === undefined ? true : !!n.NEWS_STATUS;
	});
}

async function saveNews(id) {
	const title = $('#nf_title').value.trim();
	if (!title) { toast('请填写标题'); return false; }
	const body = {
		title,
		cateId: Number($('#nf_cate').value),
		tab: $('#nf_tab').value,
		desc: $('#nf_desc').value.trim(),
		content: lineToContent($('#nf_content').value),
		pic: (() => { const p = getPicVal('npic'); return p ? [p] : []; })(),
		order: toInt($('#nf_order').value),
		vouch: $('#nf_vouch').checked,
		status: $('#nf_status').checked
	};
	if (id) {
		body.id = id;
		await api('admin/news_edit', body);
		toast('已保存');
	} else {
		await api('admin/news_insert', body);
		toast('已新增');
	}
	loadNews();
}

/* ============================================================
 * 3. 报名项目管理
 * ============================================================ */
const enrollQuery = { page: 1, search: '' };

PAGES.enroll = {
	title: '报名项目',
	async render(el) {
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<input type="text" id="enrollKw" class="ipt" style="width:200px" placeholder="搜索项目标题" value="' + esc(enrollQuery.search) + '">' +
			'<button class="btn primary" id="enrollSearch">查询</button>' +
			'<span class="flex1"></span>' +
			'<button class="btn primary" id="enrollAdd">＋ 新增项目</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>标题</th><th>分类</th><th>状态</th><th>需审核</th><th>人数上限</th><th>已报名</th><th>浏览量</th><th>报名时间</th><th>操作</th>' +
			'</tr></thead><tbody id="enrollTbody"></tbody></table></div>' +
			'<div class="pager" id="enrollPager"></div></div>';
		$('#enrollSearch', el).onclick = () => {
			enrollQuery.search = $('#enrollKw', el).value.trim();
			enrollQuery.page = 1;
			loadEnroll();
		};
		bindEnter($('#enrollKw', el), () => $('#enrollSearch', el).click());
		$('#enrollAdd', el).onclick = () => openEnrollForm('');
		await loadEnroll();
	}
};

async function loadEnroll() {
	const body = { page: enrollQuery.page, size: 10 };
	if (enrollQuery.search) body.search = enrollQuery.search;
	const d = await api('admin/enroll_list', body);
	if (!d.list.length) {
		$('#enrollTbody').innerHTML = '<tr><td colspan="9" class="empty">暂无数据</td></tr>';
		$('#enrollPager').innerHTML = '';
		return;
	}
	// 列表接口未返回 需审核 / 报名时间，逐条补详情（数据量小，可接受）
	const dets = await Promise.all(d.list.map(x => api('admin/enroll_detail', { id: x._id }).catch(() => null)));
	$('#enrollTbody').innerHTML = d.list.map((e, i) => {
		const det = dets[i];
		const statusCls = e.statusDesc === '进行中' ? 'ok' : (e.statusDesc === '未开始' ? 'warn' : 'mute');
		const time = det ? ((det.ENROLL_START || '—') + ' ~ ' + (det.ENROLL_END || '—')) : '—';
		return '<tr>' +
			'<td class="td-title ellipsis" title="' + esc(e.ENROLL_TITLE) + '">' + esc(e.ENROLL_TITLE) + '</td>' +
			'<td>' + esc(e.ENROLL_CATE_NAME) + '</td>' +
			'<td><span class="tag ' + statusCls + '">' + esc(e.statusDesc) + '</span></td>' +
			'<td>' + (det ? (det.ENROLL_CHECK_SET ? '<span class="tag warn">需审核</span>' : '<span class="tag mute">免审核</span>') : '—') + '</td>' +
			'<td>' + (toInt(e.ENROLL_MAX_CNT) === 0 ? '不限' : toInt(e.ENROLL_MAX_CNT)) + '</td>' +
			'<td>' + toInt(e.ENROLL_JOIN_CNT) + '</td>' +
			'<td>' + toInt(e.ENROLL_VIEW_CNT) + '</td>' +
			'<td>' + esc(time) + '</td>' +
			'<td class="td-ops">' +
			'<a class="op" data-act="edit">编辑</a>' +
			'<a class="op" data-act="status">' + (e.statusDesc === '已停止' ? '开启' : '停止') + '</a>' +
			'<a class="op danger" data-act="del">删除</a></td></tr>';
	}).join('');
	$$('#enrollTbody tr').forEach((tr, i) => {
		const e = d.list[i];
		$$('.op', tr).forEach(a => a.onclick = () => guard(() => enrollOp(a.dataset.act, e)));
	});
	renderPager($('#enrollPager'), d, p => { enrollQuery.page = p; loadEnroll(); });
}

async function enrollOp(act, e) {
	if (act === 'edit') return openEnrollForm(e._id);
	if (act === 'status') {
		const stop = e.statusDesc === '已停止';
		await api('admin/enroll_status', { id: e._id, status: stop });
		toast(stop ? '已开启报名' : '已停止报名');
		loadEnroll(); return;
	}
	if (act === 'del') {
		confirmBox('确定删除报名项目「' + e.ENROLL_TITLE + '」？删除后不可恢复。', async () => {
			await api('admin/enroll_del', { id: e._id });
			toast('已删除'); loadEnroll();
		}, true);
	}
}

function openEnrollForm(id) {
	const isNew = !id;
	const bodyHTML =
		'<div class="form-item"><label><i class="req">*</i>标题</label>' +
		'<input type="text" id="ef_title" class="ipt" maxlength="60" placeholder="请输入项目标题"></div>' +
		'<div class="form-row2">' +
		'<div class="form-item"><label>分类</label><select id="ef_cate" class="ipt">' +
		Object.keys(ENROLL_CATE).map(k => '<option value="' + k + '">' + ENROLL_CATE[k] + '</option>').join('') +
		'</select></div>' +
		'<div class="form-item"><label>人数上限（0=不限）</label><input type="number" id="ef_max" class="ipt" value="0" min="0"></div>' +
		'</div>' +
		'<div class="form-item"><label>项目属性</label><div class="switch-line">' +
		switchHTML('ef_status', true, '开启报名') +
		switchHTML('ef_check', false, '报名需审核') +
		switchHTML('ef_cancel', true, '允许取消') +
		switchHTML('ef_edit', true, '允许修改') +
		switchHTML('ef_vouch', false, '推荐') +
		'</div></div>' +
		'<div class="form-item"><label>封面</label>' + picPickerHTML('epic', '') + '</div>' +
		'<div class="form-item"><label>简介</label>' +
		'<textarea id="ef_desc" class="ipt" rows="2" placeholder="列表页简介（选填）"></textarea></div>' +
		'<div class="form-item"><label>详细介绍</label>' +
		'<textarea id="ef_intro" class="ipt" rows="7" placeholder="每行一段文字，保存时按行拆分为详细介绍段落"></textarea></div>';
	openModal(isNew ? '新增报名项目' : '编辑报名项目', bodyHTML, [
		{ text: '取消' },
		{ text: '保 存', cls: 'primary', onClick: async () => saveEnroll(id) }
	], true);
	bindPicPicker($('#modalBox'));
	if (!isNew) guard(async () => {
		const e = await api('admin/enroll_detail', { id });
		$('#ef_title').value = e.ENROLL_TITLE || '';
		$('#ef_cate').value = String(e.ENROLL_CATE_ID || 1);
		$('#ef_max').value = toInt(e.ENROLL_MAX_CNT);
		// 详情接口未返回 ENROLL_STATUS 原始值，用 statusDesc 判断（已停止 = 关闭）
		$('#ef_status').checked = e.statusDesc !== '已停止';
		$('#ef_check').checked = !!e.ENROLL_CHECK_SET;
		$('#ef_cancel').checked = e.ENROLL_CANCEL_SET === undefined ? true : !!e.ENROLL_CANCEL_SET;
		$('#ef_edit').checked = e.ENROLL_EDIT_SET === undefined ? true : !!e.ENROLL_EDIT_SET;
		$('#ef_vouch').checked = !!e.ENROLL_VOUCH;
		const forms = e.ENROLL_FORMS || [];
		const cover = forms.find(f => f.mark === 'cover');
		const desc = forms.find(f => f.mark === 'desc');
		const intro = forms.find(f => f.mark === 'intro');
		setPicPicker('epic', cover && Array.isArray(cover.val) ? (cover.val[0] || '') : ((cover && cover.val) || ''));
		$('#ef_desc').value = desc ? (desc.val || '') : '';
		$('#ef_intro').value = joinContentText(intro && intro.val);
	});
}

async function saveEnroll(id) {
	const title = $('#ef_title').value.trim();
	if (!title) { toast('请填写标题'); return false; }
	const cover = getPicVal('epic');
	const body = {
		title,
		cateId: Number($('#ef_cate').value),
		status: $('#ef_status').checked,
		maxCnt: toInt($('#ef_max').value),
		checkSet: $('#ef_check').checked,
		cancelSet: $('#ef_cancel').checked,
		editSet: $('#ef_edit').checked,
		vouch: $('#ef_vouch').checked,
		cover: cover ? [cover] : [],
		desc: $('#ef_desc').value.trim(),
		intro: lineToContent($('#ef_intro').value)
	};
	if (id) {
		body.id = id;
		await api('admin/enroll_edit', body);
		toast('已保存');
	} else {
		await api('admin/enroll_insert', body);
		toast('已新增');
	}
	loadEnroll();
}

/* ============================================================
 * 4. 报名名单
 * ============================================================ */
const joinQuery = { page: 1, enrollId: '', status: '', search: '' };
let joinProjects = [];

PAGES.join = {
	title: '报名名单',
	async render(el) {
		const d = await api('admin/enroll_list', { page: 1, size: 50 });
		joinProjects = d.list || [];
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<select id="joinEnroll" class="ipt" style="max-width:220px"><option value="">全部项目</option>' +
			joinProjects.map(p => '<option value="' + esc(p._id) + '"' + (joinQuery.enrollId === p._id ? ' selected' : '') + '>' + esc(p.ENROLL_TITLE) + '</option>').join('') +
			'</select>' +
			'<select id="joinStatus" class="ipt"><option value="">全部状态</option>' +
			'<option value="0"' + (joinQuery.status === '0' ? ' selected' : '') + '>待审核</option>' +
			'<option value="1"' + (joinQuery.status === '1' ? ' selected' : '') + '>报名成功</option>' +
			'<option value="99"' + (joinQuery.status === '99' ? ' selected' : '') + '>审核未通过</option>' +
			'<option value="9"' + (joinQuery.status === '9' ? ' selected' : '') + '>已取消</option>' +
			'</select>' +
			'<input type="text" id="joinKw" class="ipt" style="width:180px" placeholder="搜索姓名 / 电话" value="' + esc(joinQuery.search) + '">' +
			'<button class="btn primary" id="joinSearch">查询</button>' +
			'<span class="flex1"></span>' +
			'<button class="btn plain" id="joinExport">导出CSV</button>' +
			'<button class="btn danger" id="joinClear">清空该项目名单</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>姓名</th><th>性别</th><th>出生</th><th>电话</th><th>住址</th><th>项目</th><th>状态</th><th>报名时间</th><th>操作</th>' +
			'</tr></thead><tbody id="joinTbody"></tbody></table></div>' +
			'<div class="pager" id="joinPager"></div></div>';
		$('#joinSearch', el).onclick = () => {
			joinQuery.enrollId = $('#joinEnroll', el).value;
			joinQuery.status = $('#joinStatus', el).value;
			joinQuery.search = $('#joinKw', el).value.trim();
			joinQuery.page = 1;
			loadJoins();
		};
		$('#joinEnroll', el).onchange = () => $('#joinSearch', el).click();
		$('#joinStatus', el).onchange = () => $('#joinSearch', el).click();
		bindEnter($('#joinKw', el), () => $('#joinSearch', el).click());
		$('#joinExport', el).onclick = () => guard(async () => {
			if (!$('#joinEnroll', el).value) { toast('请先选择报名项目'); return; }
			joinQuery.enrollId = $('#joinEnroll', el).value;
			const r = await api('admin/enroll_join_export', { enrollId: joinQuery.enrollId });
			downloadCSV(r.name || '报名名单.csv', r.csv || '');
			toast('已导出 CSV');
		});
		$('#joinClear', el).onclick = () => guard(async () => {
			if (!$('#joinEnroll', el).value) { toast('请先选择报名项目'); return; }
			joinQuery.enrollId = $('#joinEnroll', el).value;
			const p = joinProjects.find(x => x._id === joinQuery.enrollId);
			confirmBox('确定清空项目「' + (p ? p.ENROLL_TITLE : '') + '」的全部报名名单？名单将全部变为已取消，项目报名人数清零，不可恢复！', async () => {
				const r = await api('admin/enroll_cancel_join_all', { enrollId: joinQuery.enrollId });
				toast('已清空 ' + toInt(r.cnt) + ' 条记录');
				loadJoins();
			}, true);
		});
		await loadJoins();
	}
};

async function loadJoins() {
	const body = { page: joinQuery.page, size: 10 };
	if (joinQuery.enrollId) body.enrollId = joinQuery.enrollId;
	if (joinQuery.status !== '') body.status = Number(joinQuery.status);
	if (joinQuery.search) body.search = joinQuery.search;
	const d = await api('admin/enroll_join_list', body);
	const tb = $('#joinTbody');
	if (!d.list.length) {
		tb.innerHTML = '<tr><td colspan="9" class="empty">暂无数据</td></tr>';
		$('#joinPager').innerHTML = '';
		return;
	}
	tb.innerHTML = d.list.map(j => {
		const o = j.formsObj || {};
		const st = JOIN_STATUS[j.status] || ['未知', 'mute'];
		return '<tr>' +
			'<td>' + esc(o.name) + '</td>' +
			'<td>' + esc(o.sex) + '</td>' +
			'<td>' + esc(o.birth) + '</td>' +
			'<td>' + esc(o.phone) + '</td>' +
			'<td class="td-title ellipsis" title="' + esc(o.address) + '">' + esc(o.address) + '</td>' +
			'<td class="td-title ellipsis" title="' + esc(j.title) + '">' + esc(j.title) + '</td>' +
			'<td><span class="tag ' + st[1] + '">' + esc(st[0]) + '</span></td>' +
			'<td>' + esc(j.time) + '</td>' +
			'<td class="td-ops">' +
			(j.status !== 1 ? '<a class="op" data-act="pass">通过</a>' : '') +
			(j.status !== 99 ? '<a class="op" data-act="reject">驳回</a>' : '') +
			(j.status !== 0 && j.status !== 9 ? '<a class="op mute" data-act="pending">待审</a>' : '') +
			'<a class="op danger" data-act="del">删除</a></td></tr>';
	}).join('');
	$$('#joinTbody tr').forEach((tr, i) => {
		const j = d.list[i];
		$$('.op', tr).forEach(a => a.onclick = () => guard(() => joinOp(a.dataset.act, j)));
	});
	renderPager($('#joinPager'), d, p => { joinQuery.page = p; loadJoins(); });
}

async function joinOp(act, j) {
	if (act === 'pass') {
		await api('admin/enroll_join_status', { id: j._id, status: 1 });
		toast('已通过报名'); loadJoins(); return;
	}
	if (act === 'reject') {
		promptBox('驳回报名', { label: '驳回原因（将通知用户）', placeholder: '请输入驳回原因' }, async v => {
			await api('admin/enroll_join_status', { id: j._id, status: 99, reason: v });
			toast('已驳回'); loadJoins();
		});
		return;
	}
	if (act === 'pending') {
		await api('admin/enroll_join_status', { id: j._id, status: 0 });
		toast('已改为待审核'); loadJoins(); return;
	}
	if (act === 'del') {
		confirmBox('确定删除该条报名记录？删除后不可恢复。', async () => {
			await api('admin/enroll_join_del', { id: j._id });
			toast('已删除'); loadJoins();
		}, true);
	}
}

/* ============================================================
 * 5. 用户管理
 * ============================================================ */
const userQuery = { page: 1, search: '' };

PAGES.user = {
	title: '用户管理',
	async render(el) {
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<input type="text" id="userKw" class="ipt" style="width:200px" placeholder="搜索姓名 / 手机号" value="' + esc(userQuery.search) + '">' +
			'<button class="btn primary" id="userSearch">查询</button>' +
			'<span class="flex1"></span>' +
			'<button class="btn plain" id="userExport">导出CSV</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>姓名</th><th>手机号</th><th>性别</th><th>生日</th><th>住址</th><th>状态</th><th>登录次数</th><th>注册时间</th><th>操作</th>' +
			'</tr></thead><tbody id="userTbody"></tbody></table></div>' +
			'<div class="pager" id="userPager"></div></div>';
		$('#userSearch', el).onclick = () => {
			userQuery.search = $('#userKw', el).value.trim();
			userQuery.page = 1;
			loadUsers();
		};
		bindEnter($('#userKw', el), () => $('#userSearch', el).click());
		$('#userExport', el).onclick = () => guard(async () => {
			const r = await api('admin/user_export', {});
			downloadCSV(r.name || '用户名单.csv', r.csv || '');
			toast('已导出 CSV');
		});
		await loadUsers();
	}
};

async function loadUsers() {
	const body = { page: userQuery.page, size: 10 };
	if (userQuery.search) body.search = userQuery.search;
	const d = await api('admin/user_list', body);
	const tb = $('#userTbody');
	if (!d.list.length) {
		tb.innerHTML = '<tr><td colspan="9" class="empty">暂无数据</td></tr>';
		$('#userPager').innerHTML = '';
		return;
	}
	tb.innerHTML = d.list.map(u => {
		const f = u.USER_FORMS || {};
		const st = USER_STATUS[u.USER_STATUS] || ['未知', 'mute'];
		return '<tr>' +
			'<td>' + esc(u.USER_NAME) + '</td>' +
			'<td>' + esc(u.USER_MOBILE) + '</td>' +
			'<td>' + esc(f.sex) + '</td>' +
			'<td>' + esc(f.birth) + '</td>' +
			'<td class="td-title ellipsis" title="' + esc(f.address) + '">' + esc(f.address) + '</td>' +
			'<td><span class="tag ' + st[1] + '">' + esc(st[0]) + '</span></td>' +
			'<td>' + toInt(u.USER_LOGIN_CNT) + '</td>' +
			'<td>' + esc(u.USER_ADD_TIME) + '</td>' +
			'<td class="td-ops">' +
			(u.USER_STATUS === 9
				? '<a class="op" data-act="enable">恢复</a>'
				: '<a class="op" data-act="disable">禁用</a>') +
			'<a class="op" data-act="detail">详情</a>' +
			'<a class="op danger" data-act="del">删除</a></td></tr>';
	}).join('');
	$$('#userTbody tr').forEach((tr, i) => {
		const u = d.list[i];
		$$('.op', tr).forEach(a => a.onclick = () => guard(() => userOp(a.dataset.act, u)));
	});
	renderPager($('#userPager'), d, p => { userQuery.page = p; loadUsers(); });
}

async function userOp(act, u) {
	if (act === 'disable') {
		confirmBox('确定禁用用户「' + u.USER_NAME + '」？禁用后该用户无法登录。', async () => {
			await api('admin/user_status', { id: u._id, status: 9 });
			toast('已禁用'); loadUsers();
		}, true);
		return;
	}
	if (act === 'enable') {
		confirmBox('确定恢复用户「' + u.USER_NAME + '」为正常状态？', async () => {
			await api('admin/user_status', { id: u._id, status: 1 });
			toast('已恢复'); loadUsers();
		});
		return;
	}
	if (act === 'detail') {
		const d = await api('admin/user_detail', { id: u._id });
		const f = d.USER_FORMS || {};
		const st = USER_STATUS[d.USER_STATUS] || ['未知', 'mute'];
		openModal('用户详情', infoRows([
			['姓名', d.USER_NAME], ['手机号', d.USER_MOBILE], ['性别', f.sex], ['生日', f.birth],
			['住址', f.address], ['状态', st[0]], ['登录次数', toInt(d.USER_LOGIN_CNT)],
			['最近登录', d.USER_LOGIN_TIME || '—'], ['注册时间', d.USER_ADD_TIME],
			['报名次数', toInt(d.joinCnt)], ['收藏数', toInt(d.favCnt)]
		]), [{ text: '关闭', cls: 'primary' }]);
		return;
	}
	if (act === 'del') {
		confirmBox('确定删除用户「' + u.USER_NAME + '」？该用户的收藏、报名记录关联将失效，不可恢复。', async () => {
			await api('admin/user_del', { id: u._id });
			toast('已删除'); loadUsers();
		}, true);
	}
}

/* ============================================================
 * 6. 管理员管理
 * ============================================================ */
PAGES.mgr = {
	title: '管理员',
	async render(el) {
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<span class="tip" style="margin:0">账号「admin」为内置超级管理员，不可禁用或删除。</span>' +
			'<span class="flex1"></span>' +
			'<button class="btn primary" id="mgrAdd">＋ 新增管理员</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>账号</th><th>类型</th><th>状态</th><th>电话</th><th>描述</th><th>登录次数</th><th>最近登录</th><th>操作</th>' +
			'</tr></thead><tbody id="mgrTbody"></tbody></table></div></div>';
		$('#mgrAdd', el).onclick = () => openMgrForm('');
		await loadMgrs();
	}
};

async function loadMgrs() {
	const d = await api('admin/mgr_list', {});
	const tb = $('#mgrTbody');
	if (!d.list.length) {
		tb.innerHTML = '<tr><td colspan="8" class="empty">暂无数据</td></tr>';
		return;
	}
	tb.innerHTML = d.list.map(a => '<tr>' +
		'<td>' + esc(a.ADMIN_NAME) + '</td>' +
		'<td>' + (a.ADMIN_TYPE ? '<span class="tag red">超管</span>' : '<span class="tag mute">普通</span>') + '</td>' +
		'<td>' + (a.ADMIN_STATUS ? '<span class="tag ok">正常</span>' : '<span class="tag mute">已禁用</span>') + '</td>' +
		'<td>' + esc(a.ADMIN_PHONE) + '</td>' +
		'<td class="td-title ellipsis" title="' + esc(a.ADMIN_DESC) + '">' + esc(a.ADMIN_DESC) + '</td>' +
		'<td>' + toInt(a.ADMIN_LOGIN_CNT) + '</td>' +
		'<td>' + (a.ADMIN_LOGIN_TIME || '—') + '</td>' +
		'<td class="td-ops">' +
		'<a class="op" data-act="edit">编辑</a>' +
		'<a class="op" data-act="pwd">重置密码</a>' +
		(a.ADMIN_NAME !== 'admin'
			? '<a class="op" data-act="status">' + (a.ADMIN_STATUS ? '禁用' : '启用') + '</a>' +
			  '<a class="op danger" data-act="del">删除</a>'
			: '') +
		'</td></tr>').join('');
	$$('#mgrTbody tr').forEach((tr, i) => {
		const a = d.list[i];
		$$('.op', tr).forEach(x => x.onclick = () => guard(() => mgrOp(x.dataset.act, a)));
	});
}

async function mgrOp(act, a) {
	if (act === 'edit') return openMgrForm(a._id);
	if (act === 'pwd') {
		promptBox('重置密码「' + a.ADMIN_NAME + '」', { label: '新密码（至少6位）', type: 'password', placeholder: '请输入新密码' }, async v => {
			if (v.length < 6) { toast('密码至少6位'); return false; }
			await api('admin/mgr_pwd', { id: a._id, password: v });
			toast('密码已重置'); loadMgrs();
		});
		return;
	}
	if (act === 'status') {
		const disable = !!a.ADMIN_STATUS;
		confirmBox(disable
			? '确定禁用管理员「' + a.ADMIN_NAME + '」？禁用后无法登录后台。'
			: '确定启用管理员「' + a.ADMIN_NAME + '」？', async () => {
			await api('admin/mgr_status', { id: a._id, status: disable ? 0 : 1 });
			toast(disable ? '已禁用' : '已启用'); loadMgrs();
		}, disable);
		return;
	}
	if (act === 'del') {
		confirmBox('确定删除管理员「' + a.ADMIN_NAME + '」？删除后不可恢复。', async () => {
			await api('admin/mgr_del', { id: a._id });
			toast('已删除'); loadMgrs();
		}, true);
	}
}

function openMgrForm(id) {
	const isNew = !id;
	const bodyHTML =
		(isNew
			? '<div class="form-item"><label><i class="req">*</i>账号</label><input type="text" id="mf_name" class="ipt" maxlength="20" placeholder="请输入登录账号"></div>' +
			  '<div class="form-item"><label><i class="req">*</i>密码（至少6位）</label><input type="password" id="mf_pwd" class="ipt" placeholder="请输入登录密码"></div>'
			: '') +
		'<div class="form-item"><label>类型</label><div class="switch-line">' +
		switchHTML('mf_type', false, '超级管理员') + '</div></div>' +
		'<div class="form-item"><label>电话</label><input type="text" id="mf_phone" class="ipt" maxlength="11" placeholder="选填"></div>' +
		'<div class="form-item"><label>描述</label><input type="text" id="mf_desc" class="ipt" maxlength="50" placeholder="选填，如：内容编辑"></div>';
	openModal(isNew ? '新增管理员' : '编辑管理员', bodyHTML, [
		{ text: '取消' },
		{ text: '保 存', cls: 'primary', onClick: async () => saveMgr(id) }
	]);
	if (!isNew) guard(async () => {
		const a = await api('admin/mgr_detail', { id });
		$('#mf_type').checked = !!a.ADMIN_TYPE;
		$('#mf_phone').value = a.ADMIN_PHONE || '';
		$('#mf_desc').value = a.ADMIN_DESC || '';
	});
}

async function saveMgr(id) {
	if (id) {
		await api('admin/mgr_edit', {
			id,
			type: $('#mf_type').checked,
			phone: $('#mf_phone').value.trim(),
			desc: $('#mf_desc').value.trim()
		});
		toast('已保存');
	} else {
		const name = $('#mf_name').value.trim();
		const pwd = $('#mf_pwd').value;
		if (!name) { toast('请填写账号'); return false; }
		if (pwd.length < 6) { toast('密码至少6位'); return false; }
		await api('admin/mgr_insert', {
			name,
			password: pwd,
			type: $('#mf_type').checked,
			phone: $('#mf_phone').value.trim(),
			desc: $('#mf_desc').value.trim()
		});
		toast('已新增');
	}
	loadMgrs();
}

/* ============================================================
 * 7. 系统日志
 * ============================================================ */
const logQuery = { page: 1 };

PAGES.log = {
	title: '系统日志',
	async render(el) {
		el.innerHTML =
			'<div class="panel">' +
			'<div class="toolbar">' +
			'<span class="tip" style="margin:0">记录管理后台的关键操作，按时间倒序展示。</span>' +
			'<span class="flex1"></span>' +
			'<button class="btn danger" id="logClear">清空日志</button>' +
			'</div>' +
			'<div class="table-wrap"><table class="table"><thead><tr>' +
			'<th>管理员</th><th>内容</th><th>类型</th><th>时间</th>' +
			'</tr></thead><tbody id="logTbody"></tbody></table></div>' +
			'<div class="pager" id="logPager"></div></div>';
		$('#logClear', el).onclick = () => confirmBox('确定清空全部系统日志？清空后不可恢复。', async () => {
			await api('admin/log_clear', {});
			toast('日志已清空');
			logQuery.page = 1;
			loadLogs();
		}, true);
		await loadLogs();
	}
};

async function loadLogs() {
	const d = await api('admin/log_list', { page: logQuery.page, size: 10 });
	const tb = $('#logTbody');
	if (!d.list.length) {
		tb.innerHTML = '<tr><td colspan="4" class="empty">暂无日志</td></tr>';
		$('#logPager').innerHTML = '';
		return;
	}
	tb.innerHTML = d.list.map(l => '<tr>' +
		'<td>' + esc(l.LOG_ADMIN_NAME) + '</td>' +
		'<td>' + esc(l.LOG_CONTENT) + '</td>' +
		'<td><span class="tag mute">' + esc(LOG_TYPE[l.LOG_TYPE] || l.LOG_TYPE || '其他') + '</span></td>' +
		'<td>' + esc(l.time) + '</td></tr>').join('');
	renderPager($('#logPager'), d, p => { logQuery.page = p; loadLogs(); });
}

/* ============================================================
 * 8. 系统设置
 * ============================================================ */
PAGES.setup = {
	title: '系统设置',
	async render(el) {
		el.innerHTML =
			'<div class="panel"><div class="panel-title">关于我们</div><div class="panel-body">' +
			'<span class="tip">用户端「关于我们」页面展示的内容，每行一段文字，保存后立即生效。</span>' +
			'<textarea id="setupAbout" class="ipt" rows="12" placeholder="请输入关于我们的内容，每行一段"></textarea>' +
			'<div class="form-actions"><button class="btn primary" id="setupSave">保存设置</button></div>' +
			'</div></div>';
		const d = await api('setup/get', { key: 'SETUP_CONTENT_ABOUT' });
		$('#setupAbout', el).value = joinContentText(d.content);
		$('#setupSave', el).onclick = () => guard(async () => {
			await api('admin/setup_set', {
				key: 'SETUP_CONTENT_ABOUT',
				content: lineToContent($('#setupAbout', el).value)
			});
			toast('已保存');
		});
	}
};

/* ============================================================
 * 初始化
 * ============================================================ */
(function init() {
	$('#btnLogin').onclick = doLogin;
	bindEnter($('#loginPwd'), doLogin);
	bindEnter($('#loginName'), doLogin);
	$('#btnLogout').onclick = () => {
		clearAuth();
		state.admin = null;
		toast('已退出登录');
		showLogin();
	};
	if (localStorage.getItem(TOKEN_KEY)) {
		// 校验 token 有效性，401 时 api() 会自动切到登录页
		guard(async () => { await api('admin/home'); enterApp(); }).then(() => {
			if ($('#appView').hidden) showLogin();
		});
	} else {
		showLogin();
	}
})();
