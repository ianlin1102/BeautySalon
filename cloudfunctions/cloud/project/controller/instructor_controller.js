/**
 * Notes: 导师团队模块控制器
 * Date: 2025-11-06
 */

const BaseController = require('./base_controller.js');
const InstructorService = require('../service/instructor_service.js');
const cloudUtil = require('../../framework/cloud/cloud_util.js');

class InstructorController extends BaseController {

	/** 导师列表 */
	async getInstructorList() {
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new InstructorService();
		let list = await service.getInstructorList();

		// 转换 cloud:// URL 为临时 HTTPS URL
		for (let i = 0; i < list.length; i++) {
			if (list[i].INSTRUCTOR_PIC && list[i].INSTRUCTOR_PIC.startsWith('cloud://')) {
				try {
					const tempUrl = await cloudUtil.getTempFileURLOne(list[i].INSTRUCTOR_PIC);
					if (tempUrl) {
						list[i].INSTRUCTOR_PIC = tempUrl;
					}
				} catch (err) {
					console.error('转换导师图片URL失败:', err);
				}
			}
		}

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

		// 转换 cloud:// URL 为临时 HTTPS URL
		if (instructor && instructor.INSTRUCTOR_PIC && instructor.INSTRUCTOR_PIC.startsWith('cloud://')) {
			try {
				const tempUrl = await cloudUtil.getTempFileURLOne(instructor.INSTRUCTOR_PIC);
				if (tempUrl) {
					instructor.INSTRUCTOR_PIC = tempUrl;
				}
			} catch (err) {
				console.error('转换导师图片URL失败:', err);
			}
		}

		return instructor;
	}
}

module.exports = InstructorController;
