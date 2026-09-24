/** 修改个人资料：回填当前值（姓名 + USER_FIELDS 三字段） */
import { apiAuth } from '../api.js';
import { esc, toast, empty, loading } from '../ui.js';
import { store } from '../store.js';

const USER_FIELDS = [
	{ mark: 'sex', title: '性别', type: 'select', selectOptions: ['男', '女'], must: true },
	{ mark: 'birth', title: '生日', type: 'date', must: true },
	{ mark: 'address', title: '住址', type: 'text', must: false }
];

function fieldHtml(def, val) {
	const label = '<label>' + (def.must !== false ? '<span class="req">*</span>' : '') + esc(def.title) + '</label>';
	let ctrl = '';
	if (def.type === 'select') {
		ctrl = '<select data-mark="' + esc(def.mark) + '">' +
			'<option value="">请选择</option>' +
			(def.selectOptions || []).map(o => '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
			'</select>';
	} else if (def.type === 'date') {
		ctrl = '<input type="date" data-mark="' + esc(def.mark) + '" value="' + esc(val || '') + '">';
	} else {
		ctrl = '<input type="text" placeholder="请输入' + esc(def.title) + '" data-mark="' + esc(def.mark) + '" value="' + esc(val || '') + '">';
	}
	return '<div class="form-item">' + label + '<div class="ctrl">' + ctrl + '</div></div>';
}

export async function render(root) {
	root.innerHTML = empty('加载中...');

	let user;
	try {
		const data = await apiAuth('user/detail');
		user = data.user;
	} catch (e) {
		if (e.message !== '未登录') root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	const saved = user.USER_FORMS || {}; // mark -> val
	const vals = { name: user.USER_NAME || '' };

	root.innerHTML = `
		<div class="form-card">
			<div class="form-item">
				<label><span class="req">*</span>姓名</label>
				<div class="ctrl"><input type="text" id="editName" placeholder="请输入姓名" maxlength="30" value="${esc(vals.name)}"></div>
			</div>
			<div class="form-item">
				<label>手机号</label>
				<div class="ctrl" style="line-height:34px;color:var(--text-grey)">${esc(user.USER_MOBILE || '')}</div>
			</div>
		</div>
		<div class="form-card" id="editForm">
			${USER_FIELDS.map(d => fieldHtml(d, saved[d.mark])).join('')}
		</div>
		<div style="padding:0 16px;font-size:12px;color:#999">带 <span style="color:var(--orange)">*</span> 号为必填项</div>
		<div class="btn-area"><button class="btn btn-primary" id="editSubmit">保存</button></div>
	`;

	const nameEl = root.querySelector('#editName');
	nameEl.addEventListener('input', () => { vals.name = nameEl.value.trim(); });

	const formEl = root.querySelector('#editForm');
	formEl.addEventListener('input', e => { if (e.target.dataset.mark) vals[e.target.dataset.mark] = e.target.value.trim(); });
	formEl.addEventListener('change', e => { if (e.target.dataset.mark) vals[e.target.dataset.mark] = e.target.value.trim(); });

	root.querySelector('#editSubmit').onclick = async () => {
		if (!vals.name) { toast('请填写姓名'); return; }
		for (const d of USER_FIELDS) {
			const v = vals[d.mark] !== undefined ? vals[d.mark] : (saved[d.mark] || '');
			if (d.must !== false && !v) { toast('请选择/填写' + d.title); return; }
		}
		const forms = USER_FIELDS.map(d => ({
			mark: d.mark, title: d.title, type: d.type,
			val: vals[d.mark] !== undefined ? vals[d.mark] : (saved[d.mark] || '')
		}));
		try {
			loading(true);
			const res = await apiAuth('user/edit', { name: vals.name, forms });
			loading(false);
			store.setUser(res.user);
			toast('已保存');
			setTimeout(() => history.back(), 600);
		} catch (e) {
			loading(false);
			toast(e.message || '保存失败');
		}
	};
}
