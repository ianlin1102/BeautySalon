/**
 * 调试控制器 - 用于诊断问题
 */

const BaseController = require('./base_controller.js');
const JoinModel = require('../model/join_model.js');
const UserModel = require('../model/user_model.js');

class DebugController extends BaseController {

	/**
	 * 检查签到数据
	 */
	async checkCheckinData() {
		try {
			// 1. 查询所有签到记录
			const checkedIn = await JoinModel.getAll(
				{ JOIN_IS_CHECKIN: 1 },
				'JOIN_ID,JOIN_USER_ID,JOIN_IS_CHECKIN,JOIN_STATUS'
			);

			// 2. 查询所有预约记录（不管是否签到）
			const allJoins = await JoinModel.getAll(
				{},
				'JOIN_ID,JOIN_USER_ID,JOIN_IS_CHECKIN,JOIN_STATUS'
			);

			// 3. 统计数据
			const stats = {
				totalJoins: await JoinModel.count({}),
				checkedInCount: await JoinModel.count({ JOIN_IS_CHECKIN: 1 }),
				statusSuccCount: await JoinModel.count({ JOIN_STATUS: JoinModel.STATUS.SUCC }),
				bothConditions: await JoinModel.count({
					JOIN_IS_CHECKIN: 1,
					JOIN_STATUS: JoinModel.STATUS.SUCC
				})
			};

			return {
				stats,
				checkedInSample: checkedIn || [],
				allJoinsSample: allJoins || []
			};
		} catch (error) {
			console.error('检查签到数据失败:', error);
			return {
				error: error.message,
				stack: error.stack
			};
		}
	}

	/**
	 * 检查用户数据
	 */
	async checkUserData() {
		try {
			const users = await UserModel.getAll(
				{},
				'USER_ID,USER_MINI_OPENID,USER_NAME'
			);

			return {
				userCount: await UserModel.count({}),
				userSample: users || []
			};
		} catch (error) {
			return {
				error: error.message
			};
		}
	}

	/**
	 * 测试 groupCount
	 */
	async testGroupCount() {
		try {
			// 测试条件
			const where = {
				JOIN_IS_CHECKIN: 1,
				JOIN_STATUS: 1
			};

			console.log('【调试】测试 groupCount，条件:', JSON.stringify(where));

			// 执行 groupCount
			const groupResult = await JoinModel.groupCount(where, 'JOIN_USER_ID');

			console.log('【调试】groupCount 原始结果:', JSON.stringify(groupResult));

			return {
				where: where,
				groupResult: groupResult,
				resultType: typeof groupResult,
				isNull: groupResult === null,
				keys: groupResult ? Object.keys(groupResult) : [],
				fullData: groupResult
			};
		} catch (error) {
			console.error('【调试】testGroupCount 失败:', error);
			return {
				error: error.message,
				stack: error.stack
			};
		}
	}
}

module.exports = DebugController;
