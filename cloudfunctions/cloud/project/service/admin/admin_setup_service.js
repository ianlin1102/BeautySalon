/**
 * Notes: 设置管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const SetupModel = require('../../model/setup_model.js');
const config = require('../../../config/config.js');

class AdminSetupService extends BaseAdminService {


	/** 关于我们 */
	async setupAbout({
		about,
		aboutPic
	}) {

		this.AppError('此功能暂不开放，如有需要请加作者微信：cclinux0730');
	}

	/** 联系我们设置 */
	async setupContact({
		address,
		phone,
		officePic,
		servicePic,
	}) {

		this.AppError('此功能暂不开放，如有需要请加作者微信：cclinux0730');
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
}

module.exports = AdminSetupService;