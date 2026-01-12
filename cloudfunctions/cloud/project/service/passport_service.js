/**
 * Notes: passport模块业务逻辑 
 * Date: 2025-10-14 07:48:00 
 */

const BaseService = require('./base_service.js');

const cloudBase = require('../../framework/cloud/cloud_base.js');
const UserModel = require('../model/user_model.js');
const timeUtil = require('../../framework/utils/time_util.js');

class PassportService extends BaseService {

	// 插入用户
	async insertUser(userId, mobile, name = '', joinCnt = 0) {
		// 判断是否存在
		let where = {
			USER_MINI_OPENID: userId
		}
		let cnt = await UserModel.count(where);
		if (cnt > 0) return;

		// 入库
		let data = {
			USER_MINI_OPENID: userId,
			USER_MOBILE: mobile,
			USER_NAME: name
		}
		await UserModel.insert(data);
	}

	/** 获取手机号码 */
	async getPhone(cloudID) {
		let cloud = cloudBase.getCloud();
		let res = await cloud.getOpenData({
			list: [cloudID], // 假设 event.openData.list 是一个 CloudID 字符串列表
		});
		if (res && res.list && res.list[0] && res.list[0].data) {

			let phone = res.list[0].data.phoneNumber;

			return phone;
		} else
			return '';
	}

	/** 取得我的用户信息 */
	async getMyDetail(userId) {
		let where = {
			USER_MINI_OPENID: userId
		}
		let fields = 'USER_MOBILE,USER_NAME,USER_CITY,USER_TRADE,USER_WORK'
		return await UserModel.getOne(where, fields);
	}

	/** 修改用户资料 */
	async editBase(userId, {
		mobile,
		name,
		trade,
		work,
		city
	}) {
		let where = {
			USER_MINI_OPENID: userId
		};
		// 判断是否存在
		let cnt = await UserModel.count(where);
		if (cnt == 0) {
			await this.insertUser(userId, mobile, name, 0);
			return;
		}

		let data = {
			USER_MOBILE: mobile,
			USER_NAME: name,
			USER_CITY: city,
			USER_WORK: work,
			USER_TRADE: trade
		};

		await UserModel.edit(where, data);

	}

	/** 用户注册 */
	async register({
		account,
		password,
		name = '',
		mobile = ''
	}) {
		// 1. 检查账号是否已存在
		let where = {
			USER_ACCOUNT: account
		};
		let cnt = await UserModel.count(where);
		if (cnt > 0) {
			this.AppError('该账号已存在');
		}

		// 2. 生成用户ID（格式：年月日时分秒毫秒）
		let userId = timeUtil.time('YMDhms') + Math.random().toString().substr(2, 3);

		// 3. 插入用户数据
		let data = {
			USER_ID: userId,
			USER_MINI_OPENID: 'manual_' + userId,  // 手动注册的用户使用特殊openid
			USER_ACCOUNT: account,
			USER_PASSWORD: password,
			USER_NAME: name || account,
			USER_MOBILE: mobile,
			USER_STATUS: 1,
			USER_LOGIN_CNT: 0,
			USER_LOGIN_TIME: 0,
			USER_TOKEN: '',
			USER_TOKEN_TIME: 0
		};

		// UserModel.insert 会自动添加 _pid
		let result = await UserModel.insert(data, true);

		return {
			userId: userId,
			account: account,
			name: name || account,
			msg: '注册成功'
		};
	}


}

module.exports = PassportService;