/**
 * 红色文化馆网页版 · Node.js 后端（零依赖）
 * 静态托管 web/ + 提供 /api 接口 + DeepSeek AI 代理
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const seed = require('./seed');
const api = require('./api');

const WEB_DIR = path.join(__dirname, '..', 'web');

// 首次启动初始化种子数据
seed.initAll();

const MIME = {
	'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
	'.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
	'.woff': 'font/woff', '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
	let file = decodeURIComponent(pathname);
	if (file === '/' || file === '') file = '/index.html';
	const full = path.join(WEB_DIR, file);
	// 防目录穿越
	if (!full.startsWith(WEB_DIR)) {
		res.writeHead(403); res.end('Forbidden'); return;
	}
	fs.stat(full, (err, stat) => {
		if (err || !stat.isFile()) {
			// SPA 兜底：未知路径回首页
			const fallback = path.join(WEB_DIR, 'index.html');
			fs.readFile(fallback, (e2, data) => {
				if (e2) { res.writeHead(404); res.end('Not Found'); return; }
				res.writeHead(200, { 'Content-Type': MIME['.html'] });
				res.end(data);
			});
			return;
		}
		const ext = path.extname(full).toLowerCase();
		const noCacheExts = ['.html', '.css', '.js', '.json'];
		const contentType = MIME[ext] || 'application/octet-stream';
		const cacheControl = noCacheExts.includes(ext) ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600';
		const total = stat.size;
		const range = req.headers.range;

		if (range) {
			// 支持 Range 请求（视频/音频播放必需）
			const match = /bytes=(\d*)-(\d*)/.exec(range);
			let start = match && match[1] ? parseInt(match[1], 10) : 0;
			let end = match && match[2] ? parseInt(match[2], 10) : total - 1;
			if (start >= total || end >= total) {
				res.writeHead(416, { 'Content-Range': `bytes */${total}` });
				res.end(); return;
			}
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${total}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': end - start + 1,
				'Content-Type': contentType,
				'Cache-Control': cacheControl
			});
			fs.createReadStream(full, { start, end }).pipe(res);
		} else {
			res.writeHead(200, {
				'Content-Type': contentType,
				'Content-Length': total,
				'Accept-Ranges': 'bytes',
				'Cache-Control': cacheControl
			});
			fs.createReadStream(full).pipe(res);
		}
	});
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, 'http://localhost');
	const pathname = url.pathname;

	if (pathname.startsWith('/api/')) {
		// 收集请求体
		let body = '';
		req.on('data', c => { body += c; if (body.length > 2 * 1024 * 1024) req.destroy(); });
		req.on('end', async () => {
			let json = {};
			try { json = body ? JSON.parse(body) : {}; } catch (e) { }
			const r = await api.dispatch(pathname, json, req.headers['token'] || '');
			res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
			res.end(JSON.stringify(r));
		});
		return;
	}

	serveStatic(req, res, pathname);
});

server.listen(config.port, () => {
	console.log('========================================');
	console.log('  红色文化馆网页版已启动');
	console.log('  用户端:  http://localhost:' + config.port);
	console.log('  管理后台: http://localhost:' + config.port + '/admin.html');
	console.log('  默认管理员: admin / 123456');
	console.log('========================================');
});
