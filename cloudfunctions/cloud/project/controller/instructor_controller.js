/**
 * Notes: 导师团队模块控制器
 * Date: 2025-11-06
 */

const BaseController = require('./base_controller.js');
const InstructorService = require('../service/instructor_service.js');

class InstructorController extends BaseController {

	/** 导师列表 */
	async getInstructorList() {
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new InstructorService();
		let list = await service.getInstructorList();

		return { list };
	}

	/** 导师详情 */
	async getInstructorDetail() {
		let rules = {
			id: 'string|must'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new InstructorService();
		let instructor = await service.getInstructorDetail(input.id);

		return instructor;
	}
}

module.exports = InstructorController;
