/**
 * Notes: 全局/首页模块业务逻辑
 * Date: 2025-03-15 04:00:00 
 */

const BaseService = require('./base_service.js');

const SetupModel = require('../model/setup_model.js');
const InstructorModel = require('../model/instructor_model.js');
const cloudUtil = require('../../framework/cloud/cloud_util.js');
const dataUtil = require('../../framework/utils/data_util.js');
const config = require('../../config/config.js');

class HomeService extends BaseService {
	/**
	 * 取得系统设置
	 * @param {*} param0
	 */
	async getSetup(fields = '*') {
		let where = {}
		let setup = await SetupModel.getOne(where, fields);

		if (!setup) {
			let data = {
				SETUP_ABOUT: '关于我们'
			};
			await SetupModel.insert(data);
			setup = await SetupModel.getOne(where, fields);
		}
		return setup;

	}

	/**
	 * 获取 About 页面完整数据 (公开)
	 */
	async getAboutData() {
		let fields = 'SETUP_ABOUT,SETUP_ABOUT_EN,SETUP_ADDRESS,SETUP_ADDRESS_EN,SETUP_PHONE,SETUP_HOURS,SETUP_HOURS_EN,SETUP_WECHAT,SETUP_SERVICE_PIC,SETUP_OFFICE_PIC,SETUP_FEATURED_INSTRUCTORS';
		let setup = await SetupModel.getOne({}, fields);
		if (!setup) setup = {};

		// Fetch featured instructors
		let instructors = [];
		let featuredIds = setup.SETUP_FEATURED_INSTRUCTORS || [];
		if (featuredIds.length > 0) {
			let instrFields = 'INSTRUCTOR_NAME,INSTRUCTOR_NAME_EN,INSTRUCTOR_PIC,INSTRUCTOR_SPECIALTY,INSTRUCTOR_SPECIALTY_EN,INSTRUCTOR_DESC,INSTRUCTOR_DESC_EN';
			for (let id of featuredIds) {
				let instr = await InstructorModel.getOne({ _id: id, INSTRUCTOR_STATUS: 1 }, instrFields);
				if (instr) {
					// Convert cloud:// to temp HTTPS URL
					if (instr.INSTRUCTOR_PIC && instr.INSTRUCTOR_PIC.startsWith('cloud://')) {
						try {
							let tempUrl = await cloudUtil.getTempFileURLOne(instr.INSTRUCTOR_PIC);
							if (tempUrl) instr.INSTRUCTOR_PIC = tempUrl;
						} catch (e) { }
					}
					instructors.push({
						name: instr.INSTRUCTOR_NAME || '',
						nameEn: instr.INSTRUCTOR_NAME_EN || '',
						pic: instr.INSTRUCTOR_PIC || '',
						specialty: instr.INSTRUCTOR_SPECIALTY || '',
						specialtyEn: instr.INSTRUCTOR_SPECIALTY_EN || '',
						desc: instr.INSTRUCTOR_DESC || '',
						descEn: instr.INSTRUCTOR_DESC_EN || '',
					});
				}
			}
		}

		// Convert QR cloud:// URLs
		let servicePic = '';
		let officePic = '';
		let servicePicArr = setup.SETUP_SERVICE_PIC || [];
		let officePicArr = setup.SETUP_OFFICE_PIC || [];
		if (servicePicArr.length > 0 && servicePicArr[0].startsWith('cloud://')) {
			try { servicePic = await cloudUtil.getTempFileURLOne(servicePicArr[0]) || ''; } catch (e) { }
		} else if (servicePicArr.length > 0) {
			servicePic = servicePicArr[0];
		}
		if (officePicArr.length > 0 && officePicArr[0].startsWith('cloud://')) {
			try { officePic = await cloudUtil.getTempFileURLOne(officePicArr[0]) || ''; } catch (e) { }
		} else if (officePicArr.length > 0) {
			officePic = officePicArr[0];
		}

		return {
			story: {
				zh: setup.SETUP_ABOUT || '',
				en: setup.SETUP_ABOUT_EN || '',
			},
			instructors,
			contact: {
				address: setup.SETUP_ADDRESS || '',
				addressEn: setup.SETUP_ADDRESS_EN || '',
				phone: setup.SETUP_PHONE || '',
				hours: setup.SETUP_HOURS || '',
				hoursEn: setup.SETUP_HOURS_EN || '',
				wechat: setup.SETUP_WECHAT || '',
			},
			qr: {
				servicePic,
				officePic,
			}
		};
	}

	/**
	 * 获取免责声明 (公开)
	 */
	async getDisclaimer() {
		let setup = await SetupModel.getOne({}, 'SETUP_DISCLAIMER_TITLE,SETUP_DISCLAIMER_SECTIONS');
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
}

module.exports = HomeService;