/** 我的（tabBar）：用户信息红区 + 功能菜单 + 关于/设置 */
import { apiAuth } from '../api.js';
import { esc, confirmBox, empty } from '../ui.js';
import { store } from '../store.js';
import { go } from '../app.js';

/** 用户状态标签：1=正常不显示 0=待审核 8=未通过 9=已禁用 */
function statusTag(status) {
	if (status === 0) return '<span class="tag orange">已注册，待审核</span>';
	if (status === 8) return '<span class="tag red">审核未通过</span>';
	if (status === 9) return '<span class="tag purple">已禁用</span>';
	return '';
}

function cellHtml(ico, title, path, extra = '') {
	return `<div class="cell" data-path="${path}"><span class="ic">${ico}</span>${esc(title)}${extra}<span class="arrow">›</span></div>`;
}

export async function render(root) {
	root.innerHTML = empty('加载中...');

	let user = null;
	if (store.isLogin()) {
		try {
			const data = await apiAuth('user/detail');
			user = data.user || null;
		} catch (e) { user = null; }
	}

	const logged = !!user;
	root.innerHTML = `
		<div class="my-up" id="myTop">
			<div class="bg"><img src="/assets/img/tabbar/my_cur.png" alt=""></div>
			<div class="name">${logged ? esc(user.USER_NAME) : '欢迎回来~~~'}</div>
			<div class="desc">
				${logged ? statusTag(user.USER_STATUS) : ''}
				<span>${logged ? '欢迎回来~~~' : '马上注册，使用更多功能'}</span>
			</div>
		</div>

		<div class="cell-group">
			${logged && user.USER_STATUS !== 9 ? cellHtml('✏️', '修改我的个人资料', 'my/edit') : ''}
			${cellHtml('📝', '我的报名', 'enroll/my_join_list')}
			${cellHtml('⭐', '我的收藏', 'my/fav')}
			${cellHtml('🕐', '历史浏览', 'my/foot')}
		</div>

		<div class="cell-group">
			${cellHtml('📞', '关于我们', 'about')}
			<div class="cell" id="cellSet"><span class="ic">⚙️</span>设置<span class="arrow">›</span></div>
		</div>
	`;

	// 顶部：已登录 -> 修改资料；未登录 -> 注册
	root.querySelector('#myTop').onclick = () => go(logged ? 'my/edit' : 'my/reg');

	// 菜单跳转
	root.querySelectorAll('.cell[data-path]').forEach(c => {
		c.onclick = () => go(c.dataset.path);
	});

	// 设置：已登录 -> 退出登录；未登录 -> 注册
	root.querySelector('#cellSet').onclick = async () => {
		if (!store.isLogin()) { go('my/reg'); return; }
		const ok = await confirmBox('退出登录', '确定要退出当前账号吗？');
		if (!ok) return;
		store.logout();
		render(root);
	};
}
