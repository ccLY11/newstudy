/**
 * DeepSeek AI 服务（从云函数 ai_service.js 移植，仅存服务端）
 */
const https = require('https');

// config.json 为本地可选配置（已 gitignore），云端通过环境变量注入
let config = {};
try { config = require('./config.json'); } catch (e) { }

// 优先级：环境变量 > config.json > 内置默认值
const AI_CONFIG = {
	apiKey: process.env.DEEPSEEK_API_KEY || (config.ai && config.ai.apiKey) || '',
	defaultModel: process.env.DEEPSEEK_MODEL || (config.ai && config.ai.defaultModel) || 'deepseek-chat',
	maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || (config.ai && config.ai.maxTokens) || 2000,
	temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE) || (config.ai && config.ai.temperature) || 0.7
};
const SYSTEM_PROMPT = '你是一个专业的文化教育AI助手，专门帮助用户了解丝绸之路文化、传统文化、古代文学等相关知识。请用简洁明了的语言回答用户问题，回答要准确、有用、友好。';

/** AI 对话（支持多轮上下文），返回 {reply, reasoning, model} */
function aiChat(params) {
	let message = params.message;
	let history = params.history || [];
	let model = params.model || AI_CONFIG.defaultModel;

	if (!message || String(message).trim() === '') {
		throw new Error('请输入您的问题');
	}

	// 保留最近 20 条历史
	const MAX_HISTORY = 20;
	if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

	let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
	for (let item of history) {
		if (item && item.role && item.content) messages.push({ role: item.role, content: item.content });
	}
	messages.push({ role: 'user', content: message });

	return callDeepSeek(messages, model).catch(error => {
		console.error('[ai] 调用失败:', error.message);
		return { reply: '【DeepSeek 调用失败】' + (error.message || '未知错误'), isError: true, model };
	});
}

function callDeepSeek(messages, model) {
	const postData = JSON.stringify({
		model: model,
		messages: messages,
		max_tokens: AI_CONFIG.maxTokens,
		temperature: AI_CONFIG.temperature,
		stream: false
	});

	return new Promise((resolve, reject) => {
		const req = https.request({
			hostname: 'api.deepseek.com',
			path: '/chat/completions',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + AI_CONFIG.apiKey,
				'Content-Length': Buffer.byteLength(postData)
			}
		}, (res) => {
			let data = '';
			res.on('data', chunk => { data += chunk; });
			res.on('end', () => {
				if (res.statusCode < 200 || res.statusCode >= 300) {
					reject(new Error('HTTP ' + res.statusCode + ' 响应: ' + data.substring(0, 300)));
					return;
				}
				try {
					const result = JSON.parse(data);
					if (result.choices && result.choices[0] && result.choices[0].message) {
						const msg = result.choices[0].message;
						resolve({
							reply: msg.content || '',
							reasoning: msg.reasoning_content || '', // R1 思维链
							model: model
						});
					} else {
						reject(new Error('响应格式错误: ' + data.substring(0, 300)));
					}
				} catch (e) {
					reject(new Error('响应解析失败: ' + e.message));
				}
			});
		});

		req.on('error', e => reject(new Error('请求失败: ' + e.message)));
		req.setTimeout(60000, () => req.destroy(new Error('请求超时（60s）')));
		req.write(postData);
		req.end();
	});
}

module.exports = { aiChat };
