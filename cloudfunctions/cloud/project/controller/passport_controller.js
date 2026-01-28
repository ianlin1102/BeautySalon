/**
 * Notes: passport模块控制器
 * Date: 2025-03-15 19:20:00 
 */

const BaseController = require('./base_controller.js');
const PassportService = require('../service/passport_service.js');
const contentCheck = require('../../framework/validate/content_check.js');
const timeUtil = require('../../framework/utils/time_util.js');
const util = require('../../framework/utils/util.js');
const config = require('../../config/config.js');

class PassportController extends BaseController {

	/** 取得我的用户信息 */
	async getMyDetail() {
		let service = new PassportService();
		return await service.getMyDetail(this._userId);
	}

	/** 微信登录（小程序端使用） */
	async wechatLogin() {
		// _userId 在小程序端就是 openid（由云函数框架自动获取）
		let openid = this._userId;
		if (!openid) {
			this.AppError('获取微信登录信息失败，请重试');
		}

		let service = new PassportService();
		return await service.wechatLogin(openid);
	}

	/** 获取手机号码 */
	async getPhone() {

		// 数据校验
		let rules = {
			cloudID: 'must|string|min:1|max:200|name=cloudID',
		};

		// 取得数据
		let input = this.validateData(rules);


		let service = new PassportService();
		return await service.getPhone(input.cloudID);
	}




	/** 修改用户资料 */
	async editBase() {
		// 数据校验
		let rules = {
			name: 'must|string|min:1|max:20',
			mobile: 'must|string|min:10|max:15|name=手机号',  // 支持不同国家格式
			countryCode: 'string|max:5|name=国家代码',  // 如 +1, +86
			city: 'string|max:100|name=所在城市',
			work: 'string|max:100|name=所在单位',
			trade: 'string|max:100|name=行业领域',
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiClient(input);

		let service = new PassportService();
		return await service.editBase(this._userId, input);
	}

	/** 检查用户名是否可用 */
	async checkUsername() {
		let rules = {
			username: 'must|string|min:3|max:30|name=用户名',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.checkUsername(input.username);
	}

	/** 用户注册 */
	async register() {
		let rules = {
			username: 'must|string|min:3|max:30|name=用户名',
			password: 'must|string|min:6|max:30|name=密码',
			name: 'string|min:1|max:20|name=姓名',
		};

		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiClient(input);

		let service = new PassportService();
		return await service.register(input);
	}

	/** 用户登录（账号密码） */
	async login() {
		let rules = {
			username: 'must|string|min:3|max:30|name=用户名',
			password: 'must|string|min:6|max:30|name=密码',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.login(input);
	}

	/** Google OAuth 认证（使用授权码 - 旧方法） */
	async googleAuth() {
		let rules = {
			code: 'must|string|name=授权码',
			redirectUri: 'must|string|name=重定向URI',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.googleAuth(input);
	}

	/** Google OAuth 认证（使用 ID Token - 推荐，无需服务器访问 Google） */
	async googleAuthWithToken() {
		let rules = {
			idToken: 'must|string|name=ID Token',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.googleAuthWithToken(input);
	}

	/** 关联 Google 账户（旧方法，使用授权码） */
	async linkGoogle() {
		let rules = {
			code: 'must|string|name=授权码',
			redirectUri: 'must|string|name=重定向URI',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.linkGoogle(this._userId, input);
	}

	/** 关联 Google 账户（使用 ID Token - 推荐） */
	async linkGoogleWithToken() {
		let rules = {
			idToken: 'must|string|name=ID Token',
		};

		let input = this.validateData(rules);
		let service = new PassportService();
		return await service.linkGoogleWithToken(this._userId, input);
	}

	/** 取消关联 Google 账户 */
	async unlinkGoogle() {
		let service = new PassportService();
		return await service.unlinkGoogle(this._userId);
	}

	/** 获取用户认证方式 */
	async getAuthMethods() {
		let service = new PassportService();
		return await service.getAuthMethods(this._userId);
	}

}

module.exports = PassportController;