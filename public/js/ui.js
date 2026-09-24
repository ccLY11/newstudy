/** 通用 UI：弹窗 / 提示 / 工具函数 */

export function esc(s) {
	return String(s == null ? '' : s)
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let toastTimer = null;
export function toast(msg, ms = 1800) {
	const t = document.getElementById('toast');
	t.textContent = msg;
	t.hidden = false;
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/** 弹窗：showModal('标题','内容', {showCancel}) -> Promise<bool> */
export function showModal(title, content, opts = {}) {
	return new Promise(resolve => {
		const mask = document.getElementById('mask');
		document.getElementById('modalTitle').textContent = title || '';
		const c = document.getElementById('modalContent');
		if (opts.html) c.innerHTML = content; else c.textContent = content || '';
		const ok = document.getElementById('modalOk');
		const cancel = document.getElementById('modalCancel');
		ok.textContent = opts.okText || '确定';
		cancel.style.display = opts.showCancel === false ? 'none' : '';
		cancel.textContent = opts.cancelText || '取消';
		const done = v => { mask.hidden = true; ok.onclick = null; cancel.onclick = null; resolve(v); };
		ok.onclick = () => done(true);
		cancel.onclick = () => done(false);
		mask.hidden = false;
	});
}

export function alert2(title, content) { return showModal(title, content, { showCancel: false }); }

export function confirmBox(title, content) { return showModal(title, content, { showCancel: true }); }

export function loading(show) {
	const p = document.getElementById('pageLoading');
	const page = document.getElementById('page');
	p.hidden = !show;
	page.classList.toggle('blocked', !!show);
}

export function fmtTime(ts) {
	if (!ts) return '';
	const d = new Date(ts);
	const p = n => (n < 10 ? '0' + n : '' + n);
	return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function empty(text = '暂无内容', ico = '📋') {
	return '<div class="empty"><div class="ico">' + ico + '</div>' + esc(text) + '</div>';
}

/** 富文本内容渲染（NEWS_CONTENT: [{type:'text'|'img', val}]） */
export function richText(content) {
	if (!Array.isArray(content)) return esc(content || '');
	return content.map(node => {
		if (node.type === 'img' || node.type === 'image') return '<img src="' + esc(node.val) + '">';
		const parts = String(node.val || '').split(/\n/);
		return parts.map(p => '<p>' + esc(p) + '</p>').join('');
	}).join('');
}
