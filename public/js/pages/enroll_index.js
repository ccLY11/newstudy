/** 报名页（tabBar）：搜索 + 分类筛选 + 报名卡片列表 */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

const CATES = [
	{ id: 0, title: '全部' },
	{ id: 1, title: '普通话教学' },
	{ id: 2, title: '实战检验' },
	{ id: 3, title: 'AI助学' },
	{ id: 4, title: '我要报名' }
];

export async function render(root, params = {}) {
	const initCate = parseInt(params.cateId) || 0;
	root.innerHTML = `
		<div class="search-bar">
			<input type="text" id="enrollSearch" placeholder="搜索报名活动" value="">
			<button id="enrollSearchBtn">搜索</button>
		</div>
		<div class="sort-bar" id="enrollSort">
			${CATES.map(c => '<span class="s' + (c.id === initCate ? ' on' : '') + '" data-id="' + c.id + '">' + esc(c.title) + '</span>').join('')}
		</div>
		<div id="enrollListBox">${empty('加载中...')}</div>
	`;

	const box = root.querySelector('#enrollListBox');
	const searchInput = root.querySelector('#enrollSearch');
	let curCate = initCate;

	async function load() {
		box.innerHTML = empty('加载中...');
		try {
			const data = await api('enroll/list', {
				cateId: curCate || undefined,
				search: searchInput.value.trim() || undefined
			});
			const list = (data && data.list) || [];
			if (!list.length) { box.innerHTML = empty('暂无报名活动'); return; }
			box.innerHTML = list.map(e => `
				<div class="enroll-item" data-id="${esc(e._id)}">
					<span class="status${e.statusDesc === '进行中' ? '' : ' grey'}">${esc(e.statusDesc)}</span>
					<div class="t">${esc(e.ENROLL_TITLE)}</div>
					<div class="line">
						<img src="${esc(e.cover || '/assets/img/news/cate-notice.jpg')}" onerror="this.src='/assets/img/news/cate-notice.jpg'" alt="">
						<div style="flex:1;min-width:0">
							<div class="desc">${esc(e.desc)}</div>
							<div class="cnt">招生人数：${e.ENROLL_MAX_CNT > 0 ? e.ENROLL_MAX_CNT + '人' : '不限'}</div>
						</div>
					</div>
				</div>`).join('');
		} catch (e) {
			box.innerHTML = empty(e.message || '加载失败');
		}
	}

	// 分类筛选
	root.querySelector('#enrollSort').addEventListener('click', e => {
		const s = e.target.closest('.s');
		if (!s) return;
		curCate = parseInt(s.dataset.id) || 0;
		root.querySelectorAll('#enrollSort .s').forEach(x => x.classList.toggle('on', x === s));
		load();
	});

	// 搜索
	const doSearch = () => load();
	root.querySelector('#enrollSearchBtn').onclick = doSearch;
	searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

	// 卡片点击 -> 详情
	box.addEventListener('click', e => {
		const item = e.target.closest('.enroll-item');
		if (item) go('enroll/detail', { id: item.dataset.id });
	});

	await load();
}
