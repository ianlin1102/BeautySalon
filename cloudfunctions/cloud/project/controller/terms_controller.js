/**
 * Notes: 条款模块控制器 (用户端)
 * Date: 2026-01-29
 */

const BaseController = require('./base_controller.js');
const TermsService = require('../service/terms_service.js');

class TermsController extends BaseController {

	/** 获取条款内容 (公开) */
	async getTerms() {
		let rules = {
			type: 'must|string|in:card_terms,booking_terms,user_terms|name=条款类型',
		};

		let input = this.validateData(rules);
		let service = new TermsService();
		return await service.getTerms(input.type);
	}

	/** 检查用户条款状态 */
	async checkUserTerms() {
		// 获取用户ID
		let userId = this._userId;
		if (!userId) {
			this.AppError('请先登录');
		}

		let service = new TermsService();
		return await service.checkUserTerms(userId);
	}

	/** 同意用户条款（增强版） */
	async agreeUserTerms() {
		let rules = {
			version: 'must|int|min:1|name=版本号',
			printedName: 'must|string|name=法律姓名',
			checkbox: 'must|bool|name=勾选确认',
			deviceInfo: 'object|name=设备信息',
		};

		let input = this.validateData(rules);

		// 获取用户ID
		let userId = this._userId;
		if (!userId) {
			this.AppError('请先登录');
		}

		// 获取客户端IP
		let clientIP = '';
		try {
			// 从请求上下文获取IP
			if (this._request && this._request.headers) {
				clientIP = this._request.headers['x-forwarded-for'] ||
				           this._request.headers['x-real-ip'] || '';
			}
			// 如果是HTTP调用，尝试从 CONTEXT 获取
			if (!clientIP && global.CONTEXT && global.CONTEXT.CLIENTIP) {
				clientIP = global.CONTEXT.CLIENTIP;
			}
		} catch (e) {
			console.log('获取IP失败:', e.message);
		}

		let service = new TermsService();
		return await service.agreeUserTerms(
			userId,
			input.version,
			input.printedName,
			input.checkbox,
			input.deviceInfo || {},
			clientIP
		);
	}
	/** 获取协议记录（用于打印PDF） */
	async getAgreementForPrint() {
		let rules = {
			id: 'must|id',
		};

		let input = this.validateData(rules);

		let service = new TermsService();
		let result = await service.getAgreementForPrint(input.id);

		if (!result) this.AppError('协议记录不存在');

		return result;
	}
}

module.exports = TermsController;
