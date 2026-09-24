/** 应用路由（hash 路由，模拟小程序页面栈） */
import { store } from './store.js';

const TABS = { home: 'home', news: 'news', enroll: 'enroll', my: 'my' };

/** 路由表：路径 -> { title, tab, mod }；mod 为页面模块文件名 */
const ROUTES = {
	'home': { title: '红色公益文化馆', tab: 'home', mod: 'home.js' },

	'news/cate1': { title: '公告通知', tab: 'news', mod: 'news_cate1.js' },
	'news/index': { title: '公告通知', mod: 'news_index.js' },
	'news/cate2': { title: '资讯专栏', mod: 'news_cate2.js' },
	'news/detail': { title: '资讯详情', mod: 'news_detail.js' },
	'search': { title: '搜索', mod: 'search.js' },
	'about': { title: '关于我们', mod: 'about.js' },
	'default': { title: '引导页', mod: 'default_page.js' },

	'silk-road-intro': { title: '丝绸之路介绍', mod: 'silk_road.js' },
	'culture/index': { title: '文化教育', mod: 'culture_index.js' },
	'culture/detail': { title: '文化教育详情', mod: 'culture_detail.js' },
	'mandarin/index': { title: '普通话教学', mod: 'mandarin_index.js' },
	'mandarin/video': { title: '视频播放', mod: 'mandarin_video.js' },

	'enroll/index': { title: '报名', tab: 'enroll', mod: 'enroll_index.js' },
	'enroll/detail': { title: '报名详情', mod: 'enroll_detail.js' },
	'enroll/join': { title: '立即报名', mod: 'enroll_join.js' },
	'enroll/join_edit': { title: '修改报名信息', mod: 'enroll_join_edit.js' },
	'enroll/my_join_list': { title: '我的报名', mod: 'my_join_list.js' },
	'enroll/my_join_detail': { title: '报名详情', mod: 'my_join_detail.js' },

	'my/index': { title: '我的', tab: 'my', mod: 'my_index.js' },
	'my/reg': { title: '注册', mod: 'my_reg.js' },
	'my/edit': { title: '修改我的个人资料', mod: 'my_edit.js' },
	'my/fav': { title: '我的收藏', mod: 'my_fav.js' },
	'my/foot': { title: '历史浏览', mod: 'my_foot.js' },

	'ai/index': { title: 'AI 助学', mod: 'ai_chat.js' }
};

const pageEl = document.getElementById('page');
const navEl = document.getElementById('nav');
const navTitle = document.getElementById('navTitle');
const navBack = document.getElementById('navBack');
const navHome = document.getElementById('navHomeBtn');
const tabbar = document.getElementById('tabbar');

let currentMod = null;
let currentKey = '';

function parseHash() {
	const h = location.hash.replace(/^#\/?/, '');
	const [path, qs] = h.split('?');
	const params = {};
	if (qs) for (const kv of qs.split('&')) {
		const [k, v] = kv.split('=');
		params[decodeURIComponent(k)] = decodeURIComponent(v || '');
	}
	return { path: path || 'home', params };
}

function renderTabbar(tab) {
	if (!tab) { tabbar.classList.add('hidden'); return; }
	tabbar.classList.remove('hidden');
	document.querySelectorAll('.tab-item').forEach(a => {
		const on = a.dataset.tab === tab;
		a.classList.toggle('active', on);
		const img = a.querySelector('.tab-icon');
		const base = '/assets/img/tabbar/';
	 const map = { home: 'home', news: 'news', enroll: 'enroll', my: 'my' };
	 img.src = base + map[a.dataset.tab] + (on ? '_cur' : '') + '.png';
	});
}

async function router() {
	const { path, params } = parseHash();
 const route = ROUTES[path] || ROUTES['default'];
	 currentKey = path;

	navTitle.textContent = route.title;
	navEl.classList.toggle('has-back', !route.tab && path !== 'home' && path !== 'default');
	navEl.classList.toggle('has-home', !route.tab);
	renderTabbar(route.tab);

	pageEl.querySelectorAll('video, audio').forEach(m => { try { m.pause(); m.removeAttribute('src'); m.load(); } catch(e){} });
	document.querySelectorAll('.video-fullscreen').forEach(el => el.remove());
	 pageEl.innerHTML = '';
	 window.scrollTo(0, 0);
	 try {
	 const mod = await import('./pages/' + route.mod);
	 if (parseHash().path !== path) return;
	 currentMod = mod;
	 await mod.render(pageEl, params);
	} catch (e) {
	 if (e && e.message && /Failed to fetch|loading/i.test(e.message)) {
		 pageEl.innerHTML = '<div class="empty"><div class="ico">⚠️</div>页面加载失败，请刷新重试</div>';
	 } else {
		 pageEl.innerHTML = '<div class="empty"><div class="ico">⚠️</div>' + (e.message || '页面加载失败') + '</div>';
		 console.error('[route]', path, e);
	 }
	}
}

navBack.onclick = () => history.back();
navHome.onclick = () => { location.hash = '#/home'; };

window.addEventListener('unhandledrejection', e => {
	if (e.reason && e.reason.code === 401) { store.logout(); }
});

window.addEventListener('hashchange', router);
router();

export function go(path, params = {}) {
	const qs = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '')
		.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
	 location.hash = '#/' + path + (qs ? '?' + qs : '');
}
