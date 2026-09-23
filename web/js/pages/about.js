/** 关于我们：渲染 SETUP_CONTENT_ABOUT 配置内容 */
import { api } from '../api.js';
import { esc, empty } from '../ui.js';

export async function render(root) {
	root.innerHTML = empty('加载中...');

	try {
		const r = await api('setup/get', { key: 'SETUP_CONTENT_ABOUT' });
		const content = (r && r.content) || [];
		const html = content.map(item => {
			if (typeof item === 'string') return '<p>' + esc(item) + '</p>';
			if (item && (item.type === 'img' || item.type === 'image')) {
				return '<img src="' + esc(item.val) + '" style="max-width: 100%; border-radius: 6px;">';
			}
			if (item && item.val !== undefined) {
				return String(item.val || '').split(/\n/).filter(p => p.trim() !== '').map(p => '<p>' + esc(p) + '</p>').join('');
			}
			return '';
		}).join('');
		root.innerHTML = `<div class="about-body">${html || '<p>暂无内容</p>'}</div>`;
	} catch (e) {
		root.innerHTML = empty(e.message || '加载失败');
	}
}
