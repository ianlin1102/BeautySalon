/**
 * Notes: 设置管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const SetupModel = require('../../model/setup_model.js');
const UserModel = require('../../model/user_model.js');
const config = require('../../../config/config.js');

class AdminSetupService extends BaseAdminService {


	/** 关于我们 (含联系方式+导师+QR) */
	async setupAbout({
		about,
		aboutEn,
		featuredInstructors,
		address,
		addressEn,
		phone,
		hours,
		hoursEn,
		wechat,
		servicePic,
		officePic,
	}) {
		// Limit featured instructors to 4
		if (featuredInstructors && featuredInstructors.length > 4) {
			featuredInstructors = featuredInstructors.slice(0, 4);
		}

		let data = {
			SETUP_ABOUT: about || '',
			SETUP_ABOUT_EN: aboutEn || '',
			SETUP_FEATURED_INSTRUCTORS: featuredInstructors || [],
			SETUP_ADDRESS: address || '',
			SETUP_ADDRESS_EN: addressEn || '',
			SETUP_PHONE: phone || '',
			SETUP_HOURS: hours || '',
			SETUP_HOURS_EN: hoursEn || '',
			SETUP_WECHAT: wechat || '',
			SETUP_SERVICE_PIC: servicePic || [],
			SETUP_OFFICE_PIC: officePic || [],
		};

		let setup = await SetupModel.getOne({});
		if (setup) {
			await SetupModel.edit({}, data);
		} else {
			await SetupModel.insert(data);
		}
	}

	/** 联系我们设置 (保留兼容) */
	async setupContact({
		address,
		phone,
		officePic,
		servicePic,
	}) {
		let data = {
			SETUP_ADDRESS: address || '',
			SETUP_PHONE: phone || '',
			SETUP_SERVICE_PIC: servicePic || [],
			SETUP_OFFICE_PIC: officePic || [],
		};

		let setup = await SetupModel.getOne({});
		if (setup) {
			await SetupModel.edit({}, data);
		} else {
			await SetupModel.insert(data);
		}
	}

	/** 小程序码 */
	async genMiniQr() {
		//生成小程序qr buffer
		let cloud = cloudBase.getCloud();

		let page = "projects/" + this.getProjectId() + "/default/index/default_index";
		console.log(page);

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: 'qr',
			width: 280,
			check_path: false,
			env_version: 'release', //trial,develop
			page
		});

		let upload = await cloud.uploadFile({
			cloudPath: config.SETUP_PATH + 'qr.png',
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		return upload.fileID;
	}

	/** 获取免责声明 */
	async getDisclaimer() {
		let setup = await SetupModel.getOne({});
		if (!setup) {
			return {
				title: '',
				sections: []
			};
		}
		return {
			title: setup.SETUP_DISCLAIMER_TITLE || '',
			sections: setup.SETUP_DISCLAIMER_SECTIONS || []
		};
	}

	/** 保存免责声明 */
	async saveDisclaimer({ title, sections }) {
		let data = {
			SETUP_DISCLAIMER_TITLE: title || '卡项购买免责声明',
			SETUP_DISCLAIMER_SECTIONS: sections || []
		};

		// 检查是否已有设置记录
		let setup = await SetupModel.getOne({});
		if (setup) {
			await SetupModel.edit({}, data);
		} else {
			await SetupModel.insert(data);
		}
	}

	/** 获取条款内容 */
	async getTerms(type) {
		let setup = await SetupModel.getOne({});
		if (!setup) {
			return {
				sections: [],
				version: type === 'user_terms' ? 0 : undefined,
				updateTime: null
			};
		}

		let result = {
			sections: [],
			updateTime: null
		};

		switch (type) {
			case 'card_terms':
				result.sections = setup.SETUP_CARD_TERMS_SECTIONS || [];
				result.updateTime = setup.SETUP_CARD_TERMS_UPDATE_TIME || null;
				break;
			case 'booking_terms':
				result.sections = setup.SETUP_BOOKING_TERMS_SECTIONS || [];
				result.updateTime = setup.SETUP_BOOKING_TERMS_UPDATE_TIME || null;
				break;
			case 'user_terms':
				result.sections = setup.SETUP_USER_TERMS_SECTIONS || [];
				result.version = setup.SETUP_USER_TERMS_VERSION || 0;
				result.updateTime = setup.SETUP_USER_TERMS_UPDATE_TIME || null;
				break;
		}

		return result;
	}

	/** 保存条款内容 */
	async saveTerms(type, sections) {
		let data = {};
		let now = this._timestamp;

		switch (type) {
			case 'card_terms':
				data.SETUP_CARD_TERMS_SECTIONS = sections || [];
				data.SETUP_CARD_TERMS_UPDATE_TIME = now;
				break;
			case 'booking_terms':
				data.SETUP_BOOKING_TERMS_SECTIONS = sections || [];
				data.SETUP_BOOKING_TERMS_UPDATE_TIME = now;
				break;
			case 'user_terms':
				// 用户条款保存时自动递增版本号
				let setup = await SetupModel.getOne({});
				let currentVersion = (setup && setup.SETUP_USER_TERMS_VERSION) || 0;
				data.SETUP_USER_TERMS_SECTIONS = sections || [];
				data.SETUP_USER_TERMS_VERSION = currentVersion + 1;
				data.SETUP_USER_TERMS_UPDATE_TIME = now;

				// 重置所有用户的同意状态
				await UserModel.edit({}, {
					USER_TERMS_AGREED: 0
				}, false);  // false = 不限制 PID
				break;
		}

		// 检查是否已有设置记录
		let existingSetup = await SetupModel.getOne({});
		if (existingSetup) {
			await SetupModel.edit({}, data);
		} else {
			await SetupModel.insert(data);
		}

		// 返回更新后的版本号（仅用户条款）
		if (type === 'user_terms') {
			return { version: data.SETUP_USER_TERMS_VERSION };
		}
		return {};
	}
}

module.exports = AdminSetupService;