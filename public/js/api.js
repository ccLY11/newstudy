/** API 请求封装：POST /api/<route>，token 放请求头 */
import { store } from './store.js';

export async function api(route, data = {}) {
	const res = await fetch('/api/' + route, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'token': store.getToken() },
		body: JSON.stringify(data)
	});
	let r;
	try { r = await res.json(); } catch (e) { throw new Error('网络异常，请稍后重试'); }
	if (!r.ok) {
		const err = new Error(r.msg || '请求失败');
		err.code = r.code;
		throw err;
	}
	return r.data;
}

/** 需要登录的调用：未登录时跳注册页 */
export async function apiAuth(route, data = {}) {
	try {
		return await api(route, data);
	} catch (e) {
		if (e.code === 401 || !store.isLogin()) {
			const { toast } = await import('./ui.js');
			toast('请先注册/登录');
			location.hash = '#/my/reg';
			throw new Error('未登录');
		}
		throw e;
	}
}
