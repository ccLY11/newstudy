/** 立即报名：动态报名表单（JOIN_FIELDS）提交 */
import { apiAuth } from '../api.js';
import { esc, toast, alert2, empty, loading } from '../ui.js';
import { go } from '../app.js';

/** 渲染单个表单控件 */
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
	} else if (def.type === 'mobile') {
		ctrl = '<input type="mobile" maxlength="11" placeholder="请输入手机号" data-mark="' + esc(def.mark) + '" value="' + esc(val || '') + '">';
	} else if (def.type === 'textarea') {
		ctrl = '<textarea placeholder="请输入' + esc(def.title) + '" data-mark="' + esc(def.mark) + '">' + esc(val || '') + '</textarea>';
	} else {
		ctrl = '<input type="text" placeholder="请输入' + esc(def.title) + '" data-mark="' + esc(def.mark) + '" value="' + esc(val || '') + '">';
	}
	return '<div class="form-item">' + label + '<div class="ctrl">' + ctrl + '</div></div>';
}

export async function render(root, params = {}) {
	if (!params.id) { root.innerHTML = empty('参数错误'); return; }
	root.innerHTML = empty('加载中...');

	let data;
	try {
		data = await apiAuth('enroll/detail_for_join', { id: params.id });
	} catch (e) {
		if (e.message !== '未登录') root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	// 已报名过（未取消）-> 提示并返回详情
	if (data.myJoin) {
		await alert2('您已报名', '报名状态：' + (data.myJoin.statusDesc || ''));
		go('enroll/detail', { id: params.id });
		return;
	}
	// 人数已满
	if (data.full) {
		await alert2('报名失败', '该项目报名人数已满');
		go('enroll/detail', { id: params.id });
		return;
	}

	const defs = data.JOIN_FIELDS || [];
	const vals = {};

	root.innerHTML = `
		<div class="form-card">
			<div class="form-item" style="border-bottom:none">
				<label>报名项目</label>
				<div class="ctrl" style="line-height:34px;font-weight:600">${esc(data.ENROLL_TITLE)}</div>
			</div>
		</div>
		<div class="form-card" id="joinForm">
			${defs.map(d => fieldHtml(d, '')).join('')}
		</div>
		<div style="padding:0 16px;font-size:12px;color:#999">请您填写真实资料，带 <span style="color:var(--orange)">*</span> 号为必填项</div>
		<div class="btn-area"><button class="btn btn-primary" id="joinSubmit">提交报名</button></div>
	`;

	// 表单取值（change 兼容 select/date）
	const formEl = root.querySelector('#joinForm');
	const readVal = el => {
		vals[el.dataset.mark] = el.value.trim();
	};
	formEl.addEventListener('input', e => { if (e.target.dataset.mark) readVal(e.target); });
	formEl.addEventListener('change', e => { if (e.target.dataset.mark) readVal(e.target); });

	root.querySelector('#joinSubmit').onclick = async () => {
		// 必填/手机号校验
		for (const d of defs) {
			const v = vals[d.mark] || '';
			if (d.must !== false && !v) { toast('请填写' + d.title); return; }
			if (d.type === 'mobile' && v && !/^1\d{10}$/.test(v)) { toast('请填写正确的手机号'); return; }
		}
		const forms = defs.map(d => ({ mark: d.mark, title: d.title, type: d.type, val: vals[d.mark] || '' }));
		try {
			loading(true);
			await apiAuth('enroll/join', { enrollId: params.id, forms });
			loading(false);
			await alert2('提交成功', data.ENROLL_CHECK_SET === 1 ? '报名已提交，等待管理员审核' : '报名成功');
			go('enroll/my_join_list');
		} catch (e) {
			loading(false);
			toast(e.message || '提交失败');
		}
	};
}
