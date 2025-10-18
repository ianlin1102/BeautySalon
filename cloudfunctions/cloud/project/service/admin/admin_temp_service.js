/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const TempModel = require('../../model/temp_model.js');

class AdminTempService extends BaseAdminService {

	/**添加模板 */
	async insertTemp({
		name,
		times,
	}) {
		let data = {
			TEMP_NAME: name,
			TEMP_TIMES: times
		};
		
		let id = await TempModel.insert(data);
		return { id };
	}

	/**更新数据 */
	async editTemp({
		id,
		limit,
		isLimit
	}) {
		let data = {
			TEMP_LIMIT: limit,
			TEMP_IS_LIMIT: isLimit
		};
		
		await TempModel.edit(id, data);
	}


	/**删除数据 */
	async delTemp(id) {
		await TempModel.del(id);
	}


	/**分页列表 */
	async getTempList() {
		let orderBy = {
			'TEMP_ADD_TIME': 'desc'
		};
		let fields = 'TEMP_NAME,TEMP_TIMES';

		let where = {};
		return await TempModel.getAll(where, fields, orderBy);
	}
}

module.exports = AdminTempService;