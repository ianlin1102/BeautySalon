/**
 * Notes: 云函数业务主逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-09-05 04:00:00 
 */
const util = require('../utils/util.js');
const cloudBase = require('../cloud/cloud_base.js');
const timeUtil = require('../utils/time_util.js');
const appUtil = require('./app_util.js');
const appCode = require('./app_code.js');
const appOther = require('./app_other.js');
const config = require('../../config/config.js');
const routes = require('config/route.js');

async function app(event, context) {

	// 非标业务处理
	let {
		eventX,
		isOther
	} = appOther.handlerOther(event);
	event = eventX;

	// 取得openid
	const cloud = cloudBase.getCloud();
	const wxContext = cloud.getWXContext();
	let r = '';
	try {

		if (!util.isDefined(event.route)) {
			showEvent(event);
			console.error('Route Not Defined');
			return appUtil.handlerSvrErr();
		}

		r = event.route.toLowerCase();
		if (!r.includes('/')) {
			showEvent(event);
			console.error('Route Format error[' + r + ']');
			return appUtil.handlerSvrErr();
		}

		// 路由不存在
		if (!util.isDefined(routes[r])) {
			showEvent(event);
			console.error('Route [' + r + '] Is Not Exist');
			return appUtil.handlerSvrErr();
		}

		let routesArr = routes[r].split('@');

		let controllerName = routesArr[0];
		let actionName = routesArr[1];

		// 事前处理
		if (actionName.includes('#')) {
			let actionNameArr = actionName.split('#');
			actionName = actionNameArr[0];
			if (actionNameArr[1] && config.IS_DEMO) {
				console.log('###演示版事前处理, APP Before = ' + actionNameArr[1]);
				return beforeApp(actionNameArr[1]);
			}
		}

		console.log('');
		console.log('');
		let time = timeUtil.time('Y-M-D h:m:s');
		let timeTicks = timeUtil.time();
	// 获取 openId - 支持小程序、HTTP 请求和 CloudBase JS SDK
	let openId = wxContext.OPENID;  // 小程序请求的默认值
	let requestType = 'MINI_PROGRAM';

	// HTTP 请求的 openId 处理
	if (event._isHttpRequest) {
		requestType = 'HTTP';
		if (event._httpAdmin && event._httpAdmin.adminId) {
			// 已认证的 HTTP 请求：使用管理员 ID 作为 openId
			openId = event._httpAdmin.adminId;
			requestType = 'HTTP_AUTH';
			console.log(`【HTTP 认证】管理员: ${event._httpAdmin.adminName}, adminId=${openId}`);
		} else if (event.token) {
			// 公开的 HTTP 请求但有 token：使用前端传入的用户 ID
			openId = event.token;
			requestType = 'HTTP_USER';
			console.log(`【HTTP 用户】使用前端传入的 token: ${openId}`);
		} else {
			// 公开的 HTTP 请求且无 token：使用 guest ID
			openId = 'http-guest';
			requestType = 'HTTP_PUBLIC';
			console.log(`【HTTP 公开】使用 guest ID: ${openId}`);
		}
	}

	// CloudBase JS SDK / Web 端调用：优先使用前端传入的 token
	// 小程序端也会传 token（用户 ID），这里统一处理
	if (!openId && event.token) {
		openId = event.token;
		requestType = 'WEB_SDK';
		console.log(`【Web SDK】使用前端传入的 token: ${openId}`);
	}

	// 最终兜底：如果还是没有 openId，使用 guest
	if (!openId) {
		openId = 'anonymous-guest';
		requestType = 'ANONYMOUS';
		console.log(`【匿名】使用 guest ID: ${openId}`);
	}

	console.log('▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤');
	console.log(`【↘${time} ENV (${config.CLOUD_ID})】【Request Base↘↘↘】\n【↘Route =***${r}】\n【↘Controller = ${controllerName}】\n【↘Action = ${actionName}】\n【↘Type = ${requestType}】\n【↘OPENID = ${openId}】`);



		// 引入逻辑controller 
		controllerName = controllerName.toLowerCase().trim();
		const ControllerClass = require('project/controller/' + controllerName + '.js');
		const controller = new ControllerClass(r, openId, event);

		// 调用方法    
		await controller['initSetup']();
		let result = await controller[actionName]();

		// 返回值处理
		if (isOther) {
			// 非标处理
			return result;
		} else {
			if (!result)
				result = appUtil.handlerSucc(r); // 无数据返回
			else
				result = appUtil.handlerData(result, r); // 有数据返回
		}


		console.log('------');
		time = timeUtil.time('Y-M-D h:m:s');
		timeTicks = timeUtil.time() - timeTicks;
		console.log(`【${time}】【Return Base↗↗↗】\n【↗Route =***${r}】\n【↗Duration = ${timeTicks}ms】\n【↗↗OUT DATA】= `, result);
		console.log('▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦');
		console.log('');
		console.log('');

		return result;


	} catch (ex) {
		const log = cloud.logger();

		console.log('------');
		time = timeUtil.time('Y-M-D h:m:s');
		console.error(`【${time}】【Return Base↗↗↗】\n【↗Route = ${r}】\Exception MSG = ${ex.message}, CODE=${ex.code}`);

		// 系统级错误定位调试
		if (config.TEST_MODE && ex.name != 'AppError') throw ex;

		console.log('▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦');
		console.log('');
		console.log('');

		if (ex.name == 'AppError') {
			log.warn({
				route: r,
				errCode: ex.code,
				errMsg: ex.message
			});
			// 自定义error处理
			return appUtil.handlerAppErr(ex.message, ex.code);
		} else {
			//console.log(ex); 
			log.error({
				route: r,
				errCode: ex.code,
				errMsg: ex.message,
				errStack: ex.stack
			});


			// 系统error
			return appUtil.handlerSvrErr();
		}
	}
}

// 事前处理
function beforeApp(method) {
	switch (method) {
		case 'noDemo': {
			return appUtil.handlerAppErr('本系统仅为客户体验演示，后台提交的操作均不生效！如有需要请联系作者微信cclinux0730', appCode.LOGIC);
		}
	}
	console.error('事前处理, Method Not Find = ' + method);
}

// 展示当前输入数据
function showEvent(event) {
	console.log(event);
}

module.exports = {
	app
}