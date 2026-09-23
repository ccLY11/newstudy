/** AI 助学：DeepSeek 对话页（模型切换 / 思维链 / 打字机效果 / 预设问题） */
import { api } from '../api.js';
import { esc, toast, confirmBox } from '../ui.js';

const MODELS = [
	{ id: 'deepseek-chat', name: 'DeepSeek V3', desc: '通用对话' },
	{ id: 'deepseek-reasoner', name: 'DeepSeek R1', desc: '深度思考' }
];
const PRESETS = ['什么是丝绸之路？', '介绍一下非物质文化遗产', '普通话发音技巧有哪些？', '推荐三本传统文化书籍'];
const WELCOME = '您好！我是您的AI学习助手，很高兴为您服务。我可以帮助您了解丝绸之路文化、传统文化、古代文学等相关知识。请问有什么可以帮助您的吗？';

const newWelcome = () => ({ id: 'w1', type: 'ai', content: WELCOME, time: Date.now() });

function timeStr(ts) {
	const d = new Date(ts);
	const p = n => (n < 10 ? '0' + n : '' + n);
	return p(d.getHours()) + ':' + p(d.getMinutes());
}

export async function render(root) {
	root.style.padding = '0';

	const state = {
		model: 'deepseek-chat',
		showModel: false,
		chatList: [newWelcome()],
		history: [],           // [{role, content}]，isError 不入
		isLoading: false,
		typingTimer: null,
		typingId: null
	};

	root.innerHTML = `
		<div class="ai-page" style="height:calc(100vh - 46px)">
			<div class="model-bar" id="modelBar">
				<span>当前模型：</span><span class="model-name" id="modelName"></span><span>▾</span>
				<div class="model-dropdown" id="modelDrop" style="display:none"></div>
			</div>
			<div class="chat-list" id="chatList"></div>
			<div class="preset-area">
				<div class="preset-title">快速提问</div>
				<div class="preset-list">
					${PRESETS.map(q => '<span class="preset-item" data-q="' + esc(q) + '">' + esc(q) + '</span>').join('')}
				</div>
			</div>
			<div class="ai-input">
				<input type="text" id="aiInput" placeholder="给DeepSeek发送消息" maxlength="500">
				<span class="clear" id="aiClear">清空</span>
				<button class="send" id="aiSend">发送</button>
			</div>
		</div>
	`;

	const listEl = root.querySelector('#chatList');
	const inputEl = root.querySelector('#aiInput');
	const sendBtn = root.querySelector('#aiSend');
	const modelNameEl = root.querySelector('#modelName');
	const dropEl = root.querySelector('#modelDrop');

	const modelName = id => {
		const m = MODELS.find(x => x.id === id);
		return m ? m.name + '（' + m.desc + '）' : id;
	};

	function drawModelBar() {
		modelNameEl.textContent = modelName(state.model);
		dropEl.style.display = state.showModel ? '' : 'none';
		dropEl.innerHTML = MODELS.map(m => `
			<div class="model-option${m.id === state.model ? ' active' : ''}" data-model="${m.id}">
				<div><div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc)}</div></div>
				<span class="model-check" style="display:${m.id === state.model ? '' : 'none'}">✓</span>
			</div>`).join('');
	}

	function msgHtml(m) {
		const avatar = m.type === 'ai' ? '/assets/img/menu/3.png' : '/assets/img/tabbar/my.png';
		let wrap = '';
		if (m.type === 'ai' && m.reasoning) {
			wrap += '<div class="reasoning-block">'
				+ '<div class="reasoning-toggle" data-mid="' + m.id + '"><span>💭</span><span>思考过程</span><span style="margin-left:auto">' + (m.showReasoning ? '▴' : '▾') + '</span></div>'
				+ '<div class="reasoning-content" style="display:' + (m.showReasoning ? 'block' : 'none') + '">' + esc(m.reasoning) + '</div>'
				+ '</div>';
		}
		wrap += '<div class="bubble' + (m.isError ? ' error-text' : '') + '">' + esc(m.content) + '</div>';
		wrap += '<div class="time">' + timeStr(m.time) + '</div>';
		if (m.type === 'ai' && !m.isError && state.typingId !== m.id) {
			wrap += '<div class="actions" data-copy="' + m.id + '">复制</div>';
		}
		return '<div class="msg ' + (m.type === 'ai' ? 'ai' : 'user') + '" data-mid="' + m.id + '">'
			+ '<div class="avatar"><img src="' + avatar + '" alt=""></div>'
			+ '<div class="bubble-wrap">' + wrap + '</div></div>';
	}

	const loadingHtml = () => `
		<div class="msg ai-loading" id="aiLoading">
			<div class="avatar"><img src="/assets/img/menu/3.png" alt=""></div>
			<div class="bubble-wrap" style="display:flex;align-items:center;gap:10px">
				<div class="dots"><i></i><i></i><i></i></div>
				<span class="lt" style="margin-top:0">${state.model === 'deepseek-reasoner' ? 'R1 深度思考中...' : 'AI正在思考中...'}</span>
			</div>
		</div>`;

	function drawList() {
		listEl.innerHTML = state.chatList.map(msgHtml).join('') + (state.isLoading ? loadingHtml() : '');
	}

	function scrollBottom() { listEl.scrollTop = listEl.scrollHeight; }

	/* ---------- 消息区事件（思维链折叠 / 复制） ---------- */
	listEl.addEventListener('click', e => {
		const toggle = e.target.closest('.reasoning-toggle');
		if (toggle) {
			const m = state.chatList.find(x => x.id === toggle.dataset.mid);
			const c = listEl.querySelector('[data-mid="' + toggle.dataset.mid + '"] .reasoning-content');
			if (m && c) {
				m.showReasoning = !m.showReasoning;
				c.style.display = m.showReasoning ? 'block' : 'none';
				const arrow = toggle.querySelector('span:last-child');
				if (arrow) arrow.textContent = m.showReasoning ? '▴' : '▾';
			}
			return;
		}
		const copyBtn = e.target.closest('[data-copy]');
		if (copyBtn) {
			const m = state.chatList.find(x => x.id === copyBtn.dataset.copy);
			if (!m || !m.content) { toast('内容还在生成中，请稍等'); return; }
			navigator.clipboard.writeText(m.content).then(() => toast('已复制')).catch(() => toast('复制失败'));
		}
	});

	/* ---------- 打字机效果 ---------- */
	function typewrite(m, fullText) {
		const bubble = listEl.querySelector('[data-mid="' + m.id + '"] .bubble');
		if (!bubble) return;
		if (!fullText) {
			m.content = '抱歉，我暂时无法回答您的问题。';
			bubble.textContent = m.content;
			state.typingId = null;
			drawList(); scrollBottom();
			return;
		}
		state.typingId = m.id;
		let i = 0;
		state.typingTimer = setInterval(() => {
			if (!document.body.contains(bubble)) { // 已离开页面
				clearInterval(state.typingTimer);
				state.typingTimer = null; state.typingId = null;
				return;
			}
			i = Math.min(i + 1, fullText.length);
			bubble.innerHTML = esc(fullText.slice(0, i)) + '<span class="cursor">|</span>';
			scrollBottom();
			if (i >= fullText.length) {
				clearInterval(state.typingTimer);
				state.typingTimer = null; state.typingId = null;
				m.content = fullText;
				drawList(); scrollBottom();
			}
		}, 15);
	}

	/* ---------- 发送 ---------- */
	async function send() {
		const text = inputEl.value.trim();
		if (!text) { toast('请输入您的问题'); return; }
		if (state.isLoading) return;

		inputEl.value = '';
		sendBtn.classList.remove('active');
		state.chatList.push({ id: 'u' + Date.now(), type: 'user', content: text, time: Date.now() });
		state.isLoading = true;
		drawList(); scrollBottom();

		let reply = '', reasoning = '', isError = false;
		try {
			const res = await api('ai/chat', { message: text, history: state.history, model: state.model });
			reply = res.reply || '';
			reasoning = res.reasoning || '';
			isError = !!res.isError;
		} catch (e) {
			isError = true;
			reply = '抱歉，我暂时无法回答您的问题，请稍后再试。';
			toast(e.message || '请求失败');
		}

		state.isLoading = false;
		const m = { id: 'a' + Date.now(), type: 'ai', content: '', reasoning, showReasoning: false, isError, time: Date.now() };
		state.chatList.push(m);
		drawList(); scrollBottom();

		if (!isError) {
			state.history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
		}
		typewrite(m, reply);
	}

	/* ---------- 输入区 ---------- */
	inputEl.addEventListener('input', () => {
		sendBtn.classList.toggle('active', inputEl.value.trim() !== '');
	});
	inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
	sendBtn.onclick = send;

	root.querySelector('#aiClear').onclick = async () => {
		const ok = await confirmBox('确认清空', '确定要清空所有对话记录吗？');
		if (!ok) return;
		if (state.typingTimer) { clearInterval(state.typingTimer); state.typingTimer = null; state.typingId = null; }
		state.chatList = [newWelcome()];
		state.history = [];
		state.isLoading = false;
		drawList(); scrollBottom();
	};

	// 预设问题：点击直接发送
	root.querySelectorAll('.preset-item').forEach(el => {
		el.onclick = () => { inputEl.value = el.dataset.q; send(); };
	});

	/* ---------- 模型切换 ---------- */
	root.querySelector('#modelBar').addEventListener('click', e => {
		const opt = e.target.closest('.model-option');
		if (opt) {
			state.model = opt.dataset.model;
			state.showModel = false;
			drawModelBar();
			return;
		}
		state.showModel = !state.showModel;
		drawModelBar();
	});
	// 点击模型栏以外区域收起下拉
	root.querySelector('.ai-page').addEventListener('click', e => {
		if (!e.target.closest('.model-bar') && state.showModel) {
			state.showModel = false;
			drawModelBar();
		}
	});

	drawModelBar();
	drawList();
	scrollBottom();
}
