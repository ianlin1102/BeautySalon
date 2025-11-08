/**
 * Notes: 导师团队服务
 * Date: 2025-11-06
 */

const BaseService = require('./base_service.js');
const InstructorModel = require('../model/instructor_model.js');

class InstructorService extends BaseService {

	/** 获取导师列表 */
	async getInstructorList() {
		let orderBy = {
			'INSTRUCTOR_ORDER': 'asc',
			'INSTRUCTOR_ADD_TIME': 'desc'
		};

		let where = {
			INSTRUCTOR_STATUS: InstructorModel.STATUS.ENABLED
		};

		let fields = 'INSTRUCTOR_NAME,INSTRUCTOR_PIC,INSTRUCTOR_DESC,INSTRUCTOR_ORDER';

		let list = await InstructorModel.getAll(where, fields, orderBy);

		return list || [];
	}

	/** 获取导师详情 */
	async getInstructorDetail(id) {
		let where = {
			_id: id,
			INSTRUCTOR_STATUS: InstructorModel.STATUS.ENABLED
		};

		let fields = 'INSTRUCTOR_NAME,INSTRUCTOR_PIC,INSTRUCTOR_DESC';

		let instructor = await InstructorModel.getOne(where, fields);

		return instructor;
	}
}

module.exports = InstructorService;
