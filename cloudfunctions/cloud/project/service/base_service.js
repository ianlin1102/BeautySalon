/**
 * Notes: 业务基类 
 * Date: 2025-03-15 04:00:00 
 */

const AppError = require('../../framework/core/app_error.js');
const appCode = require('../../framework/core/app_code.js');
const timeUtil = require('../../framework/utils/time_util.js');
const dbUtil = require('../../framework/database/db_util.js');
const SetupModel = require('../model/setup_model.js');
const AdminModel = require('../model/admin_model.js');
const NewsModel = require('../model/news_model.js');
const config = require('../../config/config.js');

class BaseService {
	constructor() {
		// 当前时间戳
		this._timestamp = timeUtil.time();

	}

	/**
	 * 抛出异常
	 * @param {*} msg 
	 * @param {*} code 
	 */
	AppError(msg, code = appCode.LOGIC) {
		throw new AppError(msg, code);
	}

	getProjectId() {
		if (global.PID)
			return global.PID;
		else
			return 'unknow';
	}


	async initSetup() {
		// 使用全局变量缓存，避免每次 API 调用都检查集合
		if (global._collectionsChecked) {
			return; // 已检查过，直接跳过
		}

		// 1. 先检查 ax_setup 是否有数据（快速判断是否已初始化）
		if (await dbUtil.isExistCollection('ax_setup')) {
			let setupCnt = await SetupModel.count({});
			if (setupCnt > 0) {
				// 已有数据，标记为已检查，跳过后续所有检查
				global._collectionsChecked = true;
				return;
			}
		}

		// 2. 首次安装：检查并创建缺失的集合
		console.log('### initSetup - 检查集合...');
		let arr = config.COLLECTION_NAME.split('|');
		for (let k in arr) {
			let collectionName = arr[k];
			if (!await dbUtil.isExistCollection(collectionName)) {
				console.log('### Creating missing collection: ' + collectionName);
				await dbUtil.createCollection(collectionName);
			}
		}

		console.log('### initSetup - 初始化默认数据...');

		// 3. 初始化 ax_setup 默认数据
		if (await dbUtil.isExistCollection('ax_setup')) {
			await SetupModel.del({});

			let data = {};
			data.SETUP_ABOUT = '关于我们';
			await SetupModel.insert(data);
		}

		// 4. 初始化 ax_admin 默认数据
		if (await dbUtil.isExistCollection('ax_admin')) {
			await AdminModel.del({});

			let data = {};
			data.ADMIN_NAME = '系统管理员';
			data.ADMIN_PHONE = '13900000000';
			data.ADMIN_TYPE = 1;

			await AdminModel.insert(data);
		}

		// 5. 初始化 ax_news 默认数据
		if (await dbUtil.isExistCollection('ax_news')) {
			await NewsModel.del({});

			let newsArr = config.NEWS_CATE.split(',');
			for (let j in newsArr) {
				let title = newsArr[j].split('=')[1];
				let cateId = newsArr[j].split('=')[0];

				let data = {};
				data.NEWS_TITLE = title + '标题1';
				data.NEWS_DESC = title + '简介1';
				data.NEWS_CATE_ID = cateId;
				data.NEWS_CATE_NAME = title;
				data.NEWS_ADMIN_ID = '1';
				data.NEWS_CONTENT = [{
					type: 'text',
					val: title + '内容1'
				}];
				data.NEWS_PIC = ['../../../../images/default_cover_pic.gif'];

				await NewsModel.insert(data);
			}
		}

		// 初始化完成，标记为已检查
		global._collectionsChecked = true;
	}

}

module.exports = BaseService;