/** 文化教育：板块列表（静态数据源自小程序 culture-education 页面） */
import { esc } from '../ui.js';
import { go } from '../app.js';

// 八大板块（culture_detail.js 存有完整图文，按 id 对应）
const COVER = '/assets/img/cover.jpg';
export const CULTURE_LIST = [
	{ id: 1, title: '丝路文化教育', description: '探索丝绸之路的历史文化，了解东西方文明交流的辉煌历程', cover: COVER },
	{ id: 2, title: '传统文化教育', description: '传承中华优秀传统文化，弘扬民族精神', cover: COVER },
	{ id: 3, title: '非遗文化教育', description: '保护非物质文化遗产，传承民族技艺', cover: COVER },
	{ id: 4, title: '古代文学教育', description: '品读古代文学经典，感受文学魅力', cover: COVER },
	{ id: 5, title: '古代艺术教育', description: '欣赏古代艺术精品，提升审美素养', cover: COVER },
	{ id: 6, title: '古代哲学教育', description: '探索古代哲学思想，启迪人生智慧', cover: COVER },
	{ id: 7, title: '古代科技教育', description: '了解古代科技成就，感受创新精神', cover: COVER },
	{ id: 8, title: '古代礼仪教育', description: '学习古代礼仪文化，传承文明礼仪', cover: COVER }
];

export async function render(root) {
	root.innerHTML = `
		<div style="background: var(--theme); color: #fff; padding: 24px 16px;">
			<div style="font-size: 20px; font-weight: 600;">文化教育</div>
			<div style="margin-top: 6px; font-size: 12px; opacity: .85;">传承文明 · 启迪智慧</div>
		</div>
		${CULTURE_LIST.map(c => `
			<div class="course-item" data-id="${c.id}">
				<img src="${c.cover}" onerror="this.src='${COVER}'">
				<div>
					<div class="t">${esc(c.title)}</div>
					<div class="d">${esc(c.description)}</div>
				</div>
			</div>`).join('')}
	`;
	root.querySelectorAll('.course-item').forEach(el => {
		el.onclick = () => go('culture/detail', { id: el.dataset.id });
	});
}
