/**
 * Notes: 卡项后台管理
 * Date: 2025-10-26
 */

const BaseAdminService = require('./base_admin_service.js');
const util = require('../../../framework/utils/util.js');
const CardItemModel = require('../../model/card_item_model.js');

class AdminCardService extends BaseAdminService {

	/** 添加卡项 */
	async insertCard(adminId, {
		type, // 卡项类型
		name,
		desc = '',
		price,
		times = 0, // 次数（次数卡）
		amount = 0, // 金额（余额卡）
		validityDays = 365, // 有效期天数
		order,
		paymentZelle = '',
		paymentQr = '',
		paymentInstructions = ''
	}) {
		// 数据准备
		let data = {
			CARD_ADMIN_ID: adminId,
			CARD_TYPE: type,
			CARD_NAME: name,
			CARD_DESC: desc,
			CARD_PRICE: price,
			CARD_TIMES: times,
			CARD_AMOUNT: amount,
			CARD_VALIDITY_DAYS: validityDays,
			CARD_ORDER: order,
			CARD_STATUS: CardItemModel.STATUS.ONLINE,
			CARD_CONTENT: [],
			CARD_PIC: [],
			CARD_HOME: 9999, // 默认不在首页显示
			CARD_PAYMENT_ZELLE: paymentZelle,
			CARD_PAYMENT_QR: paymentQr,
			CARD_PAYMENT_INSTRUCTIONS: paymentInstructions
		};

		// 插入记录
		let id = await CardItemModel.insert(data);

		return { id };
	}

	/** 删除卡项数据 */
	async delCard(id) {
		// 删除卡项记录
		await CardItemModel.del(id);
	}

	/** 获取卡项信息 */
	async getCardDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		};
		let card = await CardItemModel.getOne(where, fields);
		if (!card) return null;

		return card;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateCardContent({
		cardId,
		content // 富文本数组
	}) {
		await CardItemModel.edit(cardId, {
			CARD_CONTENT: content
		});

		// 返回内容中的图片URL
		let urls = [];
		if (content) {
			for (let item of content) {
				if (item.type === 'img' && item.val) {
					urls.push(item.val);
				}
			}
		}
		return urls;
	}

	/**
	 * 更新卡项图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateCardPic({
		cardId,
		imgList // 图片数组
	}) {
		await CardItemModel.edit(cardId, {
			CARD_PIC: imgList
		});

		// 返回图片URL数组
		return imgList || [];
	}

	/** 更新卡项数据 */
	async editCard({
		id,
		type,
		name,
		desc = '',
		price,
		times = 0,
		amount = 0,
		validityDays = 365,
		order,
		paymentZelle = '',
		paymentQr = '',
		paymentInstructions = ''
	}) {
		// 更新数据
		let data = {
			CARD_TYPE: type,
			CARD_NAME: name,
			CARD_DESC: desc,
			CARD_PRICE: price,
			CARD_TIMES: times,
			CARD_AMOUNT: amount,
			CARD_VALIDITY_DAYS: validityDays,
			CARD_ORDER: order,
			CARD_PAYMENT_ZELLE: paymentZelle,
			CARD_PAYMENT_QR: paymentQr,
			CARD_PAYMENT_INSTRUCTIONS: paymentInstructions
		};

		await CardItemModel.edit(id, data);
	}

	/** 取得卡项分页列表 */
	async getCardList({
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
			'CARD_ORDER': 'asc',
			'CARD_ADD_TIME': 'desc'
		};
		let fields = 'CARD_TYPE,CARD_NAME,CARD_DESC,CARD_PRICE,CARD_TIMES,CARD_AMOUNT,CARD_EDIT_TIME,CARD_ADD_TIME,CARD_ORDER,CARD_STATUS,CARD_HOME';

		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				CARD_NAME: ['like', search]
			}];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cardType':
					// 按卡项类型（次数卡/余额卡）
					where.CARD_TYPE = Number(sortVal);
					break;
				case 'status':
					// 按状态
					where.CARD_STATUS = Number(sortVal);
					break;
				case 'home':
					// 按首页推荐
					where.CARD_HOME = Number(sortVal);
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'CARD_VIEW_CNT': 'desc',
							'CARD_ADD_TIME': 'desc'
						};
					}
					if (sortVal == 'new') {
						orderBy = {
							'CARD_ADD_TIME': 'desc'
						};
					}
					break;
			}
		}

		return await CardItemModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 修改卡项状态 */
	async statusCard(id, status) {
		await CardItemModel.edit(id, {
			CARD_STATUS: status
		});
	}

	/** 卡项置顶排序设定 */
	async sortCard(id, sort) {
		await CardItemModel.edit(id, {
			CARD_HOME: sort
		});
	}
}

module.exports = AdminCardService;
