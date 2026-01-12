const application = require('./framework/core/application.js');

// 云函数入口函数
exports.main = async (event, context) => {
	// 生成请求 ID 用于追踪
	const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	// 识别请求类型
	const isHttpRequest = event.path !== undefined || event.httpMethod !== undefined;
	const requestType = isHttpRequest ? 'HTTP' : '小程序';

	try {
		// 简单的 console 日志
		console.log('🚀🚀🚀 云函数请求开始 🚀🚀🚀');
		console.error('🚀🚀🚀 云函数请求开始 🚀🚀🚀');  // 用 error 确保显示
		console.log(`请求类型: ${requestType}, requestId: ${requestId}`);
		console.error(`请求类型: ${requestType}, requestId: ${requestId}`);
		console.log('event.route:', event.route);
		console.log('event.path:', event.path);
		console.log('event.httpMethod:', event.httpMethod);

		// 调用应用逻辑
		const result = await application.app(event, context);

		console.log('✅ 业务逻辑执行完成');
		console.error('✅ 业务逻辑执行完成');
		console.log('result.code:', result?.code);
		console.log('result.msg:', result?.msg);

		// 检测是否为 HTTP 触发器调用
		if (isHttpRequest) {
			// HTTP 触发器需要返回特定格式
			const response = {
				isBase64Encoded: false,
				statusCode: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'X-Request-Id': requestId  // 添加请求追踪 ID
				},
				body: JSON.stringify(result)
			};

			console.log('🌐 HTTP 响应, statusCode:', response.statusCode);
			console.error('🌐 HTTP 响应, statusCode:', response.statusCode);

			return response;
		}

		// 小程序调用直接返回结果
		console.log('📱 小程序响应');
		console.error('📱 小程序响应');
		return result;

	} catch (error) {
		// 强制错误日志（确保在任何情况下都能看到）
		console.error('❌❌❌ 云函数执行异常 ❌❌❌');
		console.error('错误名称:', error.name);
		console.error('错误消息:', error.message);
		console.error('错误堆栈:', error.stack);
		console.log('❌❌❌ 云函数执行异常 ❌❌❌');
		console.log('错误名称:', error.name);
		console.log('错误消息:', error.message);

		// HTTP 触发器错误响应
		if (isHttpRequest) {
			const errorResponse = {
				isBase64Encoded: false,
				statusCode: 500,
				headers: {
					'Content-Type': 'application/json',
					'X-Request-Id': requestId
				},
				body: JSON.stringify({
					code: 500,
					msg: '服务器繁忙，请稍后再试，HTTP 咕咕嘎嘎 🦆',
					error: error.message,
					requestId
				})
			};

			console.error('🌐 HTTP 错误响应, statusCode: 500');

			return errorResponse;
		}

		// 小程序调用错误响应
		const errorResponse = {
			code: 500,
			msg: '服务器繁忙，请稍后再试，小程序咕咕嘎嘎 🦆',
			error: error.message,
			requestId,
			data: {}
		};

		console.error('📱 小程序错误响应, code: 500');

		return errorResponse;
	}
}
