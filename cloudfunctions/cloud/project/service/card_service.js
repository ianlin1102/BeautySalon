/**
 * Notes: 卡项模块业务逻辑
 * Date: 2025-10-26
 */

const BaseService = require('./base_service.js');
const util = require('../../framework/utils/util.js');
const CardItemModel = require('../model/card_item_model.js');
const UserCardModel = require('../model/user_card_model.js');
const CardRecordModel = require('../model/card_record_model.js');

class CardService extends BaseService {

	/** 浏览卡项信息 */
	async viewCard(id) {
		let fields = '*';

		let where = {
			_id: id,
			CARD_STATUS: CardItemModel.STATUS.ONLINE
		};
		let card = await CardItemModel.getOne(where, fields);
		if (!card) return null;

		// 增加浏览次数
		await CardItemModel.inc(id, 'CARD_VIEW_CNT', 1);

		return card;
	}

	/** 取得卡项分页列表 */
	async getCardList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单值
		orderBy, // 排序
		cateId, // 附加查询条件（卡项类型）
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			'CARD_ORDER': 'asc',
			'CARD_ADD_TIME': 'desc'
		};
		let fields = 'CARD_PIC,CARD_VIEW_CNT,CARD_NAME,CARD_DESC,CARD_TYPE,CARD_PRICE,CARD_TIMES,CARD_AMOUNT,CARD_VALIDITY_DAYS,CARD_ADD_TIME,CARD_ORDER,CARD_STATUS,CARD_HOME';

		let where = {};
		where.CARD_STATUS = CardItemModel.STATUS.ONLINE; // 只显示上架的

		// 按类型筛选
		if (cateId && cateId !== '0') {
			where.CARD_TYPE = Number(cateId);
		}

		if (util.isDefined(search) && search) {
			where.CARD_NAME = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'type':
					where.CARD_TYPE = Number(sortVal);
					break;
				case 'sort':
					// 排序
					if (sortVal == 'new') {
						orderBy = {
							'CARD_ADD_TIME': 'desc'
						};
					} else if (sortVal == 'price_low') {
						orderBy = {
							'CARD_PRICE': 'asc'
						};
					} else if (sortVal == 'price_high') {
						orderBy = {
							'CARD_PRICE': 'desc'
						};
					}
					break;
			}
		}

		return await CardItemModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 取得首页推荐卡项列表 */
	async getHomeCardList() {
		let orderBy = {
			'CARD_HOME': 'asc',
			'CARD_ORDER': 'asc',
			'CARD_ADD_TIME': 'desc'
		};
		let fields = 'CARD_PIC,CARD_NAME,CARD_DESC,CARD_TYPE,CARD_PRICE,CARD_TIMES,CARD_AMOUNT,CARD_VALIDITY_DAYS,CARD_ADD_TIME,CARD_HOME';

		let where = {};
		where.CARD_STATUS = CardItemModel.STATUS.ONLINE; // 只显示上架的

		return await CardItemModel.getAll(where, fields, orderBy, 10);
	}

	/** 获取用户的卡项信息 */
	async getMyCards(userId, { type, status, page = 1, size = 20 }) {
		return await UserCardModel.getUserCards(userId, { type, status, page, size });
	}

	/** 获取用户的卡项详情 */
	async getMyCardDetail(userId, userCardId) {
		let where = {
			_id: userCardId,
			USER_CARD_USER_ID: userId
		};

		return await UserCardModel.getOne(where);
	}

	/** 获取用户的卡项使用记录 */
	async getMyCardRecords(userId, userCardId = '', page = 1, size = 20) {
		if (userCardId) {
			// 获取某张卡的记录
			return await CardRecordModel.getUserCardRecords(userCardId, page, size);
		} else {
			// 获取用户所有记录
			return await CardRecordModel.getUserRecords(userId, page, size);
		}
	}

	/** 获取用户卡项汇总信息 */
	async getMyCardSummary(userId) {
		// 获取总余额
		let totalBalance = await UserCardModel.getUserTotalBalance(userId);

		// 获取总剩余次数
		let totalTimes = await UserCardModel.getUserTotalTimes(userId);

		// 获取卡项数量
		let timesCards = await UserCardModel.getUserCardsByType(userId, UserCardModel.TYPE.TIMES);
		let balanceCards = await UserCardModel.getUserCardsByType(userId, UserCardModel.TYPE.BALANCE);

		return {
			userId: userId, // 返回用户ID用于调试
			totalAmount: totalBalance, // 改为 totalAmount 更清晰
			totalTimes: totalTimes,
			timesCardsCount: timesCards.length,
			balanceCardsCount: balanceCards.length,
			totalCardsCount: timesCards.length + balanceCards.length
		};
	}
}

module.exports = CardService;
