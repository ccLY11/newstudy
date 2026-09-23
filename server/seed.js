/**
 * 种子数据：首次启动时自动生成（对应小程序框架自动初始化 8 个 bx_ 集合的逻辑）
 * 支持 JSON 文件 和 MongoDB 双模式
 */
const db = require('./db');

const now = () => Math.floor(Date.now() / 1000);
const day = 86400;

// 分类配置（与小程序 project_setting.js 一致）
const NEWS_CATE = [
	{ id: 1, title: '公告通知' },
	{ id: 2, title: '丝路小程序介绍' },
	{ id: 3, title: '文化教育' },
	{ id: 4, title: '安全教育' }
];

const SEED = {};

SEED.admin = () => ([
	{
		_id: 'admin_1', ADMIN_NAME: 'admin', ADMIN_PASSWORD: 'e10adc3949ba59abbe56e057f20f883e', // 123456
		ADMIN_STATUS: 1, ADMIN_TYPE: 1, ADMIN_PHONE: '', ADMIN_DESC: '超级管理员',
		ADMIN_LOGIN_CNT: 0, ADMIN_LOGIN_TIME: 0
	},
	{
		_id: 'admin_2', ADMIN_NAME: 'editor', ADMIN_PASSWORD: 'e10adc3949ba59abbe56e057f20f883e',
		ADMIN_STATUS: 1, ADMIN_TYPE: 0, ADMIN_PHONE: '', ADMIN_DESC: '内容编辑',
		ADMIN_LOGIN_CNT: 0, ADMIN_LOGIN_TIME: 0
	}
]);

SEED.user = () => ([
	{
		_id: 'user_1', USER_NAME: '张三', USER_MOBILE: '13800000001', USER_PASSWORD: '',
		USER_STATUS: 1, USER_CHECK_REASON: '', USER_FORMS: { sex: '男', birth: '2003-05-12', address: '辽宁省阜新市中华路47号' },
		USER_LOGIN_CNT: 3, USER_LOGIN_TIME: now() - 3600, USER_ADD_TIME: now() - 30 * day, USER_OBJ: { desc: '' }
	},
	{
		_id: 'user_2', USER_NAME: '李四', USER_MOBILE: '13800000002', USER_PASSWORD: '',
		USER_STATUS: 1, USER_CHECK_REASON: '', USER_FORMS: { sex: '女', birth: '2004-11-03', address: '辽宁省葫芦岛市龙湾南大街1号' },
		USER_LOGIN_CNT: 1, USER_LOGIN_TIME: now() - 5 * day, USER_ADD_TIME: now() - 20 * day, USER_OBJ: { desc: '' }
	},
	{
		_id: 'user_3', USER_NAME: '王五', USER_MOBILE: '13800000003', USER_PASSWORD: '',
		USER_STATUS: 0, USER_CHECK_REASON: '', USER_FORMS: { sex: '男', birth: '2002-08-21', address: '辽宁省沈阳市和平区文化路10号' },
		USER_LOGIN_CNT: 1, USER_LOGIN_TIME: now() - 10 * day, USER_ADD_TIME: now() - 10 * day, USER_OBJ: { desc: '' }
	}
]);

SEED.news = () => {
	const mk = (id, cateId, cateName, tab, title, date, vouch, content, pic) => ({
		_id: 'news_' + id,
		NEWS_TITLE: title, NEWS_DESC: content.substring(0, 40), NEWS_STATUS: 1,
		NEWS_CATE_ID: cateId, NEWS_CATE_NAME: NEWS_CATE[cateId - 1].title, NEWS_TAB: tab,
		NEWS_ORDER: 0, NEWS_VOUCH: vouch, NEWS_CONTENT: [{ type: 'text', val: content }],
		NEWS_PIC: pic ? [pic] : [], NEWS_QR: '', NEWS_VIEW_CNT: Math.floor(Math.random() * 200) + 20,
		NEWS_FORMS: [], NEWS_OBJ: {}, NEWS_ADD_TIME: Math.floor(new Date(date).getTime() / 1000)
	});

	const IMG = {
		notice: '/assets/img/news/cate-notice.jpg',
		hall: '/assets/img/news/cate-hall.jpg',
		heritage: '/assets/img/news/cate-heritage.jpg',
		training: '/assets/img/news/cate-training.jpg',
		silk: '/assets/img/silk-road/history.jpg'
	};

	return [
		mk(101, 3, '文化教育', '培训通知', '书法培训班招生通知', '2024-01-22', 1, '书法培训班现开始招生，课程包括楷书、行书、草书等，适合各年龄段学员。学费优惠中，名额有限，欢迎报名。', IMG.training),
		mk(102, 1, '公告通知', '重要通知', '关于文化馆开放时间调整的通知', '2024-01-20', 1, '根据工作需要，文化馆开放时间调整为周一至周日 9:00-21:00，请广大市民合理安排参观时间。', IMG.notice),
		mk(103, 2, '丝路小程序介绍', '活动通知', '丝绸之路文化展览即将开幕', '2024-01-18', 1, '丝绸之路文化展览将于1月25日正式开幕，展出珍贵文物和艺术品，欢迎广大市民前来参观。展览为期一个月。', IMG.silk),
		mk(104, 1, '公告通知', '政策通知', '文化馆管理制度更新', '2024-01-16', 0, '文化馆管理制度已更新，新制度将于2月1日正式实施，请相关人员认真学习并严格执行。', IMG.hall),
		mk(105, 3, '文化教育', '活动通知', '传统文化讲座系列安排', '2024-01-14', 0, '每周六下午2点将举办传统文化讲座，邀请知名学者分享中华文化精髓，免费参加，场地有限需提前预约。', IMG.heritage),
		mk(106, 3, '文化教育', '培训通知', '非遗传承人培训计划启动', '2024-01-12', 1, '为传承非物质文化遗产，将举办非遗传承人培训，培养新一代传承人。报名截止1月30日。', IMG.heritage),
		mk(107, 1, '公告通知', '重要通知', '文化馆疫情防控措施公告', '2024-01-10', 0, '为保障广大市民健康安全，文化馆将继续严格执行疫情防控措施，请配合工作人员进行体温检测和健康码查验。', IMG.notice),
		mk(108, 1, '公告通知', '政策通知', '文物保护政策解读会议通知', '2024-01-08', 0, '最新文物保护政策已发布，文化馆将于1月15日下午2点组织政策解读会议，请相关人员准时参加。', IMG.hall),
		mk(109, 1, '公告通知', '活动通知', '春节文化活动预告', '2024-01-06', 0, '春节期间将举办丰富多彩的文化活动，包括传统手工艺展示、民俗表演、灯谜竞猜等，欢迎全家参与。', IMG.training),
		mk(110, 3, '文化教育', '培训通知', '文化志愿者培训通知', '2024-01-04', 0, '文化志愿者培训将于下月开始，培训内容包括文化知识、服务技能、应急处理等，欢迎热心市民报名。', IMG.training),
		mk(111, 1, '公告通知', '重要通知', '文化馆设施维护通知', '2024-01-02', 0, '文化馆将于本周进行设施维护，部分展厅可能临时关闭，给您带来的不便敬请谅解。具体关闭时间见现场公告。', IMG.hall),
		mk(112, 1, '公告通知', '政策通知', '文化产业发展扶持政策', '2023-12-28', 0, '支持文化产业发展的相关政策已出台，文化馆将积极落实相关政策，为文化企业提供服务和支持。', IMG.notice),
		mk(113, 2, '丝路小程序介绍', '活动通知', '「丝路文化」小程序功能上线公告', '2023-12-25', 1, '丝路文化小程序全新上线，涵盖丝绸之路介绍、文化教育、普通话教学、在线报名、AI助学等模块，欢迎大家体验使用。', IMG.silk),
		mk(114, 4, '安全教育', '政策通知', '冬季消防安全提示', '2023-12-22', 0, '冬季天干物燥，是火灾高发期。请广大市民注意用火用电安全，离开场馆前请确认电源已关闭，共同维护场馆安全环境。', IMG.hall),
		mk(115, 4, '安全教育', '活动通知', '安全知识教育培训活动通知', '2023-12-20', 0, '为进一步提高全员安全意识，本馆定于下周三下午组织消防安全知识培训，包含灭火器实操演练，请全体员工准时参加。', IMG.training)
	];
};

SEED.enroll = () => {
	const start = now() - day, end = now() + 30 * day;
	return [
		{
			_id: 'enroll_1', ENROLL_TITLE: '普通话教学训练班', ENROLL_STATUS: 1, ENROLL_CATE_ID: 1, ENROLL_CATE_NAME: '普通话教学',
			ENROLL_CANCEL_SET: 1, ENROLL_EDIT_SET: 1, ENROLL_CHECK_SET: 0, ENROLL_MAX_CNT: 50,
			ENROLL_START: start, ENROLL_END: end, ENROLL_ORDER: 0, ENROLL_VOUCH: 1,
			ENROLL_FORMS: [
				{ mark: 'cover', title: '封面图片', type: 'image', val: ['/assets/img/news/cate-training.jpg'] },
				{ mark: 'desc', title: '简介', type: 'textarea', val: '面向社会的普通话发音训练课程，从声母韵母到朗读技巧，帮助学员说好标准普通话。' },
				{ mark: 'intro', title: '详细介绍', type: 'content', val: [{ type: 'text', val: '本班由资深普通话测试员授课，每周三、周五晚开课，共 12 课时。课程内容包括：声韵调基础训练、轻声儿化、命题说话、朗读作品精讲等。结业后可参加普通话水平测试模拟。' }] }
			],
			ENROLL_OBJ: {}, ENROLL_QR: '', ENROLL_VIEW_CNT: 156, ENROLL_JOIN_CNT: 2, ENROLL_ADD_TIME: now() - 10 * day
		},
		{
			_id: 'enroll_2', ENROLL_TITLE: '实战检验 · 朗诵比赛', ENROLL_STATUS: 1, ENROLL_CATE_ID: 2, ENROLL_CATE_NAME: '实战检验',
			ENROLL_CANCEL_SET: 1, ENROLL_EDIT_SET: 0, ENROLL_CHECK_SET: 1, ENROLL_MAX_CNT: 30,
			ENROLL_START: start, ENROLL_END: end, ENROLL_ORDER: 0, ENROLL_VOUCH: 1,
			ENROLL_FORMS: [
				{ mark: 'cover', title: '封面图片', type: 'image', val: ['/assets/img/news/cate-heritage.jpg'] },
				{ mark: 'desc', title: '简介', type: 'textarea', val: '以赛促学，检验普通话学习成果。报名需审核，通过后将电话通知参赛时间与地点。' },
				{ mark: 'intro', title: '详细介绍', type: 'content', val: [{ type: 'text', val: '比赛设一、二、三等奖及优秀奖。参赛内容为自选作品朗诵（3 分钟以内），评委将从语音规范、表达技巧、仪态形象三方面评分。本报名需管理员审核通过后方可参赛。' }] }
			],
			ENROLL_OBJ: {}, ENROLL_QR: '', ENROLL_VIEW_CNT: 98, ENROLL_JOIN_CNT: 1, ENROLL_ADD_TIME: now() - 8 * day
		},
		{
			_id: 'enroll_3', ENROLL_TITLE: 'AI 助学 一对一辅导', ENROLL_STATUS: 1, ENROLL_CATE_ID: 3, ENROLL_CATE_NAME: 'AI助学',
			ENROLL_CANCEL_SET: 1, ENROLL_EDIT_SET: 1, ENROLL_CHECK_SET: 0, ENROLL_MAX_CNT: 0,
			ENROLL_START: start, ENROLL_END: end, ENROLL_ORDER: 0, ENROLL_VOUCH: 0,
			ENROLL_FORMS: [
				{ mark: 'cover', title: '封面图片', type: 'image', val: ['/assets/img/menu/3.png'] },
				{ mark: 'desc', title: '简介', type: 'textarea', val: 'AI 智能助学通道，提交报名后可随时在「AI助学」页面与 AI 助教对话学习。' },
				{ mark: 'intro', title: '详细介绍', type: 'content', val: [{ type: 'text', val: '报名成功后，可在小程序「AI 助学」模块随时向 AI 助教提问，涵盖语言学习、文化知识等内容，支持 V3 通用模型与 R1 深度思考模型切换。' }] }
			],
			ENROLL_OBJ: {}, ENROLL_QR: '', ENROLL_VIEW_CNT: 210, ENROLL_JOIN_CNT: 0, ENROLL_ADD_TIME: now() - 6 * day
		},
		{
			_id: 'enroll_4', ENROLL_TITLE: '我要报名 · 文化志愿者', ENROLL_STATUS: 1, ENROLL_CATE_ID: 4, ENROLL_CATE_NAME: '我要报名',
			ENROLL_CANCEL_SET: 1, ENROLL_EDIT_SET: 1, ENROLL_CHECK_SET: 0, ENROLL_MAX_CNT: 0,
			ENROLL_START: start, ENROLL_END: end, ENROLL_ORDER: 0, ENROLL_VOUCH: 0,
			ENROLL_FORMS: [
				{ mark: 'cover', title: '封面图片', type: 'image', val: ['/assets/img/news/cate-notice.jpg'] },
				{ mark: 'desc', title: '简介', type: 'textarea', val: '文化馆长期招募文化志愿者，参与讲解引导、活动组织、非遗宣传等工作。' },
				{ mark: 'intro', title: '详细介绍', type: 'content', val: [{ type: 'text', val: '志愿者要求：热心公益、语言表达良好，每月至少服务 2 次。服务内容包括展厅讲解、观众引导、活动协助等，服务满 40 小时可获志愿服务证书。' }] }
			],
			ENROLL_OBJ: {}, ENROLL_QR: '', ENROLL_VIEW_CNT: 87, ENROLL_JOIN_CNT: 0, ENROLL_ADD_TIME: now() - 5 * day
		}
	];
};

SEED.enroll_join = () => ([
	{
		_id: 'join_1', ENROLL_JOIN_ENROLL_ID: 'enroll_1', ENROLL_JOIN_USER_ID: 'user_1', ENROLL_JOIN_ENROLL_TITLE: '普通话教学训练班',
		ENROLL_JOIN_FORMS: [
			{ mark: 'name', title: '姓名', type: 'text', val: '张三' },
			{ mark: 'sex', title: '性别', type: 'select', val: '男' },
			{ mark: 'birth', title: '出生日期', type: 'date', val: '2003-05-12' },
			{ mark: 'phone', title: '电话号码', type: 'mobile', val: '13800000001' },
			{ mark: 'address', title: '家庭住址', type: 'textarea', val: '辽宁省阜新市中华路47号' }
		],
		ENROLL_JOIN_STATUS: 1, ENROLL_JOIN_REASON: '', ENROLL_JOIN_LAST_TIME: now() - 3 * day, ENROLL_JOIN_ADD_TIME: now() - 3 * day
	},
	{
		_id: 'join_2', ENROLL_JOIN_ENROLL_ID: 'enroll_1', ENROLL_JOIN_USER_ID: 'user_2', ENROLL_JOIN_ENROLL_TITLE: '普通话教学训练班',
		ENROLL_JOIN_FORMS: [
			{ mark: 'name', title: '姓名', type: 'text', val: '李四' },
			{ mark: 'sex', title: '性别', type: 'select', val: '女' },
			{ mark: 'birth', title: '出生日期', type: 'date', val: '2004-11-03' },
			{ mark: 'phone', title: '电话号码', type: 'mobile', val: '13800000002' },
			{ mark: 'address', title: '家庭住址', type: 'textarea', val: '辽宁省葫芦岛市龙湾南大街1号' }
		],
		ENROLL_JOIN_STATUS: 0, ENROLL_JOIN_REASON: '', ENROLL_JOIN_LAST_TIME: now() - 2 * day, ENROLL_JOIN_ADD_TIME: now() - 2 * day
	},
	{
		_id: 'join_3', ENROLL_JOIN_ENROLL_ID: 'enroll_2', ENROLL_JOIN_USER_ID: 'user_1', ENROLL_JOIN_ENROLL_TITLE: '实战检验 · 朗诵比赛',
		ENROLL_JOIN_FORMS: [
			{ mark: 'name', title: '姓名', type: 'text', val: '张三' },
			{ mark: 'sex', title: '性别', type: 'select', val: '男' },
			{ mark: 'birth', title: '出生日期', type: 'date', val: '2003-05-12' },
			{ mark: 'phone', title: '电话号码', type: 'mobile', val: '13800000001' },
			{ mark: 'address', title: '家庭住址', type: 'textarea', val: '辽宁省阜新市中华路47号' }
		],
		ENROLL_JOIN_STATUS: 0, ENROLL_JOIN_REASON: '', ENROLL_JOIN_LAST_TIME: now() - 1 * day, ENROLL_JOIN_ADD_TIME: now() - 1 * day
	}
]);

SEED.fav = () => ([
	{
		_id: 'fav_1', FAV_USER_ID: 'user_1', FAV_TITLE: '丝绸之路文化展览即将开幕',
		FAV_TYPE: 'news', FAV_OID: 'news_103', FAV_PATH: '#/news/detail?id=news_103', FAV_ADD_TIME: now() - 2 * day
	},
	{
		_id: 'fav_2', FAV_USER_ID: 'user_1', FAV_TITLE: '普通话教学训练班',
		FAV_TYPE: 'enroll', FAV_OID: 'enroll_1', FAV_PATH: '#/enroll/detail?id=enroll_1', FAV_ADD_TIME: now() - 1 * day
	}
]);

SEED.log = () => ([
	{ _id: 'log_1', LOG_ADMIN_NAME: 'admin', LOG_CONTENT: '修改资讯「书法培训班招生通知」', LOG_TYPE: 'content', LOG_ADD_TIME: now() - day },
	{ _id: 'log_2', LOG_ADMIN_NAME: 'admin', LOG_CONTENT: '登录系统', LOG_TYPE: 'login', LOG_ADD_TIME: now() - 2 * day }
]);

SEED.setup = () => ([
	{
		key: 'SETUP_CONTENT_ABOUT',
		content: [
			{ type: 'text', val: '文化馆是面向社会公众开放的公共文化服务机构，承担着群众文化活动组织、非物质文化遗产保护传承、公益艺术培训等职能。' },
			{ type: 'text', val: '本平台提供公告通知、活动报名、文化课程学习、AI 智能助学等线上服务，欢迎广大市民注册使用。' },
			{ type: 'text', val: '地址：辽宁省阜新市海州区文化路 1 号' },
			{ type: 'text', val: '服务时间：周一至周日 9:00 - 21:00' }
		]
	},
	{ key: 'SETUP_HOME_VOUCH', content: [] }
]);

/** 启动时检查全部集合，缺失的生成种子数据（异步，支持 MongoDB） */
async function initAll() {
	for (const key of Object.keys(SEED)) {
		const has = await db.exists(key);
		if (!has) {
			await db.insertMany(key, SEED[key]());
			console.log('[seed] 初始化集合:', key);
		}
	}
}

/** 同步初始化单个集合（JSON 模式下 db.list 内部调用） */
function initSync(name) {
	const fn = SEED[name];
	if (!fn) return;
	const fs = require('fs');
	const path = require('path');
	const file = path.join(db.DATA_DIR, name + '.json');
	if (!fs.existsSync(file)) {
		fs.mkdirSync(db.DATA_DIR, { recursive: true });
		fs.writeFileSync(file, JSON.stringify(fn(), null, 1), 'utf8');
		console.log('[seed] 初始化集合:', name);
	}
}

module.exports = { initAll, initSync };
