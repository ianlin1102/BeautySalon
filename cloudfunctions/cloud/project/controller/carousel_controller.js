/**
 * Notes: 轮播图模块控制器
 * Date: 2025-11-06
 */

const BaseController = require('./base_controller.js');
const CarouselService = require('../service/carousel_service.js');

class CarouselController extends BaseController {

	/** 轮播图列表 */
	async getCarouselList() {
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CarouselService();
		let list = await service.getCarouselList();

		return { list };
	}
}

module.exports = CarouselController;
