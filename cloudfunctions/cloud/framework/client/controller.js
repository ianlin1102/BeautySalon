/**
 * Notes: 基础控制器
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-09-05 04:00:00
 *
 * 双端兼容说明：
 * - 小程序调用: { route, params: {...} } → params 在 event.params 中
 * - HTTP 调用: { route, param1, param2 } → params 在 event 根级别（由 app_other.js 转换）
 */
class Controller {

	constructor(route, openId, event) {
		this._route = route; // 路由
		this._openId = openId; //用户身份
		this._event = event; // 所有参数

		// 双端兼容：参数标准化
		// 优先使用 event.params（小程序格式和已转换的 HTTP 格式）
		// 如果 params 不存在或为空，则提取 event 根级别的参数（兼容未转换的格式）
		this._request = this._normalizeParams(event);
	}

	/**
	 * 参数标准化处理
	 * 兼容小程序和 HTTP 两种调用方式
	 */
	_normalizeParams(event) {
		// 1. 如果 params 存在且有内容，直接使用（小程序格式）
		if (event.params && Object.keys(event.params).length > 0) {
			return event.params;
		}

		// 2. 否则从 event 根级别提取参数（排除系统字段）
		const systemFields = [
			'route', 'token', 'PID', 'openid', 'params',
			'_isHttpRequest', '_httpAdmin',
			// HTTP 触发器字段
			'path', 'httpMethod', 'headers', 'body', 'queryStringParameters'
		];

		const params = {};
		for (const key in event) {
			if (!systemFields.includes(key) && event.hasOwnProperty(key)) {
				params[key] = event[key];
			}
		}

		return params;
	}
}

module.exports = Controller;