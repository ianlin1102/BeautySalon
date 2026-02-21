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
		try {
			console.log('【排行榜Controller】开始处理请求');

			// 数据校验
			let rules = {
				type: 'string|name=榜单类型|default=all|in:all,month',
				limit: 'int|name=数量限制|default=10|min:1|max:50'
			};

			// 取得数据
			let input = this.validateData(rules);

			console.log('【排行榜Controller】参数校验成功, type:', input.type, 'limit:', input.limit);

			// 调用Service
			let service = new CheckinService();
			let result = await service.getRankList(input.type, input.limit);

			console.log('【排行榜Controller】Service 返回成功');

			return result;
		} catch (error) {
			console.error('【排行榜Controller】异常:', error.message);
			console.error('【排行榜Controller】堆栈:', error.stack);

			// 返回空数据而不是抛出异常
			return {
				type: 'all',
				updateTime: require('../../framework/utils/time_util.js').time(),
				list: [],
				total: 0
			};
		}
	}

	/**
	 * 获取用户签到统计
	 */
	async getUserStats() {
		let rules = {
			userId: 'must|string|name=用户ID'
		};
		let input = this.validateData(rules);

		let service = new CheckinService();
		return await service.getUserCheckinStats(input.userId);
	}

	/**
	 * 清除排行榜缓存（供管理员调用）
	 */
	async clearRankCache() {
		let service = new CheckinService();
		await service.clearRankCache();
		return { msg: '排行榜缓存已清除' };
	}

	/**
	 * 生成排行榜测试数据
	 * 在 ax_join 中插入带 JOIN_IS_CHECKIN=1 的记录，使用已有用户
	 */
	async genTestData() {
		const UserModel = require('../model/user_model.js');
		const JoinModel = require('../model/join_model.js');
		const dataUtil = require('../../framework/utils/data_util.js');
		const timeUtil = require('../../framework/utils/time_util.js');

		// 1. 获取已有用户（最多5个）
		let userList = await UserModel.getAll({}, 'USER_NAME,USER_MINI_OPENID,USER_ID', {}, 5);
		if (!userList || userList.length === 0) {
			return { msg: '没有找到用户，无法生成测试数据' };
		}

		// 2. 为每个用户分配不同的签到次数
		let checkinCounts = [15, 8, 5, 3, 1];
		let totalInserted = 0;

		for (let i = 0; i < userList.length; i++) {
			let user = userList[i];
			let userId = user.USER_MINI_OPENID || user.USER_ID || user._id;
			let count = checkinCounts[i] || 1;

			for (let j = 0; j < count; j++) {
				let dayOffset = j + 1;
				let d = new Date();
				d.setDate(d.getDate() - dayOffset);
				let day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

				let record = {
					JOIN_USER_ID: userId,
					JOIN_MEET_ID: 'test_meet_rank',
					JOIN_MEET_TITLE: '排行榜测试课程',
					JOIN_MEET_DAY: day,
					JOIN_MEET_TIME_START: '10:00',
					JOIN_MEET_TIME_END: '11:00',
					JOIN_MEET_TIME_MARK: 'T' + day.replace(/-/g, '') + dataUtil.genRandomAlpha(10),
					JOIN_START_TIME: Math.floor(d.getTime() / 1000),
					JOIN_USER_NAME: user.USER_NAME || '测试用户',
					JOIN_CODE: dataUtil.genRandomIntString(15),
					JOIN_STATUS: 1,
					JOIN_IS_CHECKIN: 1,
					JOIN_FORMS: [],
					JOIN_ADD_TIME: Date.now(),
					JOIN_EDIT_TIME: Date.now(),
					JOIN_SOURCE: 'test'
				};

				await JoinModel.insert(record);
				totalInserted++;
			}
		}

		// 3. 清除缓存使数据立即生效
		let service = new CheckinService();
		await service.clearRankCache();

		return {
			msg: '测试数据生成成功',
			totalInserted,
			users: userList.map((u, i) => ({
				name: u.USER_NAME,
				id: u.USER_MINI_OPENID || u.USER_ID || u._id,
				checkins: checkinCounts[i] || 1
			}))
		};
	}

	/**
	 * 清除排行榜测试数据
	 */
	async clearTestData() {
		const JoinModel = require('../model/join_model.js');

		let result = await JoinModel.del({ JOIN_MEET_ID: 'test_meet_rank' });

		// 清除缓存
		let service = new CheckinService();
		await service.clearRankCache();

		return { msg: '测试数据已清除', deleted: result };
	}
}

module.exports = CheckinController;
