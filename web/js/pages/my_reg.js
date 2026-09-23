/** 注册：姓名 + 手机号 + 动态 USER_FIELDS 表单 */
import { api } from '../api.js';
import { esc, toast, loading } from '../ui.js';
import { store } from '../store.js';
import { go } from '../app.js';

/** 与服务端 USER_FIELDS_DEF 一致的动态字段 */
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
	if (store.isLogin()) { go('my/index'); return; }

	const vals = { name: '', mobile: '' };

	root.innerHTML = `
		<div class="form-card">
			<div class="form-item">
				<label><span class="req">*</span>姓名</label>
				<div class="ctrl"><input type="text" id="regName" placeholder="请输入姓名" maxlength="30"></div>
			</div>
			<div class="form-item">
				<label><span class="req">*</span>手机号</label>
				<div class="ctrl"><input type="mobile" id="regMobile" placeholder="请输入手机号" maxlength="11"></div>
			</div>
		</div>
		<div class="form-card" id="regForm">
			${USER_FIELDS.map(d => fieldHtml(d, '')).join('')}
		</div>
		<div style="padding:0 16px;font-size:12px;color:#999">带 <span style="color:var(--orange)">*</span> 号为必填项，请填写真实资料</div>
		<div class="btn-area"><button class="btn btn-primary" id="regSubmit">提交注册</button></div>
	`;

	const nameEl = root.querySelector('#regName');
	const mobileEl = root.querySelector('#regMobile');
	nameEl.addEventListener('input', () => { vals.name = nameEl.value.trim(); });
	mobileEl.addEventListener('input', () => { vals.mobile = mobileEl.value.trim(); });

	const formEl = root.querySelector('#regForm');
	formEl.addEventListener('input', e => { if (e.target.dataset.mark) vals[e.target.dataset.mark] = e.target.value.trim(); });
	formEl.addEventListener('change', e => { if (e.target.dataset.mark) vals[e.target.dataset.mark] = e.target.value.trim(); });

	root.querySelector('#regSubmit').onclick = async () => {
		if (!vals.name) { toast('请填写姓名'); return; }
		if (!/^1\d{10}$/.test(vals.mobile)) { toast('请填写正确的手机号'); return; }
		for (const d of USER_FIELDS) {
			if (d.must !== false && !vals[d.mark]) { toast('请选择/填写' + d.title); return; }
		}
		const forms = USER_FIELDS.map(d => ({ mark: d.mark, title: d.title, type: d.type, val: vals[d.mark] || '' }));
		try {
			loading(true);
			const res = await api('user/register', { name: vals.name, mobile: vals.mobile, forms });
			loading(false);
			store.setToken(res.token);
			store.setUser(res.user);
			toast('注册成功');
			setTimeout(() => go('my/index'), 600);
		} catch (e) {
			loading(false);
			toast(e.message || '注册失败');
		}
	};
}
