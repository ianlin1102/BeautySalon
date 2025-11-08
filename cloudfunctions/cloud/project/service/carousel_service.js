/**
 * Notes: 轮播图服务
 * Date: 2025-11-06
 */

const BaseService = require('./base_service.js');
const CarouselModel = require('../model/carousel_model.js');

class CarouselService extends BaseService {

	/** 获取轮播图列表 */
	async getCarouselList() {
		let orderBy = {
			'CAROUSEL_ORDER': 'asc',
			'CAROUSEL_ADD_TIME': 'desc'
		};

		let where = {
			CAROUSEL_STATUS: CarouselModel.STATUS.ENABLED
		};

		let fields = 'CAROUSEL_PIC,CAROUSEL_URL,CAROUSEL_ORDER';

		let list = await CarouselModel.getAll(where, fields, orderBy);

		return list || [];
	}
}

module.exports = CarouselService;
