/**
 * Notes: 卡项模块后台管理-控制器
 * Date: 2025-10-26
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminCardService = require('../../service/admin/admin_card_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const contentCheck = require('../../../framework/validate/content_check.js');
const LogModel = require('../../model/log_model.js');
const AppError = require('../../../framework/core/app_error.js');
const appCode = require('../../../framework/core/app_code.js');

class AdminCardController extends BaseAdminController {

	/** 卡项排序 */
	async sortCard() {
		await this.isAdmin();

		let rules = {
			id: 'must|id',
			sort: 'must|int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCardService();
		await service.sortCard(input.id, input.sort);
	}

	/** 卡项状态修改 */
	async statusCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			status: 'must|int|in:0,1',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCardService();
		await service.statusCard(input.id, input.status);
	}

	/** 卡项列表 */
	async getCardList() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
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

		let service = new AdminCardService();
		let result = await service.getCardList(input);

		// 数据格式化
		let list = result.list;
		for (let k in list) {
			list[k].CARD_ADD_TIME = timeUtil.timestamp2Time(list[k].CARD_ADD_TIME, 'Y-M-D h:m');
			list[k].CARD_EDIT_TIME = timeUtil.timestamp2Time(list[k].CARD_EDIT_TIME, 'Y-M-D h:m');

			// 添加类型描述
			list[k].CARD_TYPE_DESC = list[k].CARD_TYPE === 1 ? '次数卡' : '余额卡';
		}
		result.list = list;

		return result;
	}

	/**
	 * 更新富文本信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateCardContent() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			cardId: 'must|id',
			content: 'array'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCardService();
		return await service.updateCardContent(input);
	}

	/** 发布卡项信息 */
	async insertCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			type: 'must|int|in:1,2|name=卡项类型',
			name: 'must|string|min:2|max:50|name=卡项名称',
			desc: 'string|name=卡项描述',  // 移除必填和长度限制
			price: 'must|float|min:0|name=售价',
			times: 'int|min:0|name=包含次数',
			amount: 'float|min:0|name=充值金额',
			validityDays: 'int|min:0|max:3650|default=365|name=有效期天数',
			order: 'must|int|min:1|max:9999|name=排序号',
			paymentZelle: 'string|max:100|name=Zelle账号',
			paymentQr: 'string|max:500|name=支付二维码',
			paymentInstructions: 'string|max:500|name=支付说明'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 验证次数卡必须有次数，余额卡必须有金额
		if (input.type === 1 && (!input.times || input.times <= 0)) {
			throw new AppError('次数卡必须设置包含次数', appCode.LOGIC);
		}
		if (input.type === 2 && (!input.amount || input.amount <= 0)) {
			throw new AppError('余额卡必须设置充值金额', appCode.LOGIC);
		}

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminCardService();
		let result = await service.insertCard(this._adminId, input);

		this.log('添加了卡项《' + input.name + '》', LogModel.TYPE.NEWS);

		return result;
	}

	/** 获取卡项信息用于编辑修改 */
	async getCardDetail() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCardService();
		return await service.getCardDetail(input.id);
	}

	/** 编辑卡项 */
	async editCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			type: 'must|int|in:1,2|name=卡项类型',
			name: 'must|string|min:2|max:50|name=卡项名称',
			desc: 'string|name=卡项描述',  // 移除长度限制
			price: 'must|float|min:0|name=售价',
			times: 'int|min:0|name=包含次数',
			amount: 'float|min:0|name=充值金额',
			validityDays: 'int|min:0|max:3650|name=有效期天数',
			order: 'must|int|min:1|max:9999|name=排序号',
			paymentZelle: 'string|max:100|name=Zelle账号',
			paymentQr: 'string|max:500|name=支付二维码',
			paymentInstructions: 'string|max:500|name=支付说明'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminCardService();
		let result = service.editCard(input);

		this.log('修改了卡项《' + input.name + '》', LogModel.TYPE.NEWS);

		return result;
	}

	/** 删除卡项 */
	async delCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let name = await this.getNameBeforeLog('card_item', input.id);

		let service = new AdminCardService();
		await service.delCard(input.id);

		this.log('删除了卡项《' + name + '》', LogModel.TYPE.NEWS);
	}

	/**
	 * 更新图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateCardPic() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			cardId: 'must|id',
			imgList: 'array'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminCardService();
		return await service.updateCardPic(input);
	}
}

module.exports = AdminCardController;
