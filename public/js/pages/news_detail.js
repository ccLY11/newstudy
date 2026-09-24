/** 资讯详情页：大图 + 标题元信息 + 富文本正文 + 底部收藏 */
import { api, apiAuth } from '../api.js';
import { esc, richText, empty, toast } from '../ui.js';
import { store } from '../store.js';

export async function render(root, params = {}) {
	root.innerHTML = empty('加载中...');

	let n;
	try {
		n = await api('news/view', { id: params.id });
	} catch (e) {
		root.innerHTML = empty(e.message || '资讯不存在');
		return;
	}

	const footItem = { oid: n._id, type: 'news', title: n.NEWS_TITLE, path: '#/news/detail?id=' + n._id };
	store.addFoot(footItem);

	const pic = n.NEWS_PIC && n.NEWS_PIC[0] ? n.NEWS_PIC[0] : '';
	const bodyHtml = (n.NEWS_CONTENT && n.NEWS_CONTENT.length) ? richText(n.NEWS_CONTENT) : '<p>' + esc(n.NEWS_DESC || '暂无内容') + '</p>';

	root.innerHTML = `
		${pic ? `<img class="cover-big" src="${esc(pic)}" onerror="this.style.display='none'">` : ''}
		<div class="detail-top">
			<h1>${esc(n.NEWS_TITLE)}</h1>
			<div class="detail-meta">
				${n.NEWS_CATE_NAME ? `<span class="tag red">${esc(n.NEWS_CATE_NAME)}</span>` : ''}
				<span>${esc(n.time)}</span>
				<span>浏览 ${n.NEWS_VIEW_CNT || 0}</span>
			</div>
		</div>
		<div class="detail-body">${bodyHtml}</div>
		<div style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid var(--line); z-index: 90;">
			<button class="btn btn-primary" id="favBtn">收藏</button>
		</div>
	`;

	const btn = root.querySelector('#favBtn');
	let faved = false;
	if (store.isLogin()) {
		try { faved = !!(await apiAuth('fav/is_fav', { oid: n._id })).fav; } catch (e) { /* 忽略查询失败 */ }
	}
	const paint = () => {
		btn.textContent = faved ? '已收藏' : '收藏';
		btn.classList.toggle('btn-primary', !faved);
		btn.classList.toggle('btn-plain', faved);
	};
	paint();

	btn.onclick = async () => {
		try {
			const r = await apiAuth(faved ? 'fav/del' : 'fav/update', footItem);
			faved = !!r.fav;
			paint();
			toast(faved ? '已收藏' : '已取消收藏');
		} catch (e) { /* 未登录时 apiAuth 已跳转注册页 */ }
	};
}
