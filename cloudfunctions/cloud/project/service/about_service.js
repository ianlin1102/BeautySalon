/**
 * Notes: 关于我们服务
 * Date: 2025-11-06
 */

const BaseService = require('./base_service.js');
const AboutModel = require('../model/about_model.js');

class AboutService extends BaseService {

	/** 获取关于我们信息 */
	async getAboutDetail() {
		let fields = 'ABOUT_TITLE,ABOUT_CONTENT,ABOUT_PIC';

		// 使用固定ID 'about' 存储单条记录
		let where = {
			ABOUT_ID: 'about'
		};
		let about = await AboutModel.getOne(where, fields);

		// 如果不存在，返回空对象
		if (!about) {
			return {
				ABOUT_TITLE: '关于我们',
				ABOUT_CONTENT: [],
				ABOUT_PIC: []
			};
		}

		return about;
	}
}

module.exports = AboutService;
