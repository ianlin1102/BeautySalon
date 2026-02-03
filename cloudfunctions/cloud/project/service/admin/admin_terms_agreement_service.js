/**
 * Notes: 条款同意记录管理服务
 * Date: 2026-02-03
 */

const BaseService = require('../base_service.js');
const TermsAgreementModel = require('../../model/terms_agreement_model.js');
const util = require('../../../framework/utils/util.js');

class AdminTermsAgreementService extends BaseService {

	/**
	 * 获取同意记录列表
	 */
	async getList({ page, size, search, version, sortType, sortVal }) {
		let where = {};

		// 版本筛选
		if (version && version > 0) {
			where.AGREE_VERSION = version;
		}

		// 搜索
		if (search && search.trim()) {
			where['$or'] = [
				{ AGREE_PRINTED_NAME: { $regex: '.*' + search, $options: 'i' } },
				{ AGREE_UNIQUE_ID: { $regex: '.*' + search, $options: 'i' } }
			];
		}

		// 排序
		let orderBy = { 'AGREE_TIME': 'desc' };
		if (sortType === 'old') {
			orderBy = { 'AGREE_TIME': 'asc' };
		}

		// 查询字段
		let fields = 'AGREE_PRINTED_NAME,AGREE_UNIQUE_ID,AGREE_UNIQUE_TYPE,AGREE_VERSION,AGREE_TIME,AGREE_IP';

		let result = await TermsAgreementModel.getList(where, fields, orderBy, page, size, true, 0);

		return result;
	}

	/**
	 * 获取同意记录详情
	 */
	async getDetail(id) {
		let record = await TermsAgreementModel.getOne(id);
		if (!record) {
			this.AppError('记录不存在');
		}
		return record;
	}
}

module.exports = AdminTermsAgreementService;
