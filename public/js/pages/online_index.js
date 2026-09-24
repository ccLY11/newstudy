/** 线上课程（安全教育）：课程列表（静态数据源自小程序 online-course 页面，pageType 默认 safety） */
import { esc } from '../ui.js';
import { go } from '../app.js';

const VIDEO_BASE = '/assets/video/';

export const COURSES = [
	{
		id: 1,
		title: '火灾安全知识',
		cover: '/assets/img/news/cate-training.jpg',
		video: VIDEO_BASE + 'test_video.mp4',
		description: '了解火灾发生时如何求生'
	},
	{
		id: 2,
		title: '交通安全教育',
		cover: '/assets/img/news/cate-heritage.jpg',
		video: VIDEO_BASE + 'test_video.mp4',
		description: '学习交通安全知识和规则'
	},
	{
		id: 3,
		title: '食品安全知识',
		cover: '/assets/img/news/cate-hall.jpg',
		video: VIDEO_BASE + 'test_video.mp4',
		description: '了解食品安全的重要性和注意事项'
	},
	{
		id: 4,
		title: '网络安全教育',
		cover: '/assets/img/news/cate-notice.jpg',
		video: VIDEO_BASE + 'test_video.mp4',
		description: '学习网络安全知识和防护措施'
	},
	{
		id: 5,
		title: '自然灾害防护',
		cover: '/assets/img/silk-road/history.jpg',
		video: VIDEO_BASE + 'test_video.mp4',
		description: '学习自然灾害的防护知识和应对方法'
	}
];

export async function render(root) {
	root.innerHTML = `
		<div style="background: var(--theme); color: #fff; padding: 24px 16px;">
			<div style="font-size: 20px; font-weight: 600;">线上课程</div>
			<div style="margin-top: 6px; font-size: 12px; opacity: .85;">安全教育课堂 · 学习安全知识</div>
		</div>
		${COURSES.map(c => `
			<div class="course-item" data-id="${c.id}">
				<img src="${c.cover}" onerror="this.src='/assets/img/news/cate-notice.jpg'">
				<div>
					<div class="t">${esc(c.title)}</div>
					<div class="d">${esc(c.description)}</div>
				</div>
			</div>`).join('')}
	`;
	root.querySelectorAll('.course-item').forEach(el => {
		el.onclick = () => go('online/video', { id: el.dataset.id });
	});
}
