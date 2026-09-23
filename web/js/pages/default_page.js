/** 引导/兜底页：大图 + 欢迎文案 + 进入首页 */
import { go } from '../app.js';

export async function render(root) {
	root.innerHTML = `
		<img class="art-hero" src="/assets/img/swiper/s1.jpg" alt="红色公益文化馆">
		<div style="text-align: center; padding: 36px 28px 8px;">
			<div style="font-size: 22px; font-weight: 700; color: var(--theme);">红色公益文化馆</div>
			<div style="margin-top: 12px; font-size: 13px; color: var(--text-grey); line-height: 1.9;">
				传承红色基因 · 弘扬丝路文化<br>
				公告通知 / 文化教育 / 普通话教学 / 线上课程
			</div>
		</div>
		<div class="btn-area" style="margin-top: 18px;">
			<button class="btn btn-primary" id="enterBtn">进入首页</button>
		</div>
	`;
	root.querySelector('#enterBtn').onclick = () => go('home');
}
