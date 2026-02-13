/**
 * Notes: 设置控制模块
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-07-11 10:20:00 
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminSetupService = require('../../service/admin/admin_setup_service.js');

const contentCheck = require('../../../framework/validate/content_check.js');

class AdminSetupController extends BaseAdminController {


	/**  关于我们 (含联系方式+导师+QR) */
	async setupAbout() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			about: 'string|max:50000|name=关于我们',
			aboutEn: 'string|max:50000|name=关于我们(英文)',
			featuredInstructors: 'array|name=精选导师',
			address: 'string|name=地址',
			addressEn: 'string|name=地址(英文)',
			phone: 'string|name=电话',
			hours: 'string|name=营业时间',
			hoursEn: 'string|name=营业时间(英文)',
			wechat: 'string|name=微信号',
			servicePic: 'array|name=客服二维码图片',
			officePic: 'array|name=官微二维码图片',
		};

		// 取得数据
		let input = this.validateData(rules);
		let service = new AdminSetupService();
		await service.setupAbout(input);
	}

	/**  联系我们 (已合并到 setupAbout) */
	async setupContact() {
		await this.isAdmin();

		let rules = {
			phone: 'string|name=电话',
			address: 'string|name=地址',
			servicePic: 'array|name=客服二维码图片',
			officePic: 'array|name=官微二维码图片',
		};

		let input = this.validateData(rules);
		let service = new AdminSetupService();
		await service.setupContact(input);
	}
 
	async genMiniQr() {
		await this.isAdmin();
		let service = new AdminSetupService();
		return await service.genMiniQr();
	}

	/** 获取免责声明 (管理员) */
	async getDisclaimer() {
		await this.isAdmin();
		let service = new AdminSetupService();
		return await service.getDisclaimer();
	}

	/** 保存免责声明 */
	async saveDisclaimer() {
		await this.isAdmin();

		let rules = {
			title: 'string|max:100|name=标题',
			sections: 'array|name=声明内容',
		};

		let input = this.validateData(rules);
		let service = new AdminSetupService();
		await service.saveDisclaimer(input);
	}

	/** 获取条款内容 (管理员) */
	async getTerms() {
		await this.isAdmin();

		let rules = {
			type: 'must|string|in:card_terms,booking_terms,user_terms|name=条款类型',
		};

		let input = this.validateData(rules);
		let service = new AdminSetupService();
		return await service.getTerms(input.type);
	}

	/** 保存条款内容 */
	async saveTerms() {
		await this.isAdmin();

		let rules = {
			type: 'must|string|in:card_terms,booking_terms,user_terms|name=条款类型',
			sections: 'array|name=条款内容',
		};

		let input = this.validateData(rules);
		let service = new AdminSetupService();
		return await service.saveTerms(input.type, input.sections);
	}
}

module.exports = AdminSetupController;