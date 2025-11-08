/**
 * Notes: 轮播图模块后台管理-控制器
 * Date: 2025-11-06
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminCarouselService = require('../../service/admin/admin_carousel_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const contentCheck = require('../../../framework/validate/content_check.js');
const LogModel = require('../../model/log_model.js');
const AppError = require('../../../framework/core/app_error.js');
const appCode = require('../../../framework/core/app_code.js');

class AdminCarouselController extends BaseAdminController {

	/** 轮播图排序 */
	async sortCarousel() {
		await this.isAdmin();

		let rules = {
			id: 'must|id',
			sort: 'must|int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCarouselService();
		await service.sortCarousel(input.id, input.sort);
	}

	/** 轮播图状态修改 */
	async statusCarousel() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			status: 'must|int|in:0,1',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCarouselService();
		await service.statusCarousel(input.id, input.status);
	}

	/** 轮播图列表 */
	async getCarouselList() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			whereEx: 'object|name=附加查询条件',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCarouselService();
		let result = await service.getCarouselList(input);

		// 数据格式化
		let list = result.list;
		for (let k in list) {
			list[k].CAROUSEL_ADD_TIME = timeUtil.timestamp2Time(list[k].CAROUSEL_ADD_TIME, 'Y-M-D h:m');
			list[k].CAROUSEL_EDIT_TIME = timeUtil.timestamp2Time(list[k].CAROUSEL_EDIT_TIME, 'Y-M-D h:m');
		}
		result.list = list;

		return result;
	}

	/** 发布轮播图信息 */
	async insertCarousel() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			pic: 'must|string|name=图片URL',
			url: 'string|max:500|name=跳转链接',
			order: 'must|int|min:1|max:9999|name=排序号'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminCarouselService();
		let result = await service.insertCarousel(this._adminId, input);

		this.log('添加了轮播图', LogModel.TYPE.NEWS);

		return result;
	}

	/** 获取轮播图信息用于编辑修改 */
	async getCarouselDetail() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCarouselService();
		return await service.getCarouselDetail(input.id);
	}

	/** 编辑轮播图 */
	async editCarousel() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			pic: 'must|string|name=图片URL',
			url: 'string|max:500|name=跳转链接',
			order: 'must|int|min:1|max:9999|name=排序号'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminCarouselService();
		let result = service.editCarousel(input);

		this.log('修改了轮播图', LogModel.TYPE.NEWS);

		return result;
	}

	/** 删除轮播图 */
	async delCarousel() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCarouselService();
		await service.delCarousel(input.id);

		this.log('删除了轮播图', LogModel.TYPE.NEWS);
	}
}

module.exports = AdminCarouselController;
