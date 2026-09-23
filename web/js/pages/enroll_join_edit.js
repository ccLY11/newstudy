/** 修改报名信息：仅渲染可编辑字段（def.edit===true），提交完整五字段 */
import { apiAuth } from '../api.js';
import { esc, toast, empty, loading } from '../ui.js';

function fieldHtml(def, val) {
	const label = '<label>' + (def.must !== false ? '<span class="req">*</span>' : '') + esc(def.title) + '</label>';
	let ctrl = '';
	if (def.type === 'date') {
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
		data = await apiAuth('enroll/my_join_detail', { id: params.id });
	} catch (e) {
		root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	const defs = data.formsDef || [];
	const saved = {}; // 已保存值 mark -> val
	(data.forms || []).forEach(f => { saved[f.mark] = f.val; });
	const editDefs = defs.filter(d => d.edit === true);
	const vals = {};

	root.innerHTML = `
		<div class="form-card">
			<div class="form-item" style="border-bottom:none">
				<label>报名项目</label>
				<div class="ctrl" style="line-height:34px;font-weight:600">${esc(data.title)}</div>
			</div>
		</div>
		<div class="form-card" id="joinEditForm">
			${editDefs.map(d => fieldHtml(d, saved[d.mark])).join('')}
		</div>
		<div style="padding:0 16px;font-size:12px;color:#999">仅可修改部分信息，带 <span style="color:var(--orange)">*</span> 号为必填项</div>
		<div class="btn-area"><button class="btn btn-primary" id="joinEditSubmit">保存修改</button></div>
	`;

	const formEl = root.querySelector('#joinEditForm');
	const readVal = el => { vals[el.dataset.mark] = el.value.trim(); };
	formEl.addEventListener('input', e => { if (e.target.dataset.mark) readVal(e.target); });
	formEl.addEventListener('change', e => { if (e.target.dataset.mark) readVal(e.target); });

	root.querySelector('#joinEditSubmit').onclick = async () => {
		for (const d of editDefs) {
			const v = vals[d.mark] !== undefined ? vals[d.mark] : (saved[d.mark] || '');
			if (d.must !== false && !v) { toast('请填写' + d.title); return; }
			if (d.type === 'mobile' && v && !/^1\d{10}$/.test(v)) { toast('请填写正确的手机号'); return; }
		}
		// 提交完整五字段数组：不可编辑字段用原值
		const forms = defs.map(d => ({
			mark: d.mark, title: d.title, type: d.type,
			val: editDefs.some(x => x.mark === d.mark) ? (vals[d.mark] !== undefined ? vals[d.mark] : (saved[d.mark] || '')) : (saved[d.mark] || '')
		}));
		try {
			loading(true);
			await apiAuth('enroll/join_edit', { id: params.id, forms });
			loading(false);
			toast('已保存');
			setTimeout(() => history.back(), 600);
		} catch (e) {
			loading(false);
			toast(e.message || '保存失败');
		}
	};
}
