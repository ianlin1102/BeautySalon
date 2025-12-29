/**
 * Notes: 云函数非标业务处理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-10-21 04:00:00
 */

const httpAuth = require('../middleware/http_auth.js');
const logger = require('../utils/logger.js');

function handlerOther(event) {
	let isOther = false;

	if (!event) return {
		isOther,
		eventX: event
	};

	// HTTP 触发器请求处理
	// HTTP 请求的 event 对象包含: path, httpMethod, headers, body 等字段
	if (event.path !== undefined || event.httpMethod !== undefined) {
		logger.forceInfo('检测到 HTTP 触发器请求', {
			path: event.path,
			method: event.httpMethod,
			hasBody: !!event.body,
			headers: event.headers
		});

		try {
			// 解析 HTTP 请求体
			let body = {};
			if (event.body) {
				// HTTP 请求体通常是字符串，需要解析为 JSON
				body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

				logger.http('HTTP 请求体解析成功', {
					route: body.route,
					hasParams: Object.keys(body).length > 1,
					bodyKeys: Object.keys(body)
				});
			} else {
				logger.warn('HTTP 请求体为空');
			}

			// HTTP 认证检查（如果路由需要认证）
			if (body.route && httpAuth.requiresAuth(body.route)) {
				logger.info('路由需要认证', { route: body.route });
				const authResult = httpAuth.verifyHttpAuth(event);

				if (!authResult.success) {
					logger.forceError('HTTP 认证失败', {
						route: body.route,
						error: authResult.error
					});

					// 返回认证失败的特殊标记
					return {
						isOther: true,
						eventX: {
							route: '__http_auth_failed__',
							error: authResult.error
						}
					};
				}

				// 将认证信息添加到 body 中，供后续业务逻辑使用
				body._httpAdmin = {
					adminId: authResult.adminId,
					adminName: authResult.adminName,
					adminType: authResult.adminType
				};

				logger.success('HTTP 认证成功', {
					adminName: authResult.adminName,
					adminType: authResult.adminType
				});
			}

			// 标记这是 HTTP 请求（可能需要特殊处理）
			body._isHttpRequest = true;

			logger.http('HTTP 请求解析完成', {
				route: body.route,
				isAuthenticated: !!body._httpAdmin
			});

			// 返回解析后的请求体作为 event
			return {
				isOther: false,
				eventX: body
			};
		} catch (err) {
			logger.forceError('解析 HTTP 请求失败', {
				errorMessage: err.message,
				errorStack: err.stack,
				rawBody: event.body
			});

			// 解析失败时返回错误标记
			return {
				isOther: true,
				eventX: {
					route: '__http_parse_failed__',
					error: err.message
				}
			};
		}
	}

	// 公众号事件处理
	if (event['FromUserName'] && event['MsgType']) {
		logger.info('检测到公众号事件', {
			fromUser: event['FromUserName'],
			msgType: event['MsgType']
		});

		let ret = {
			route: 'oa/serve',
			params: event
		}
		return {
			isOther: true,
			eventX: ret
		};
	}

	// 小程序请求（默认情况）
	logger.forceInfo('检测到小程序请求', {
		route: event.route,
		hasOpenid: !!event.openid,
		eventKeys: Object.keys(event)
	});

	return {
		isOther,
		eventX: event
	};
}


module.exports = {
	handlerOther,
}
