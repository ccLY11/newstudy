/** 本地存储：用户 token / 用户信息 / 历史浏览 */
const KEY = { token: 'kk_token', user: 'kk_user', foot: 'kk_foot' };

export const store = {
	getToken() { return localStorage.getItem(KEY.token) || ''; },
	setToken(t) { localStorage.setItem(KEY.token, t); },
	clearToken() { localStorage.removeItem(KEY.token); },

	getUser() { try { return JSON.parse(localStorage.getItem(KEY.user)) || null; } catch (e) { return null; } },
	setUser(u) { localStorage.setItem(KEY.user, JSON.stringify(u)); },
	clearUser() { localStorage.removeItem(KEY.user); },
	logout() { this.clearToken(); this.clearUser(); },

	isLogin() { return !!this.getToken(); },

	/** 历史浏览（本地记录，最近在前，最多 50 条） */
	addFoot(item) {
		let arr = this.getFoot();
		arr = arr.filter(x => x.oid !== item.oid);
		arr.unshift(Object.assign({ time: Date.now() }, item));
		if (arr.length > 50) arr.length = 50;
		localStorage.setItem(KEY.foot, JSON.stringify(arr));
	},
	delFoot(oid) {
		localStorage.setItem(KEY.foot, JSON.stringify(this.getFoot().filter(x => x.oid !== oid)));
	},
	clearFoot() { localStorage.removeItem(KEY.foot); },
	getFoot() { try { return JSON.parse(localStorage.getItem(KEY.foot)) || []; } catch (e) { return []; } }
};
