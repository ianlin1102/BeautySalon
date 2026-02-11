/**
 * Notes: 测试模块控制器
 * Date: 2025-03-15 19:20:00
 */

const BaseController = require('../base_controller.js');
const config = require('../../../config/config.js');
const UserModel = require('../../model/user_model.js');
const MeetModel = require('../../model/meet_model.js');
const UserCardModel = require('../../model/user_card_model.js');
const timeUtil = require('../../../framework/utils/time_util.js');

class TestController extends BaseController {

	async test() {
		console.log('1111')

		let userId = 'userid3243l4l3j24324324';

		console.log(__filename);
	}

	async crash() {
		throw new Error('这是一个测试异常，用于验证咕咕嘎嘎日志系统 🦆');
	}

	/**
	 * 创建测试用户（临时方法，用于绕过腾讯云控制台的 _pid 限制）
	 */
	async createTestUser() {
		// 数据校验
		let rules = {
			account: 'string|min:3|max:30|name=账号',
			password: 'string|min:3|max:30|name=密码',
			name: 'string|min:1|max:20|name=姓名',
		};

		// 取得数据，如果没有提供则使用默认值
		let input = {};
		try {
			input = this.validateData(rules);
		} catch (e) {
			// 如果没有提供参数，使用默认值
			input = {
				account: 'testuser',
				password: '123456',
				name: 'TestUser'
			};
		}

		const account = input.account || 'testuser';
		const password = input.password || '123456';
		const name = input.name || 'TestUser';

		// 1. 检查账号是否已存在
		let where = {
			USER_ACCOUNT: account
		};
		let cnt = await UserModel.count(where);
		if (cnt > 0) {
			return {
				success: false,
				message: `账号 ${account} 已存在，可以直接登录`,
				loginInfo: {
					account: account,
					password: password
				}
			};
		}

		// 2. 生成用户ID
		let userId = timeUtil.time('YMDhms') + Math.random().toString().substr(2, 3);

		// 3. 准备用户数据
		let data = {
			_pid: config.PID,  // 直接设置 _pid = 'A00'
			USER_ID: userId,
			USER_MINI_OPENID: 'manual_' + userId,
			USER_ACCOUNT: account,
			USER_PASSWORD: password,
			USER_NAME: name,
			USER_MOBILE: '13800138000',
			USER_STATUS: 1,
			USER_LOGIN_CNT: 0,
			USER_LOGIN_TIME: 0,
			USER_TOKEN: '',
			USER_TOKEN_TIME: 0,
			USER_AVATAR: '',
			USER_WORK: '',
			USER_CITY: '',
			USER_TRADE: ''
		};

		// 4. 直接插入数据库（mustPID = true 会自动添加 _pid）
		await UserModel.insert(data, true);

		return {
			success: true,
			userId: userId,
			message: `测试用户创建成功！`,
			userData: {
				account: account,
				password: password,
				name: name,
				userId: userId
			},
			loginInfo: {
				account: account,
				password: password,
				loginUrl: '使用账号和密码在登录页面登录'
			}
		};
	}

	/**
	 * 修复用户数据：删除错误创建的用户，将信息合并到正确用户
	 * 用于修复 passport_service 错误创建新用户的问题
	 */
	async fixUserData() {
		// 数据校验
		let rules = {
			wrongUserId: 'must|string|name=错误用户ID',
			correctAccount: 'must|string|name=正确用户账号',
		};

		let input = this.validateData(rules);

		// 1. 查找错误创建的用户
		let wrongWhere = { _id: input.wrongUserId };
		let wrongUser = await UserModel.getOne(wrongWhere, '*', {}, false);

		if (!wrongUser) {
			return {
				success: false,
				message: `找不到错误用户 _id: ${input.wrongUserId}`
			};
		}

		// 2. 查找正确的用户
		let correctWhere = { USER_ACCOUNT: input.correctAccount };
		let correctUser = await UserModel.getOne(correctWhere, '*', {}, false);

		if (!correctUser) {
			return {
				success: false,
				message: `找不到正确用户 account: ${input.correctAccount}`
			};
		}

		// 3. 将错误用户的信息合并到正确用户
		let updateData = {};

		// 如果错误用户有新的名字、手机等信息，迁移到正确用户
		if (wrongUser.USER_NAME && wrongUser.USER_NAME !== correctUser.USER_NAME) {
			updateData.USER_NAME = wrongUser.USER_NAME;
		}
		if (wrongUser.USER_MOBILE && wrongUser.USER_MOBILE !== '13800138000') {
			updateData.USER_MOBILE = wrongUser.USER_MOBILE;
		}
		if (wrongUser.USER_CITY) {
			updateData.USER_CITY = wrongUser.USER_CITY;
		}
		if (wrongUser.USER_WORK) {
			updateData.USER_WORK = wrongUser.USER_WORK;
		}
		if (wrongUser.USER_TRADE) {
			updateData.USER_TRADE = wrongUser.USER_TRADE;
		}

		// 4. 更新正确用户
		let updateResult = null;
		if (Object.keys(updateData).length > 0) {
			updateData.USER_EDIT_TIME = timeUtil.time();
			await UserModel.edit(correctWhere, updateData, false);
			updateResult = updateData;
		}

		// 5. 删除错误用户
		await UserModel.del(wrongWhere, false);

		// 6. 查询更新后的正确用户
		let updatedCorrectUser = await UserModel.getOne(correctWhere, '*', {}, false);

		return {
			success: true,
			message: '用户数据修复成功',
			deleted: {
				_id: wrongUser._id,
				USER_NAME: wrongUser.USER_NAME,
				USER_MINI_OPENID: wrongUser.USER_MINI_OPENID
			},
			merged: updateResult,
			correctUser: {
				_id: updatedCorrectUser._id,
				USER_ACCOUNT: updatedCorrectUser.USER_ACCOUNT,
				USER_ID: updatedCorrectUser.USER_ID,
				USER_NAME: updatedCorrectUser.USER_NAME,
				USER_MOBILE: updatedCorrectUser.USER_MOBILE
			}
		};
	}

	/**
	 * 更新测试用户（修复字段格式问题）
	 * 解决 USER_STATUS 为字符串"1"而非整数1的问题
	 */
	async updateTestUser() {
		const account = this._request.account || 'testuser';

		// 1. 查找用户 (mustPID = false，因为 testuser 可能没有 _pid 字段)
		let where = {
			USER_ACCOUNT: account
		};
		let user = await UserModel.getOne(where, '*', {}, false);

		if (!user) {
			return {
				success: false,
				message: `用户 ${account} 不存在`
			};
		}

		// 2. 生成 USER_ID（如果不存在）
		let userId = user.USER_ID || timeUtil.time('YMDhms') + Math.random().toString().substr(2, 3);
		const nowTimestamp = timeUtil.time();

		// 3. 准备更新数据（补全所有必要字段）
		let updateData = {
			// 必须字段
			_pid: config.PID,  // 'A00'
			USER_ID: userId,
			USER_STATUS: 1,  // 确保是整数

			// 个人信息
			USER_NAME: user.USER_NAME || 'Web测试用户',
			USER_MOBILE: user.USER_MOBILE || '18888888888',
			USER_AVATAR: user.USER_AVATAR || '',

			// 扩展信息
			USER_WORK: user.USER_WORK || 'Test Company',
			USER_CITY: user.USER_CITY || 'Chicago',
			USER_TRADE: user.USER_TRADE || 'IT',

			// 登录信息
			USER_LOGIN_CNT: (user.USER_LOGIN_CNT || 0),
			USER_LOGIN_TIME: user.USER_LOGIN_TIME || 0,

			// 时间戳
			USER_ADD_TIME: user.USER_ADD_TIME || nowTimestamp,
			USER_EDIT_TIME: nowTimestamp,

			// 来源标记
			USER_SOURCE: 'web'
		};

		// 4. 更新数据库 (mustPID = false，因为原记录可能没有 _pid)
		await UserModel.edit(where, updateData, false);

		// 5. 查询更新后的数据验证 (现在有 _pid 了，可以用默认查询)
		let updatedUser = await UserModel.getOne(where, '*', {}, false);

		return {
			success: true,
			message: `用户 ${account} 更新成功`,
			before: {
				USER_STATUS: user.USER_STATUS,
				USER_STATUS_TYPE: typeof user.USER_STATUS,
				USER_ID: user.USER_ID,
				_pid: user._pid
			},
			after: {
				USER_STATUS: updatedUser.USER_STATUS,
				USER_STATUS_TYPE: typeof updatedUser.USER_STATUS,
				USER_ID: updatedUser.USER_ID,
				_pid: updatedUser._pid
			},
			userData: updatedUser
		};
	}

	/**
	 * 检查所有 meet 的 MEET_COST_SET 状态
	 */
	async checkMeetCost() {
		let meets = await MeetModel.getAll({}, 'MEET_TITLE,MEET_COST_SET,MEET_STATUS', {}, true);

		return {
			total: meets.length,
			meets: meets.map(m => ({
				_id: m._id,
				title: m.MEET_TITLE,
				status: m.MEET_STATUS,
				costSet: m.MEET_COST_SET || '(未设置)'
			}))
		};
	}

	/**
	 * 更新所有 meet 的 MEET_COST_SET，启用付费预约
	 */
	async updateMeetCost() {
		const costType = this._request.costType || 'both';
		const timesCost = this._request.timesCost || 1;
		const balanceCost = this._request.balanceCost || 50;

		let meets = await MeetModel.getAll({}, '_id,MEET_TITLE,MEET_COST_SET', {}, true);

		let updated = [];
		for (let meet of meets) {
			let newCostSet = {
				isEnabled: true,
				costType: costType,
				timesCost: timesCost,
				balanceCost: balanceCost,
				allowAutoSelect: true
			};

			await MeetModel.edit(meet._id, { MEET_COST_SET: newCostSet });
			updated.push({
				_id: meet._id,
				title: meet.MEET_TITLE,
				before: meet.MEET_COST_SET || '(空)',
				after: newCostSet
			});
		}

		return {
			success: true,
			message: `已更新 ${updated.length} 个课程的 MEET_COST_SET`,
			updated
		};
	}

	/**
	 * 测试搜索用户（与 admin/user_search 相同逻辑，无需 admin 权限）
	 */
	async testSearchUser() {
		const AdminUserCardService = require('../../service/admin/admin_user_card_service.js');
		const keyword = this._request.keyword;
		if (!keyword) return { success: false, message: '请提供 keyword 参数' };

		let service = new AdminUserCardService();
		let result = await service.searchUser(keyword.trim());

		if (!result) return { success: false, message: '未找到匹配的用户' };

		return {
			matchedBy: result.matchedBy,
			userId: result.userId,
			userName: result.user?.USER_NAME,
			userAccount: result.user?.USER_ACCOUNT,
			totalBalance: result.totalBalance,
			totalTimes: result.totalTimes,
			cardsCount: result.cards?.list?.length || 0,
			cards: (result.cards?.list || []).map(c => ({
				name: c.USER_CARD_CARD_NAME,
				type: c.USER_CARD_TYPE,
				status: c.USER_CARD_STATUS,
				remainTimes: c.USER_CARD_REMAIN_TIMES,
				remainAmount: c.USER_CARD_REMAIN_AMOUNT
			}))
		};
	}

	/**
	 * 检查用户的卡项（诊断用）
	 */
	async checkUserCards() {
		const userId = this._request.userId;
		if (!userId) {
			return { success: false, message: '请提供 userId 参数' };
		}

		// 查所有卡项（不限 _pid）
		let allCards = await UserCardModel.getAll(
			{ USER_CARD_USER_ID: userId },
			'*', {}, false
		);

		// 查 _pid 过滤的卡项
		let pidCards = await UserCardModel.getAll(
			{ USER_CARD_USER_ID: userId },
			'*', {}, true
		);

		return {
			userId,
			allCardsCount: allCards.length,
			pidCardsCount: pidCards.length,
			allCards: allCards.map(c => ({
				_id: c._id,
				_pid: c._pid,
				name: c.USER_CARD_CARD_NAME,
				type: c.USER_CARD_TYPE,
				status: c.USER_CARD_STATUS,
				remainTimes: c.USER_CARD_REMAIN_TIMES,
				remainAmount: c.USER_CARD_REMAIN_AMOUNT,
				userId: c.USER_CARD_USER_ID,
				expireTime: c.USER_CARD_EXPIRE_TIME,
				addTime: c.USER_CARD_ADD_TIME
			}))
		};
	}

}

module.exports = TestController;