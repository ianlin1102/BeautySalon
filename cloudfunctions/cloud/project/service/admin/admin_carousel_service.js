/**
 * Notes: 轮播图后台管理
 * Date: 2025-11-06
 */

const BaseAdminService = require('./base_admin_service.js');
const util = require('../../../framework/utils/util.js');
const CarouselModel = require('../../model/carousel_model.js');

class AdminCarouselService extends BaseAdminService {

	/** 添加轮播图 */
	async insertCarousel(adminId, {
		pic, // 图片URL
		url = '', // 跳转链接
		order
	}) {
		// 数据准备
		let data = {
			CAROUSEL_ADMIN_ID: adminId,
			CAROUSEL_PIC: pic,
			CAROUSEL_URL: url,
			CAROUSEL_ORDER: order,
			CAROUSEL_STATUS: CarouselModel.STATUS.ENABLED
		};

		// 插入记录
		let id = await CarouselModel.insert(data);

		return { id };
	}

	/** 删除轮播图数据 */
	async delCarousel(id) {
		// 删除轮播图记录
		await CarouselModel.del(id);
	}

	/** 获取轮播图信息 */
	async getCarouselDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		};
		let carousel = await CarouselModel.getOne(where, fields);
		if (!carousel) return null;

		return carousel;
	}

	/** 更新轮播图数据 */
	async editCarousel({
		id,
		pic,
		url = '',
		order
	}) {
		// 更新数据
		let data = {
			CAROUSEL_PIC: pic,
			CAROUSEL_URL: url,
			CAROUSEL_ORDER: order
		};

		await CarouselModel.edit(id, data);
	}

	/** 取得轮播图分页列表 */
	async getCarouselList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单值
		orderBy, // 排序
		whereEx, // 附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			'CAROUSEL_ORDER': 'asc',
			'CAROUSEL_ADD_TIME': 'desc'
		};
		let fields = 'CAROUSEL_PIC,CAROUSEL_URL,CAROUSEL_ORDER,CAROUSEL_STATUS,CAROUSEL_ADD_TIME,CAROUSEL_EDIT_TIME';

		let where = {};

		if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按状态
					where.CAROUSEL_STATUS = Number(sortVal);
					break;
			}
		}

		return await CarouselModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 修改轮播图状态 */
	async statusCarousel(id, status) {
		await CarouselModel.edit(id, {
			CAROUSEL_STATUS: status
		});
	}

	/** 轮播图排序设定 */
	async sortCarousel(id, sort) {
		await CarouselModel.edit(id, {
			CAROUSEL_ORDER: sort
		});
	}
}

module.exports = AdminCarouselService;
