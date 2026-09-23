/** 公告通知落地页：红色标题区 + 分类卡片网格 + 最新通知列表 */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

// NEWS_CATE 四类（与后端 server/api.js 一致）
const NEWS_CATES = [
	{ id: 1, title: '公告通知', desc: '重要公告与馆内动态', image: '/assets/img/news/cate-notice.jpg' },
	{ id: 2, title: '丝路小程序介绍', desc: '丝路文化传播与介绍', image: '/assets/img/silk-road/history.jpg' },
	{ id: 3, title: '文化教育', desc: '文化教育活动资讯', image: '/assets/img/news/cate-heritage.jpg' },
	{ id: 4, title: '安全教育', desc: '安全知识与温馨提示', image: '/assets/img/news/cate-training.jpg' }
];

export async function render(root) {
	root.innerHTML = `
		<div style="background: var(--theme); color: #fff; padding: 24px 16px 28px;">
			<div style="font-size: 20px; font-weight: 600;">公告通知</div>
			<div style="margin-top: 6px; font-size: 12px; opacity: .85;">及时了解最新通知信息</div>
		</div>

		<div class="card-title" style="padding-top: 16px;">通知分类</div>
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 12px;">
			${NEWS_CATES.map(c => `
				<div class="card" style="margin: 0; cursor: pointer;" data-cate="${c.id}">
					<img src="${c.image}" style="width: 100%; height: 80px; object-fit: cover;" onerror="this.style.opacity=.3">
					<div style="padding: 10px 12px 12px;">
						<div style="font-size: 14px; font-weight: 600;">${esc(c.title)}</div>
						<div style="margin-top: 4px; font-size: 11px; color: var(--text-grey);">${esc(c.desc)}</div>
					</div>
				</div>`).join('')}
		</div>

		<div class="card-title" style="padding-top: 16px;">最新通知</div>
		<div class="news-list" id="latestList">${empty('加载中...')}</div>
	`;

	root.querySelectorAll('[data-cate]').forEach(el => {
		el.onclick = () => go('news/cate2', { cateId: el.dataset.cate });
	});

	try {
		const ret = await api('news/list', { size: 10 });
		const list = (ret && ret.list) || [];
		const box = root.querySelector('#latestList');
		if (!list.length) { box.innerHTML = empty('暂无通知'); return; }
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
		root.querySelector('#latestList').innerHTML = empty(e.message || '加载失败');
	}
}
