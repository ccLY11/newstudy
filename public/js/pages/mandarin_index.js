/** 普通话教学：课程列表（静态数据源自小程序 mandarin-course 页面） */
import { esc } from '../ui.js';
import { go } from '../app.js';

const VIDEO_BASE = '/assets/video/';

export const COURSES = [
{
	id: 1,
	title: 'n的发音练习',
	cover: '/assets/img/mandarin-cover.jpg',
	video: VIDEO_BASE + 'mandarin_1.mp4',
	description: '学习鼻辅音 n 的标准发音方法与口型练习',
	duration: '06:06'
}
];

export async function render(root) {
root.innerHTML = `
		<div style="background: var(--theme); color: #fff; padding: 24px 16px;">
			<div style="font-size: 20px; font-weight: 600;">普通话教学</div>
			<div style="margin-top: 6px; font-size: 12px; opacity: .85;">学习标准普通话，提升语言表达能力</div>
		</div>
		${COURSES.map(c => `
			<div class="course-item" data-id="${c.id}">
				<img src="${c.cover}" onerror="this.src='/assets/img/news/cate-notice.jpg'">
				<div>
					<div class="t">${esc(c.title)}</div>
					<div class="d">${esc(c.description)}</div>
					<div style="margin-top: 8px;"><span class="tag grey">时长 ${esc(c.duration)}</span></div>
				</div>
			</div>`).join('')}
		`;
root.querySelectorAll('.course-item').forEach(el => {
el.onclick = () => go('mandarin/video', { id: el.dataset.id });
});
}
