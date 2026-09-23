/** 线上课程视频播放页 */
import { esc, empty } from '../ui.js';
import { COURSES } from './online_index.js';

export async function render(root, params = {}) {
	const c = COURSES.find(x => String(x.id) === String(params.id)) || COURSES[0];
	if (!c) { root.innerHTML = empty('课程不存在'); return; }

	root.innerHTML = `
		<div class="video-box">
			<video id="courseVideo" src="${esc(c.video)}" controls controlslist="nofullscreen" playsinline webkit-playsinline preload="metadata"></video>
			<div class="btn-enlarge" title="放大">⤢</div>
		</div>
		<div class="detail-top">
			<h1 style="font-size: 17px;">${esc(c.title)}</h1>
			<div class="detail-meta">
				<span class="tag red">安全教育</span>
				<span>文化馆讲师</span>
			</div>
		</div>
		<div class="detail-body"><p>${esc(c.description)}</p></div>
	`;

	const video = root.querySelector('#courseVideo');
	const btnEnlarge = root.querySelector('.btn-enlarge');
	btnEnlarge.addEventListener('click', () => openFullscreen(video));
}

/** 打开视频放大遮罩（页面内全屏播放，放大时暂停原视频避免回声） */
function openFullscreen(video) {
	const currentTime = video.currentTime;
	const wasPlaying = !video.paused;
	video.pause();

	const overlay = document.createElement('div');
	overlay.className = 'video-fullscreen';
	overlay.innerHTML = `
		<video src="${video.src}" controls controlslist="nofullscreen" playsinline webkit-playsinline></video>
		<div class="btn-close" title="关闭">✕</div>
	`;
	document.body.appendChild(overlay);

	const fsVideo = overlay.querySelector('video');
	fsVideo.currentTime = currentTime;
	if (wasPlaying) fsVideo.play().catch(() => {});

	const close = () => {
		const fsTime = fsVideo.currentTime;
		const fsPlaying = !fsVideo.paused;
		fsVideo.pause();
		overlay.remove();
		document.removeEventListener('keydown', onKey);
		try {
			video.currentTime = fsTime;
			if (fsPlaying) video.play().catch(() => {});
		} catch (e) {}
	};
	overlay.querySelector('.btn-close').addEventListener('click', close);
	overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
	const onKey = e => { if (e.key === 'Escape') close(); };
	document.addEventListener('keydown', onKey);
}
