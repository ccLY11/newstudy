/** 搜索页：搜索框 + 热门词 + 结果列表 */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

const HOT_WORDS = ['书法', '展览', '培训', '非遗'];

export async function render(root) {
	root.innerHTML = `
		<div class="search-bar">
			<input id="kw" placeholder="搜索资讯标题 / 内容">
			<button id="btnSearch">搜索</button>
		</div>
		<div id="hotBox" style="display: flex; gap: 8px; padding: 0 12px 12px; flex-wrap: wrap;">
			${HOT_WORDS.map(w => `<span class="cate-tab" data-kw="${w}">${w}</span>`).join('')}
		</div>
		<div class="news-list" id="result">${empty('输入关键词或点击热门词搜索', '🔍')}</div>
	`;

	const kwEl = root.querySelector('#kw');
	const box = root.querySelector('#result');

	async function doSearch(kw) {
		kw = (kw || '').trim();
		kwEl.value = kw;
		box.innerHTML = empty('搜索中...', '⏳');
		try {
			const ret = await api('news/list', { search: kw || undefined, size: 50 });
			const list = (ret && ret.list) || [];
			if (!list.length) { box.innerHTML = empty('未找到相关资讯'); return; }
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
				</div>`).join('');
			box.onclick = e => {
				const item = e.target.closest('.news-item');
				if (item) go('news/detail', { id: item.dataset.id });
			};
		} catch (e) {
			box.innerHTML = empty(e.message || '搜索失败');
		}
	}

	root.querySelector('#btnSearch').onclick = () => doSearch(kwEl.value);
	kwEl.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(kwEl.value); });
	root.querySelector('#hotBox').addEventListener('click', e => {
		const chip = e.target.closest('[data-kw]');
		if (chip) doSearch(chip.dataset.kw);
	});
}
