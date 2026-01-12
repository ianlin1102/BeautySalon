/**
 * Notes: 云函数非标业务处理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-10-21 04:00:00
 *
 * ============================================================
 * 双端兼容架构说明（小程序 + HTTP 网页端）
 * ============================================================
 *
 * 【调用格式差异】
 * - 小程序: wx.cloud.callFunction({ data: { route, params: {...} } })
 *   → event = { route, params: { startDate, endDate } }
 *
 * - HTTP 网页: fetch(url, { body: JSON.stringify({ route, startDate, endDate }) })
 *   → event = { path, httpMethod, body: '{"route":"...", "startDate":"..."}' }
 *
 * 【兼容处理层次】
 * 1. app_other.js (本文件): HTTP 请求预处理
 *    - 解析 HTTP body
 *    - 将根级参数转换为 params 格式: { route, params: {...} }
 *
 * 2. framework/client/controller.js: 参数标准化
 *    - _normalizeParams() 兼容两种格式
 *    - 优先使用 event.params，否则提取根级参数
 *
 * 【修改原则】
 * - 不修改小程序代码
 * - 所有兼容逻辑在后端 framework 层处理
 * ============================================================
 */

const httpAuth = require('../middleware/http_auth.js');
const logger = require('../utils/logger.js');

function handlerOther(event) {
	let isOther = false;

	if (!event) return {
		isOther,
		eventX: event
	};

	// ============================================================
	// HTTP 触发器请求处理
	// HTTP 请求的 event 对象包含: path, httpMethod, headers, body 等字段
	// ============================================================
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

			// 标记这是 HTTP 请求
			body._isHttpRequest = true;

			// ============================================================
			// 关键：将 HTTP 请求参数转换为小程序格式
			// HTTP body: { route, startDate, endDate }
			// 转换为: { route, params: { startDate, endDate } }
			// 这样 controller 的 this._request = event.params 就能正确获取参数
			// ============================================================
			const { route, params: existingParams, _httpAdmin, _isHttpRequest, token, PID, ...restParams } = body;

			// 如果 HTTP 请求已经包含 params 对象，直接使用；否则从根级别提取
			const finalParams = (existingParams && Object.keys(existingParams).length > 0)
				? existingParams
				: restParams;

			const eventX = {
				route,
				token,
				PID,
				params: finalParams,
				_httpAdmin,
				_isHttpRequest
			};

			logger.http('HTTP 请求解析完成', {
				route: eventX.route,
				params: eventX.params,
				isAuthenticated: !!eventX._httpAdmin
			});

			// 返回解析后的请求体作为 event
			return {
				isOther: false,
				eventX
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
