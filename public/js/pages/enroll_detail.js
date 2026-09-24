/** 报名详情：封面 + 标题状态 + 简介/详细介绍 + 报名信息 + 立即报名 */
import { api } from '../api.js';
import { esc, empty, richText } from '../ui.js';
import { go } from '../app.js';

const STATUS_TAG = { '进行中': 'green', '未开始': 'orange', '已结束': 'grey', '已停止': 'grey' };

export async function render(root, params = {}) {
	if (!params.id) { root.innerHTML = empty('参数错误'); return; }
	root.innerHTML = empty('加载中...');

	let e;
	try {
		e = await api('enroll/view', { id: params.id });
	} catch (err) {
		root.innerHTML = empty(err.message || '加载失败');
		return;
	}

	const forms = e.ENROLL_FORMS || [];
	const formVal = mark => {
		const f = forms.find(x => x.mark === mark);
		return f ? f.val : '';
	};
	const intro = formVal('intro');
	const desc = e.desc || formVal('desc');
	const active = e.statusDesc === '进行中';

	root.innerHTML = `
		<img class="cover-big" src="${esc(e.cover || '/assets/img/news/cate-notice.jpg')}" onerror="this.src='/assets/img/news/cate-notice.jpg'" alt="">
		<div class="detail-top">
			<h1>${esc(e.ENROLL_TITLE)}</h1>
			<div class="detail-meta">
				<span class="tag ${STATUS_TAG[e.statusDesc] || 'grey'}">${esc(e.statusDesc)}</span>
				<span>浏览 ${e.ENROLL_VIEW_CNT || 0}</span>
				<span>·</span>
				<span>已报名 ${e.ENROLL_JOIN_CNT || 0} 人</span>
			</div>
		</div>

		<div class="cell-group">
			<div class="view-row"><label>报名时间</label><div class="v">${esc(e.ENROLL_START || '')} ~ ${esc(e.ENROLL_END || '')}</div></div>
			<div class="view-row"><label>招生人数</label><div class="v">${e.ENROLL_MAX_CNT > 0 ? e.ENROLL_MAX_CNT + '人' : '不限'}</div></div>
			<div class="view-row"><label>报名状态</label><div class="v">${esc(e.statusDesc)}</div></div>
			${e.ENROLL_CHECK_SET === 1 ? '<div class="view-row"><label>审核要求</label><div class="v" style="color:var(--theme)">报名需管理员审核</div></div>' : ''}
		</div>

		<div class="detail-body">
			${desc ? '<p>' + esc(desc) + '</p>' : ''}
			${intro ? richText(intro) : ''}
		</div>

		<div class="btn-area">
			<button class="btn btn-primary${active ? '' : ' btn-disabled'}" id="joinBtn">立即报名</button>
		</div>
	`;

	const btn = root.querySelector('#joinBtn');
	if (active) btn.onclick = () => go('enroll/join', { id: params.id });
}
