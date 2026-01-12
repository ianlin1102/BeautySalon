/**
 * Notes: 测试模块控制器
 * Date: 2025-03-15 19:20:00
 */

const BaseController = require('../base_controller.js');
const config = require('../../../config/config.js');
const UserModel = require('../../model/user_model.js');
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

}

module.exports = TestController;