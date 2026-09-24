/** 报名详情（我的报名单条）：状态横幅 + 报名资料 + 修改/取消 */
import { apiAuth } from '../api.js';
import { esc, toast, confirmBox, empty } from '../ui.js';
import { go } from '../app.js';

function statusVisual(status) {
	if (status === 1) return { ico: '✓', cls: 'ok' };
	if (status === 0) return { ico: '⏳', cls: 'wait' };
	if (status === 99) return { ico: '✕', cls: 'no' };
	return { ico: '✕', cls: 'no', grey: true };
}

export async function render(root, params = {}) {
	if (!params.id) { root.innerHTML = empty('参数错误'); return; }
	root.innerHTML = empty('加载中...');

	let d;
	try {
		d = await apiAuth('enroll/my_join_detail', { id: params.id });
	} catch (e) {
		if (e.message !== '未登录') root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	const sv = statusVisual(d.status);
	const forms = d.forms || [];

	root.innerHTML = `
		<div class="status-banner">
			<div class="ico ${sv.cls}" ${sv.grey ? 'style="background:#f0f0f0"' : ''}>${sv.ico}</div>
			<div>
				<div class="t">${esc(d.statusDesc)}</div>
				${d.reason ? '<div class="d">审核意见：' + esc(d.reason) + '</div>' : '<div class="d">报名活动：' + esc(d.title) + '</div>'}
			</div>
		</div>

		<div class="cell-group">
			<div class="cell" id="toEnroll" style="font-weight:500">
				<span class="ic">📝</span>${esc(d.title)}<span class="arrow">›</span>
			</div>
			<div class="view-row"><label>报名时间</label><div class="v">${esc(d.time || '')}</div></div>
		</div>

		<div class="cell-group">
			${forms.map(f => '<div class="view-row"><label>' + esc(f.title) + '</label><div class="v">' + esc(f.val) + '</div></div>').join('')}
		</div>

		${(d.canEdit || d.canCancel) ? `
		<div class="btn-row" style="margin-top:18px">
			${d.canEdit ? '<button class="btn btn-plain" id="editBtn">修改信息</button>' : ''}
			${d.canCancel ? '<button class="btn btn-danger" id="cancelBtn">取消报名</button>' : ''}
		</div>` : ''}
	`;

	root.querySelector('#toEnroll').onclick = () => go('enroll/detail', { id: d.ENROLL_JOIN_ENROLL_ID });

	const editBtn = root.querySelector('#editBtn');
	if (editBtn) editBtn.onclick = () => go('enroll/join_edit', { id: params.id });

	const cancelBtn = root.querySelector('#cancelBtn');
	if (cancelBtn) {
		cancelBtn.onclick = async () => {
			const ok = await confirmBox('取消报名', '确定要取消该报名吗？');
			if (!ok) return;
			try {
				await apiAuth('enroll/my_join_cancel', { id: params.id });
				toast('已取消报名');
				render(root, params); // 刷新
			} catch (e) {
				toast(e.message || '取消失败');
			}
		};
	}
}
