/**
 * Notes: 后台HOME/登录模块
 * Date: 2025-03-15 07:48:00
 */

const BaseAdminService = require('./base_admin_service.js');

const dataUtil = require('../../../framework/utils/data_util.js');
const cacheUtil = require('../../../framework/utils/cache_util.js');

const cloudBase = require('../../../framework/cloud/cloud_base.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const config = require('../../../config/config.js');
const AdminModel = require('../../model/admin_model.js');
const LogModel = require('../../model/log_model.js');
const httpAuth = require('../../../framework/middleware/http_auth.js');

const UserModel = require('../../model/user_model.js');
const MeetModel = require('../../model/meet_model.js');
const NewsModel = require('../../model/news_model.js');
const JoinModel = require('../../model/join_model.js');
const dataUtil = require('../../../framework/utils/data_util.js');

class AdminHomeService extends BaseAdminService {

	/**
	 * 首页数据归集
	 */
	async adminHome() {
		let where = {};

		let userCnt = await UserModel.count(where);
		let meetCnt = await MeetModel.count(where);
		let newsCnt = await NewsModel.count(where);
		let joinCnt = await JoinModel.count(where);
		return {
			userCnt,
			meetCnt,
			newsCnt,
			joinCnt
		}
	}

	/** 清除缓存 */
	async clearCache() {
		await cacheUtil.clear();
	}

	/**
	 * 统一登录接口（支持管理员和普通用户）
	 * @param {*} name - 账号
	 * @param {*} password - 密码
	 */
	async adminLogin(name, password) {
		// 1. 首先尝试管理员登录
		if (name === config.ADMIN_NAME && password === config.ADMIN_PWD) {
			// 判断管理员是否存在
			let where = {
				ADMIN_STATUS: 1
			}
			let fields = 'ADMIN_ID,ADMIN_NAME,ADMIN_TYPE,ADMIN_LOGIN_TIME,ADMIN_LOGIN_CNT';
			let admin = await AdminModel.getOne(where, fields);
			if (!admin)
				this.AppError('管理员不存在');

			let cnt = admin.ADMIN_LOGIN_CNT;

			// 生成 JWT token（用于 HTTP 认证）和传统 token（用于小程序）
			let jwtToken = httpAuth.generateToken({
				_id: admin.ADMIN_ID,
				ADMIN_NAME: admin.ADMIN_NAME,
				ADMIN_TYPE: admin.ADMIN_TYPE
			});
			let token = dataUtil.genRandomString(32);
			let tokenTime = timeUtil.time();
			let data = {
				ADMIN_TOKEN: token,
				ADMIN_TOKEN_TIME: tokenTime,
				ADMIN_LOGIN_TIME: timeUtil.time(),
				ADMIN_LOGIN_CNT: cnt + 1
			}
			await AdminModel.edit(where, data);

			let type = admin.ADMIN_TYPE;
			let last = (!admin.ADMIN_LOGIN_TIME) ? '尚未登录' : timeUtil.timestamp2Time(admin.ADMIN_LOGIN_TIME);

			// 写日志
			this.insertLog('管理员登录了系统', admin, LogModel.TYPE.SYS);

			return {
				token,
				jwtToken,
				name: admin.ADMIN_NAME,
				type,
				last,
				cnt,
				role: 'admin',  // 标记为管理员
				userId: admin.ADMIN_ID
			}
		}

		// 2. 尝试普通用户登录
		let userWhere = {
			USER_ACCOUNT: name,
			USER_STATUS: 1
		}
		let userFields = 'USER_ID,USER_ACCOUNT,USER_PASSWORD,USER_NAME,USER_AVATAR,USER_LOGIN_TIME,USER_LOGIN_CNT';
		let user = await UserModel.getOne(userWhere, userFields);

		if (!user) {
			this.AppError('账号或密码不正确');
		}

		// 验证密码
		if (user.USER_PASSWORD !== password) {
			this.AppError('账号或密码不正确');
		}

		let userCnt = user.USER_LOGIN_CNT || 0;

		// 生成 token
		let userToken = dataUtil.genRandomString(32);
		let userTokenTime = timeUtil.time();
		let userData = {
			USER_TOKEN: userToken,
			USER_TOKEN_TIME: userTokenTime,
			USER_LOGIN_TIME: timeUtil.time(),
			USER_LOGIN_CNT: userCnt + 1
		}
		await UserModel.edit(userWhere, userData);

		let userLast = (!user.USER_LOGIN_TIME) ? '尚未登录' : timeUtil.timestamp2Time(user.USER_LOGIN_TIME);

		return {
			token: userToken,
			name: user.USER_NAME || user.USER_ACCOUNT,
			avatar: user.USER_AVATAR,
			last: userLast,
			cnt: userCnt,
			role: 'user',  // 标记为普通用户
			userId: user.USER_ID
		}
	}


}

module.exports = AdminHomeService;
