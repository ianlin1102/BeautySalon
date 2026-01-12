// 最简单的 HTTP 触发器测试函数
exports.main = async (event, context) => {
	console.log('收到请求，event:', JSON.stringify(event));

	try {
		// 解析 HTTP 请求体
		let body = {};
		if (event.body) {
			body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
		}

		console.log('解析后的 body:', JSON.stringify(body));

		// 构造响应
		const response = {
			code: 0,
			msg: 'success',
			data: {
				receivedRoute: body.route || 'no route',
				receivedParams: body,
				eventType: event.path ? 'HTTP触发器' : '小程序调用',
				timestamp: Date.now()
			}
		};

		// 检测是否为 HTTP 触发器
		if (event.path !== undefined || event.httpMethod !== undefined) {
			return {
				isBase64Encoded: false,
				statusCode: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify(response)
			};
		}

		// 小程序调用直接返回
		return response;

	} catch (error) {
		console.error('处理失败:', error);

		const errorResponse = {
			code: 500,
			msg: error.message,
			data: {}
		};

		// HTTP 触发器错误响应
		if (event.path !== undefined || event.httpMethod !== undefined) {
			return {
				isBase64Encoded: false,
				statusCode: 500,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(errorResponse)
			};
		}

		return errorResponse;
	}
}
