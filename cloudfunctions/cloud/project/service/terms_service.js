/**
 * Notes: 条款模块业务逻辑 (用户端)
 * Date: 2026-01-29
 */

const BaseService = require('./base_service.js');
const SetupModel = require('../model/setup_model.js');
const UserModel = require('../model/user_model.js');
const TermsAgreementModel = require('../model/terms_agreement_model.js');

class TermsService extends BaseService {

	/**
	 * 获取条款内容 (公开)
	 * @param {string} type - 条款类型: card_terms, booking_terms, user_terms
	 */
	async getTerms(type) {
		let fields = '';
		switch (type) {
			case 'card_terms':
				fields = 'SETUP_CARD_TERMS_SECTIONS';
				break;
			case 'booking_terms':
				fields = 'SETUP_BOOKING_TERMS_SECTIONS';
				break;
			case 'user_terms':
				fields = 'SETUP_USER_TERMS_SECTIONS,SETUP_USER_TERMS_VERSION';
				break;
		}

		let setup = await SetupModel.getOne({}, fields);
		if (!setup) {
			return {
				sections: [],
				version: type === 'user_terms' ? 0 : undefined
			};
		}

		let result = { sections: [] };
		switch (type) {
			case 'card_terms':
				result.sections = setup.SETUP_CARD_TERMS_SECTIONS || [];
				break;
			case 'booking_terms':
				result.sections = setup.SETUP_BOOKING_TERMS_SECTIONS || [];
				break;
			case 'user_terms':
				result.sections = setup.SETUP_USER_TERMS_SECTIONS || [];
				result.version = setup.SETUP_USER_TERMS_VERSION || 0;
				break;
		}

		return result;
	}

	/**
	 * 检查用户条款状态
	 * @param {string} userId - 用户ID
	 */
	async checkUserTerms(userId) {
		// 获取当前用户条款版本
		let setup = await SetupModel.getOne({}, 'SETUP_USER_TERMS_VERSION');
		let currentVersion = (setup && setup.SETUP_USER_TERMS_VERSION) || 0;

		if (currentVersion === 0) {
			// 没有设置用户条款，不需要同意
			return {
				needAgree: false,
				currentVersion: 0,
				userVersion: 0
			};
		}

		// 获取用户已同意的版本
		let user = await UserModel.getOne({
			USER_MINI_OPENID: userId
		}, 'USER_TERMS_VERSION');

		// 如果没找到，尝试用 USER_ID 查询
		if (!user) {
			user = await UserModel.getOne({
				USER_ID: userId
			}, 'USER_TERMS_VERSION');
		}

		let userVersion = (user && user.USER_TERMS_VERSION) || 0;

		// 获取 USER_TERMS_AGREED 标记
		let userAgreed = 0;
		if (user) {
			let userFull = await UserModel.getOne({
				USER_MINI_OPENID: userId
			}, 'USER_TERMS_AGREED');
			if (!userFull) {
				userFull = await UserModel.getOne({
					USER_ID: userId
				}, 'USER_TERMS_AGREED');
			}
			userAgreed = (userFull && userFull.USER_TERMS_AGREED) || 0;
		}

		return {
			needAgree: userVersion < currentVersion,
			currentVersion: currentVersion,
			userVersion: userVersion,
			userAgreed: userAgreed
		};
	}

	/**
	 * 同意用户条款（增强版 - 记录完整信息）
	 * @param {string} userId - 用户ID
	 * @param {number} version - 同意的版本号
	 * @param {string} printedName - 用户输入的法律姓名
	 * @param {boolean} checkbox - 是否打勾
	 * @param {object} deviceInfo - 设备信息
	 * @param {string} clientIP - 客户端IP（由控制器传入）
	 */
	async agreeUserTerms(userId, version, printedName, checkbox, deviceInfo, clientIP) {
		// 验证版本号是否为当前版本
		let setup = await SetupModel.getOne({}, 'SETUP_USER_TERMS_VERSION');
		let currentVersion = (setup && setup.SETUP_USER_TERMS_VERSION) || 0;

		if (version !== currentVersion) {
			this.AppError('版本号不匹配，请刷新页面后重试');
		}

		if (!printedName || !printedName.trim()) {
			this.AppError('请输入您的法律姓名');
		}

		if (!checkbox) {
			this.AppError('请勾选同意条款');
		}

		// 获取用户信息以确定 Unique ID
		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, '*');
		let uniqueType = 'wechat';
		let uniqueId = userId;

		if (!user) {
			user = await UserModel.getOne({ USER_ID: userId }, '*');
			if (user) {
				if (user.USER_GOOGLE_ID) {
					uniqueType = 'google';
					uniqueId = user.USER_GOOGLE_EMAIL || user.USER_GOOGLE_ID;
				} else if (user.USER_ACCOUNT) {
					uniqueType = 'username';
					uniqueId = user.USER_ACCOUNT;
				}
			}
		}

		if (!user) {
			this.AppError('用户不存在');
		}

		// 插入同意记录
		let agreementData = {
			AGREE_USER_ID: user._id,
			AGREE_UNIQUE_ID: uniqueId,
			AGREE_UNIQUE_TYPE: uniqueType,
			AGREE_PRINTED_NAME: printedName.trim(),
			AGREE_VERSION: version,
			AGREE_CHECKBOX: checkbox,
			AGREE_IP: clientIP || '',
			AGREE_DEVICE_INFO: deviceInfo || {},
			AGREE_TIME: this._timestamp,
			AGREE_ADD_TIME: this._timestamp,
		};

		await TermsAgreementModel.insert(agreementData);

		// 更新用户的同意状态
		let updateData = {
			USER_TERMS_AGREED: 1,
			USER_TERMS_VERSION: version,
			USER_TERMS_TIME: this._timestamp
		};

		await UserModel.edit(user._id, updateData);

		return { success: true };
	}

	/**
	 * 获取协议记录详情（用于打印PDF）
	 * @param {string} id - 协议记录ID
	 */
	async getAgreementForPrint(id) {
		let agreement = await TermsAgreementModel.getOne(id);
		if (!agreement) return null;

		// 获取用户手机号
		let userWhere = {};
		if (agreement.AGREE_UNIQUE_TYPE === 'wechat') {
			userWhere.USER_MINI_OPENID = agreement.AGREE_UNIQUE_ID;
		} else if (agreement.AGREE_UNIQUE_TYPE === 'google') {
			userWhere.USER_GOOGLE_EMAIL = agreement.AGREE_UNIQUE_ID;
		} else {
			userWhere.USER_ACCOUNT = agreement.AGREE_UNIQUE_ID;
		}
		let user = await UserModel.getOne(userWhere, 'USER_MOBILE');

		// 获取当前条款内容和Logo
		let setup = await SetupModel.getOne({}, 'SETUP_USER_TERMS_SECTIONS,SETUP_COMPANY_LOGO');

		return {
			agreement: {
				AGREE_PRINTED_NAME: agreement.AGREE_PRINTED_NAME,
				AGREE_TIME: agreement.AGREE_TIME,
				AGREE_VERSION: agreement.AGREE_VERSION,
				AGREE_UNIQUE_TYPE: agreement.AGREE_UNIQUE_TYPE
			},
			user: {
				USER_MOBILE: user ? (user.USER_MOBILE || '') : ''
			},
			terms: {
				sections: setup ? (setup.SETUP_USER_TERMS_SECTIONS || []) : []
			},
			logo: setup ? (setup.SETUP_COMPANY_LOGO || '') : ''
		};
	}

	/**
	 * 获取当前用户条款版本（供其他模块调用）
	 */
	async getCurrentUserTermsVersion() {
		let setup = await SetupModel.getOne({}, 'SETUP_USER_TERMS_VERSION');
		return (setup && setup.SETUP_USER_TERMS_VERSION) || 0;
	}
}

module.exports = TermsService;
