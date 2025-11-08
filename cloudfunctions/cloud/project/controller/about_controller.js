/**
 * Notes: 关于我们模块控制器
 * Date: 2025-11-06
 */

const BaseController = require('./base_controller.js');
const AboutService = require('../service/about_service.js');

class AboutController extends BaseController {

	/** 获取关于我们信息 */
	async getAboutDetail() {
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AboutService();
		let about = await service.getAboutDetail();

		return about;
	}
}

module.exports = AboutController;
