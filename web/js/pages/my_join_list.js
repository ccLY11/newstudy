/** 我的报名列表：报名记录（状态 tag + 时间） */
import { apiAuth } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

const STATUS_TAG = { 1: 'green', 0: 'orange', 99: 'red', 9: 'grey' };

export async function render(root) {
	root.innerHTML = empty('加载中...');

	let list;
	try {
		const data = await apiAuth('enroll/my_join_list');
		list = (data && data.list) || [];
	} catch (e) {
		if (e.message !== '未登录') root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	if (!list.length) { root.innerHTML = empty('暂无报名记录', '📝'); return; }

	root.innerHTML = `
		<div class="cell-group">
			${list.map(j => `
				<div class="cell" data-id="${esc(j._id)}">
					<div style="flex:1;min-width:0">
						<div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(j.title)}</div>
						<div style="font-size:12px;color:var(--text-grey);margin-top:4px">姓名：${esc(j.name || '-')}<span style="margin-left:10px">${esc(j.time || '')}</span></div>
					</div>
					<span class="tag ${STATUS_TAG[j.status] || 'grey'}" style="margin-left:8px">${esc(j.statusDesc)}</span>
					<span class="arrow">›</span>
				</div>`).join('')}
		</div>
	`;

	root.querySelector('.cell-group').addEventListener('click', e => {
		const cell = e.target.closest('.cell');
		if (cell) go('enroll/my_join_detail', { id: cell.dataset.id });
	});
}
