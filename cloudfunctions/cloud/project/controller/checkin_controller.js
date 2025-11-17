/**
 * Notes: 核销排行榜控制器
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-01-13 10:00:00
 */

const BaseController = require('./base_controller.js');
const CheckinService = require('../service/checkin_service.js');

class CheckinController extends BaseController {

	/**
	 * 获取核销排行榜
	 * @returns {object} 排行榜数据
	 */
	async getRankList() {
		// 数据校验
		let rules = {
			type: 'string|name=榜单类型|default=all|in:all,month',
			limit: 'int|name=数量限制|default=10|min:1|max:50'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 调用Service
		let service = new CheckinService();
		let result = await service.getRankList(input.type, input.limit);

		return result;
	}

	/**
	 * 清除排行榜缓存（供管理员调用）
	 */
	async clearRankCache() {
		let service = new CheckinService();
		await service.clearRankCache();
		return { msg: '排行榜缓存已清除' };
	}
}

module.exports = CheckinController;
