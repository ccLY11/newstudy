/** 我的收藏：收藏列表，点击跳转原页面 */
import { apiAuth } from '../api.js';
import { esc, empty, toast } from '../ui.js';

const TYPE_TAG = { news: ['资讯', 'red'], enroll: ['报名', 'orange'] };

export async function render(root) {
	root.innerHTML = empty('加载中...');

	let list;
	try {
		const data = await apiAuth('fav/my_list');
		list = (data && data.list) || [];
	} catch (e) {
		if (e.message !== '未登录') root.innerHTML = empty(e.message || '加载失败');
		return;
	}

	if (!list.length) { root.innerHTML = empty('暂无收藏内容', '⭐'); return; }

	root.innerHTML = `
		<div class="cell-group">
			${list.map(f => {
				const tag = TYPE_TAG[f.FAV_TYPE] || [f.FAV_TYPE || '内容', 'grey'];
				return `
				<div class="cell" data-oid="${esc(f.FAV_OID)}" data-path="${esc(f.FAV_PATH || '')}">
					<span class="ic">📄</span>
					<div style="flex:1;min-width:0">
						<div style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.FAV_TITLE)}</div>
						<div style="font-size:11px;color:var(--text-grey);margin-top:3px">${esc(f.time || '')}</div>
					</div>
					<span class="tag ${tag[1]}" style="margin-left:8px;flex-shrink:0">${esc(tag[0])}</span>
					<span class="arrow">›</span>
				</div>`;
			}).join('')}
		</div>
	`;

	root.querySelector('.cell-group').addEventListener('click', e => {
		const cell = e.target.closest('.cell');
		if (!cell) return;
		const path = cell.dataset.path;
		if (!path) { toast('该内容已失效'); return; }
		location.hash = '#/' + path;
	});
}
