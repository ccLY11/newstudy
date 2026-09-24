/** 资讯列表页：搜索框 + 分类筛选 + 列表（params.cateId 可选） */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

// NEWS_CATE 四类（id 与后端一致），0 = 全部
const TABS = [
	{ id: 0, title: '全部' },
	{ id: 1, title: '公告通知' },
	{ id: 2, title: '丝路小程序介绍' },
	{ id: 3, title: '文化教育' },
	{ id: 4, title: '安全教育' }
];

export async function render(root, params = {}) {
	let activeCate = params.cateId ? parseInt(params.cateId) || 0 : 0;
	let keyword = '';

	root.innerHTML = `
		<div class="search-bar">
			<input id="kw" placeholder="搜索资讯标题 / 内容">
			<button id="btnSearch">搜索</button>
		</div>
		<div class="cate-tabs" id="tabs">
			${TABS.map(t => `<div class="cate-tab${t.id === activeCate ? ' active' : ''}" data-id="${t.id}">${t.title}</div>`).join('')}
		</div>
		<div id="list" style="padding-bottom: 8px;">${empty('加载中...')}</div>
	`;

	const kwEl = root.querySelector('#kw');
	const box = root.querySelector('#list');

	async function load() {
		box.innerHTML = empty('加载中...');
		try {
			const ret = await api('news/list', {
				cateId: activeCate || undefined,
				search: keyword || undefined,
				size: 50
			});
			const list = (ret && ret.list) || [];
			if (!list.length) { box.innerHTML = empty('暂无资讯'); return; }
			box.innerHTML = list.map(n => `
				<div class="news-item" data-id="${esc(n._id)}">
					<img class="pic" src="${n.NEWS_PIC && n.NEWS_PIC[0] ? esc(n.NEWS_PIC[0]) : '/assets/img/news/cate-notice.jpg'}" onerror="this.src='/assets/img/news/cate-notice.jpg'">
					<div class="info">
						<div class="t">${esc(n.NEWS_TITLE)}</div>
						<div class="m">
							${n.NEWS_VOUCH ? '<span class="tag red">荐</span>' : ''}
							<span>${esc(n.NEWS_CATE_NAME || '')}</span><span>·</span><span>${esc(n.time)}</span>
						</div>
					</div>
				</div>`).join('') + (list.length >= (ret.total || 0) ? '<div class="load-more">没有更多了</div>' : '');
			box.onclick = e => {
				const item = e.target.closest('.news-item');
				if (item) go('news/detail', { id: item.dataset.id });
			};
		} catch (e) {
			box.innerHTML = empty(e.message || '加载失败');
		}
	}

	root.querySelector('#btnSearch').onclick = () => { keyword = kwEl.value.trim(); load(); };
	kwEl.addEventListener('keydown', e => { if (e.key === 'Enter') { keyword = kwEl.value.trim(); load(); } });

	root.querySelector('#tabs').addEventListener('click', e => {
		const tab = e.target.closest('.cate-tab');
		if (!tab) return;
		activeCate = parseInt(tab.dataset.id) || 0;
		root.querySelectorAll('#tabs .cate-tab').forEach(t => t.classList.toggle('active', t === tab));
		load();
	});

	load();
}
