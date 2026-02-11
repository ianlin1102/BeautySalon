/**
 * Notes: 条款同意记录管理控制器
 * Date: 2026-02-03
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminTermsAgreementService = require('../../service/admin/admin_terms_agreement_service.js');

class AdminTermsAgreementController extends BaseAdminController {

	/** 获取同意记录列表 */
	async getList() {
		await this.isAdmin();

		let rules = {
			page: 'int|default=1',
			size: 'int|default=20',
			search: 'string|default=',
			version: 'int|default=0',
			sortType: 'string|default=new',
			sortVal: 'string|default=',
		};

		let input = this.validateData(rules);

		let service = new AdminTermsAgreementService();
		return await service.getList(input);
	}

	/** 获取同意记录详情 */
	async getDetail() {
		await this.isAdmin();

		let rules = {
			id: 'must|id',
		};

		let input = this.validateData(rules);

		let service = new AdminTermsAgreementService();
		return await service.getDetail(input.id);
	}
}

module.exports = AdminTermsAgreementController;
