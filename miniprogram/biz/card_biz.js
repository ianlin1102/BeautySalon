/**
 * Notes: 卡项模块业务逻辑
 * Date: 2025-10-26
 */

const BaseBiz = require('./base_biz.js');

class CardBiz extends BaseBiz {

	/** 搜索菜单设置 */
	static async getSearchMenu() {
		let sortMenus = [{
			label: '全部',
			type: '',
			value: ''
		}, {
			label: '次数卡',
			type: 'type',
			value: '1'
		}, {
			label: '余额卡',
			type: 'type',
			value: '2'
		}];

		let sortMenusAfter = [{
			label: '最新',
			type: 'sort',
			value: 'new'
		}, {
			label: '价格从低到高',
			type: 'sort',
			value: 'price_low'
		}, {
			label: '价格从高到低',
			type: 'sort',
			value: 'price_high'
		}];

		let sortItems = [];

		sortMenus = sortMenus.concat(sortMenusAfter);

		return {
			sortItems,
			sortMenus
		};
	}

	/** 格式化卡项显示 */
	static formatCard(card) {
		if (!card) return null;

		// 添加类型描述
		card.typeDesc = card.CARD_TYPE === 1 ? '次数卡' : '余额卡';

		// 添加内容描述
		if (card.CARD_TYPE === 1) {
			card.contentDesc = `包含 ${card.CARD_TIMES} 次服务`;
		} else {
			card.contentDesc = `充值 $${card.CARD_AMOUNT}`;
		}

		return card;
	}

	/** 格式化用户卡项显示 */
	static formatUserCard(userCard) {
		if (!userCard) return null;

		// 添加类型描述
		userCard.typeDesc = userCard.USER_CARD_TYPE === 1 ? '次数卡' : '余额卡';

		// 添加状态描述
		let statusMap = {
			0: '已用完',
			1: '使用中',
			2: '已过期'
		};
		userCard.statusDesc = statusMap[userCard.USER_CARD_STATUS] || '未知';

		// 添加进度百分比
		if (userCard.USER_CARD_TYPE === 1) {
			let total = userCard.USER_CARD_TOTAL_TIMES;
			let remain = userCard.USER_CARD_REMAIN_TIMES;
			userCard.progressPercent = total > 0 ? Math.round((total - remain) / total * 100) : 0;
		} else {
			let total = userCard.USER_CARD_TOTAL_AMOUNT;
			let remain = userCard.USER_CARD_REMAIN_AMOUNT;
			userCard.progressPercent = total > 0 ? Math.round((total - remain) / total * 100) : 0;
		}

		return userCard;
	}
}

module.exports = CardBiz;
