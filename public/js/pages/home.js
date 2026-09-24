/** 首页：轮播图 + 四大板块 + 分类入口 + 资讯列表 */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';
import { go } from '../app.js';

const SWIPER_LIST = [
	{ image: '/assets/img/swiper/s1.png', title: '逐遇未来' },
	{ image: '/assets/img/swiper/s2.jpg', title: '丝绸之路展览' },
	{ image: '/assets/img/swiper/s3.jpg', title: '非遗文化传承' },
	{ image: '/assets/img/swiper/s4.jpg', title: '文化教育活动' },
	{ image: '/assets/img/swiper/s5.jpg', title: '艺术展览' }
];

// 四个固定板块（与小程序一致）
const FIXED_MENU = [
	{ id: 'news', title: '公告通知', image: '/assets/img/menu/news1.png', path: 'news/index' },
	{ id: 'silk-road', title: '丝绸之路介绍', image: '/assets/img/menu/news2.png', path: 'silk-road-intro' },
	{ id: 'culture', title: '文化教育', image: '/assets/img/menu/news3.png', path: 'culture/index' },
	{ id: 'mandarin', title: '普通话教学', image: '/assets/img/menu/news4.png', path: 'mandarin/index' }
];

// 报名分类入口（ENROLL_CATE，id=3 跳 AI 助学，其余跳报名页）
const ENROLL_CATE = [
	{ id: 1, title: '普通话教学', image: '/assets/img/menu/1.png' },
	{ id: 2, title: '实战检验', image: '/assets/img/menu/2.png' },
	{ id: 3, title: 'AI助学', image: '/assets/img/menu/3.png' },
	{ id: 4, title: '我要报名', image: '/assets/img/menu/4.png' }
];

export async function render(root) {
	root.innerHTML = `
		<div class="swiper" id="homeSwiper">
			<div class="swiper-track">
				${SWIPER_LIST.map(s => `
					<div class="swiper-item">
						<img src="${s.image}" alt="">
						<div class="swiper-overlay">${esc(s.title)}</div>
					</div>`).join('')}
			</div>
			<div class="swiper-dots">${SWIPER_LIST.map((_, i) => '<i class="' + (i === 0 ? 'on' : '') + '"></i>').join('')}</div>
		</div>

		<div class="menu-card">
			<div class="menu-grid" id="fixedMenu">
				${FIXED_MENU.map(m => `
					<div class="menu-item" data-path="${m.path}">
						<div class="img"><img src="${m.image}" alt=""></div>
						<div class="title">${esc(m.title)}</div>
					</div>`).join('')}
				${ENROLL_CATE.map(m => `
					<div class="menu-item" data-cate="${m.id}">
						<div class="img"><img src="${m.image}" alt=""></div>
						<div class="title">${esc(m.title)}</div>
					</div>`).join('')}
			</div>
		</div>

		<div class="card-title">最新资讯</div>
		<div class="news-list" id="homeList">${empty('加载中...')}</div>
	`;

	// 轮播
	const track = root.querySelector('.swiper-track');
	const dots = root.querySelectorAll('.swiper-dots i');
	const sw = root.querySelector('#homeSwiper');
	let cur = 0, timer = null, startX = null;
	const goSlide = i => {
		cur = (i + SWIPER_LIST.length) % SWIPER_LIST.length;
		track.style.transform = 'translateX(-' + cur * 100 + '%)';
		dots.forEach((d, k) => d.classList.toggle('on', k === cur));
	};
	const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
	const play = () => { stop(); timer = setInterval(() => goSlide(cur + 1), 3000); };
	play();
	// 悬停暂停、移开恢复（触摸后不再自动播放，与小程序一致）
	sw.addEventListener('mouseenter', stop);
	sw.addEventListener('mouseleave', () => { if (startX === null) play(); });
	sw.addEventListener('touchstart', stop, { once: true });
	// 鼠标/触摸拖拽切换
	sw.addEventListener('pointerdown', e => { startX = e.clientX; stop(); sw.setPointerCapture(e.pointerId); });
	sw.addEventListener('pointerup', e => {
		if (startX === null) return;
		const dx = e.clientX - startX; startX = null;
		if (Math.abs(dx) > 40) goSlide(cur + (dx < 0 ? 1 : -1));
		play();
	});
	// 离开首页时清理定时器，避免重复轮播
	window.addEventListener('hashchange', stop, { once: true });

	// 菜单跳转
	root.querySelector('#fixedMenu').addEventListener('click', e => {
		const item = e.target.closest('.menu-item');
		if (!item) return;
		if (item.dataset.path) go(item.dataset.path);
		else if (item.dataset.cate === '3') go('ai/index');
		else go('enroll/index', { cateId: item.dataset.cate });
	});

	// 资讯列表
	try {
		const list = await api('home/list');
		const box = root.querySelector('#homeList');
		if (!list || !list.length) { box.innerHTML = empty('暂无资讯'); return; }
		box.innerHTML = list.map(n => `
			<div class="news-item" data-id="${n._id}">
				<img class="pic" src="${n.NEWS_PIC && n.NEWS_PIC[0] ? n.NEWS_PIC[0] : '/assets/img/news/cate-notice.jpg'}" onerror="this.src='/assets/img/news/cate-notice.jpg'">
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
		root.querySelector('#homeList').innerHTML = empty(e.message);
	}
}
