/** 公告通知（tabBar 页）：横滑分类标签 + 通知卡片列表 */
import { api } from '../api.js';
import { esc, empty, showModal, richText } from '../ui.js';

const CATE_TABS = ['全部', '活动通知', '培训通知', '重要通知', '政策通知'];

export async function render(root) {
	root.innerHTML = `
		<div class="cate-tabs" id="cateTabs">
			${CATE_TABS.map((t, i) => `<div class="cate-tab${i === 0 ? ' active' : ''}" data-tab="${t}">${t}</div>`).join('')}
		</div>
		<div id="noticeList">${empty('加载中...')}</div>
	`;

	let all = [];
	try {
		const ret = await api('news/list', { size: 50 });
		all = (ret && ret.list) || [];
	} catch (e) {
		root.querySelector('#noticeList').innerHTML = empty(e.message || '加载失败');
		return;
	}

	// 徽标：推荐 -> 重要；7 天内发布 -> 新
	const badge = n => {
		if (n.NEWS_VOUCH === 1) return '<span class="tag red">重要</span>';
		if (n.NEWS_ADD_TIME && Date.now() / 1000 - n.NEWS_ADD_TIME < 7 * 86400) return '<span class="tag orange">新</span>';
		return '';
	};

	const paint = (tab) => {
		const list = tab === '全部' ? all : all.filter(n => (n.NEWS_TAB || '') === tab);
		const box = root.querySelector('#noticeList');
		if (!list.length) { box.innerHTML = empty('该分类暂无通知'); return; }
		box.innerHTML = list.map(n => `
			<div class="notice-item" data-id="${esc(n._id)}">
				<div class="head">
					<div class="t">${esc(n.NEWS_TITLE)}</div>
					${badge(n)}
				</div>
				<div class="meta"><span>${esc(n.NEWS_CATE_NAME || '')}</span><span>·</span><span>${esc(n.time)}</span></div>
				<div class="content">${esc(n.NEWS_DESC || '')}</div>
			</div>`).join('');
		box.onclick = async e => {
			const el = e.target.closest('.notice-item');
			if (!el) return;
			const n = all.find(x => x._id === el.dataset.id);
			if (!n) return;
			if (n.NEWS_DESC) {
				showModal(n.NEWS_TITLE, n.NEWS_DESC, { showCancel: false, okText: '知道了' });
				return;
			}
			try {
				const d = await api('news/view', { id: n._id });
				const html = (d.NEWS_CONTENT && d.NEWS_CONTENT.length) ? richText(d.NEWS_CONTENT) : '暂无内容';
				showModal(n.NEWS_TITLE, html, { showCancel: false, okText: '知道了', html: true });
			} catch (err) {
				showModal(n.NEWS_TITLE, '暂无内容', { showCancel: false, okText: '知道了' });
			}
		};
	};

	root.querySelector('#cateTabs').addEventListener('click', e => {
		const tab = e.target.closest('.cate-tab');
		if (!tab) return;
		root.querySelectorAll('#cateTabs .cate-tab').forEach(t => t.classList.toggle('active', t === tab));
		paint(tab.dataset.tab);
	});

	paint('全部');
}
