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
},
{
	id: 2,
	title: 'i的发音练习',
	cover: '/assets/img/mandarin-cover.jpg',
	video: VIDEO_BASE + 'mandarin_2.mp4',
	description: '学习元音 i 的标准发音方法与口型练习',
	duration: '07:00'
},
{
	id: 3,
	title: 'l的发音练习',
	cover: '/assets/img/mandarin-cover.jpg',
	video: VIDEO_BASE + 'mandarin_3.mp4',
	description: '学习声母 l 的标准发音方法与口型练习',
	duration: '06:32'
},
{
	id: 4,
	title: 'g的发音练习',
	cover: '/assets/img/mandarin-cover.jpg',
	video: VIDEO_BASE + 'mandarin_4.mp4',
	description: '学习声母 g 的标准发音方法与口型练习',
	duration: '05:06'
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
