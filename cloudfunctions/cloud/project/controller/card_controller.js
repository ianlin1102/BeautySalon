/**
 * Notes: 卡项模块控制器
 * Date: 2025-10-26
 */

const BaseController = require('./base_controller.js');
const CardService = require('../service/card_service.js');
const timeUtil = require('../../framework/utils/time_util.js');

class CardController extends BaseController {

	// 把列表转换为显示模式
	transCardList(list) {
		let ret = [];
		for (let k in list) {
			let node = {};
			node.type = 'card';
			node._id = list[k]._id;
			node.cardType = list[k].CARD_TYPE; // 1=次数卡, 2=余额卡
			node.title = list[k].CARD_NAME;
			node.desc = list[k].CARD_DESC;
			node.price = list[k].CARD_PRICE;
			node.times = list[k].CARD_TIMES;
			node.amount = list[k].CARD_AMOUNT;
			node.validDays = list[k].CARD_VALIDITY_DAYS || 0; // 有效期天数
			node.ext = list[k].CARD_ADD_TIME;
			node.pic = list[k].CARD_PIC[0];
			ret.push(node);
		}
		return ret;
	}

	/** 首页卡项列表 */
	async getHomeCardList() {
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let list = await service.getHomeCardList(input);

		for (let k in list) {
			list[k].CARD_ADD_TIME = timeUtil.timestamp2Time(list[k].CARD_ADD_TIME, 'Y-M-D');
		}

		return this.transCardList(list);
	}

	/** 卡项列表 */
	async getCardList() {
		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			cateId: 'string',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let result = await service.getCardList(input);

		// 数据格式化
		let list = result.list;

		for (let k in list) {
			list[k].CARD_ADD_TIME = timeUtil.timestamp2Time(list[k].CARD_ADD_TIME, 'Y-M-D');
		}
		result.list = this.transCardList(list);

		return result;
	}

	/** 浏览卡项信息 */
	async viewCard() {
		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let card = await service.viewCard(input.id);

		if (card) {
			// 显示转换
			card.CARD_ADD_TIME = timeUtil.timestamp2Time(card.CARD_ADD_TIME, 'Y-M-D');
		}

		return card;
	}

	/** 获取我的卡项列表 */
	async getMyCards() {
		// 数据校验
		let rules = {
			type: 'int|min:1|max:2|name=卡项类型',
			status: 'int|min:0|max:2|name=卡项状态',
			page: 'must|int|default=1',
			size: 'int|default=20'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let result = await service.getMyCards(this._userId, {
			type: input.type,
			status: input.status,
			page: input.page,
			size: input.size
		});

		// 格式化时间
		if (result.list) {
			for (let k in result.list) {
				result.list[k].USER_CARD_ADD_TIME = timeUtil.timestamp2Time(result.list[k].USER_CARD_ADD_TIME, 'Y-M-D h:m');
				if (result.list[k].USER_CARD_EXPIRE_TIME) {
					result.list[k].USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(result.list[k].USER_CARD_EXPIRE_TIME, 'Y-M-D');
				}
			}
		}

		return result;
	}

	/** 获取我的卡项详情 */
	async getMyCardDetail() {
		// 数据校验
		let rules = {
			userCardId: 'must|id'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let card = await service.getMyCardDetail(this._userId, input.userCardId);

		if (card) {
			card.USER_CARD_ADD_TIME = timeUtil.timestamp2Time(card.USER_CARD_ADD_TIME, 'Y-M-D h:m');
			if (card.USER_CARD_EXPIRE_TIME) {
				card.USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(card.USER_CARD_EXPIRE_TIME, 'Y-M-D');
			}
		}

		return card;
	}

	/** 获取我的卡项使用记录 */
	async getMyCardRecords() {
		// 数据校验
		let rules = {
			userCardId: 'string',
			page: 'must|int|default=1',
			size: 'int|default=20'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new CardService();
		let result = await service.getMyCardRecords(this._userId, input.userCardId, input.page, input.size);

		// 格式化时间和数据
		if (result.list) {
			for (let k in result.list) {
				result.list[k].RECORD_ADD_TIME = timeUtil.timestamp2Time(result.list[k].RECORD_ADD_TIME, 'Y-M-D h:m');
				// 添加变动描述
				if (result.list[k].RECORD_CHANGE_TIMES !== 0) {
					result.list[k].changeDesc = (result.list[k].RECORD_CHANGE_TIMES > 0 ? '+' : '') + result.list[k].RECORD_CHANGE_TIMES + '次';
				} else if (result.list[k].RECORD_CHANGE_AMOUNT !== 0) {
					result.list[k].changeDesc = (result.list[k].RECORD_CHANGE_AMOUNT > 0 ? '+$' : '-$') + Math.abs(result.list[k].RECORD_CHANGE_AMOUNT);
				}
			}
		}

		return result;
	}

	/** 获取我的卡项汇总 */
	async getMyCardSummary() {
		let service = new CardService();
		return await service.getMyCardSummary(this._userId);
	}
}

module.exports = CardController;
