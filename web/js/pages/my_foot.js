/** 历史浏览：本地足迹（store.getFoot），支持单条删除 / 清空 */
import { esc, fmtTime, confirmBox, empty } from '../ui.js';
import { store } from '../store.js';

export async function render(root) {
	draw();

	function draw() {
		const list = store.getFoot();
		if (!list.length) {
			root.innerHTML = `
				<div style="display:flex;justify-content:flex-end;padding:12px 12px 0">
					<button class="btn btn-plain btn-mini btn-disabled">清空</button>
				</div>
				${empty('暂无浏览记录', '🕐')}`;
			return;
		}
		root.innerHTML = `
			<div style="display:flex;justify-content:flex-end;padding:12px 12px 0">
				<button class="btn btn-plain btn-mini" id="footClear">清空</button>
			</div>
			<div class="cell-group">
				${list.map(f => `
					<div class="cell" data-path="${esc(f.path || '')}">
						<span class="ic">🕐</span>
						<div style="flex:1;min-width:0">
							<div style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.title || '未知内容')}</div>
							<div style="font-size:11px;color:var(--text-grey);margin-top:3px">${fmtTime(f.time)}</div>
						</div>
						<button class="btn btn-plain btn-mini" data-del="${esc(f.oid)}" style="margin-left:8px;flex-shrink:0">删除</button>
					</div>`).join('')}
			</div>
		`;
		bind();
	}

	function bind() {
		root.querySelector('#footClear').onclick = async () => {
			const ok = await confirmBox('清空历史', '确定要清空全部浏览记录吗？');
			if (!ok) return;
			store.clearFoot();
			draw();
		};
		root.querySelector('.cell-group').addEventListener('click', e => {
			const delBtn = e.target.closest('[data-del]');
			if (delBtn) {
				store.delFoot(delBtn.dataset.del);
				draw();
				return;
			}
			const cell = e.target.closest('.cell');
			if (cell && cell.dataset.path) location.hash = '#/' + cell.dataset.path;
		});
	}
}
