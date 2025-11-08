/**
 * Notes: 注册登录模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-11-14 07:48:00 
 */

const BaseBiz = require('./base_biz.js');
const AdminBiz = require('./admin_biz.js');
const setting = require('../setting/setting.js');
const dataHelper = require('../helper/data_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const cacheHelper = require('../helper/cache_helper.js');

class PassportBiz extends BaseBiz {

	/**
	 * 页面初始化 分包下使用
	 * @param {*} skin   
	 * @param {*} that 
	 * @param {*} isLoadSkin  是否skin加载为data
	 * @param {*} tabIndex 	是否修改本页标题为设定值
	 * @param {*} isModifyNavColor 	是否修改头部导航颜色
	 */
	static async initPage({
		skin,
		that,
		isLoadSkin = false,
		tabIndex = -1,
		isModifyNavColor = true
	}) {

		if (isModifyNavColor) {
			wx.setNavigationBarColor({ //顶部
				backgroundColor: skin.NAV_BG,
				frontColor: skin.NAV_COLOR,
			});
		}


		if (tabIndex > -1) {
			wx.setNavigationBarTitle({
				title: skin.MENU_ITEM[tabIndex]
			});
		}

		skin.IS_SUB = setting.IS_SUB;
		if (isLoadSkin) {
			skin.newsCateArr = dataHelper.getSelectOptions(skin.NEWS_CATE);
			skin.meetTypeArr = dataHelper.getSelectOptions(skin.MEET_TYPE);
			that.setData({
				skin
			});
		}
	}

	static async adminLogin(name, pwd, that) {
		if (name.length < 5 || name.length > 30) {
			wx.showToast({
				title: '账号输入错误(5-30位)',
				icon: 'none'
			});
			return;
		}

		if (pwd.length < 5 || pwd.length > 30) {
			wx.showToast({
				title: '密码输入错误(5-30位)',
				icon: 'none'
			});
			return;
		}

		let params = {
			name,
			pwd
		};
		let opt = {
			title: '登录中'
		};

		try {
			await cloudHelper.callCloudSumbit('admin/login', params, opt).then(res => {
				if (res && res.data && res.data.name) AdminBiz.adminLogin(res.data);

				wx.reLaunch({
					url: '/pages/admin/index/home/admin_home',
				});
			});
		} catch (e) {
			console.log(e);
		}

	}

	// 新增：获取积分信息
	static async getPointsInfo() {
		const CACHE_KEY = 'USER_POINTS_INFO';
		const CACHE_TIME = 60 * 30; // 30分钟

		const DEFAULT_POINTS = {
			totalPoints: 0,
			currentLevel: { name: '新手会员', color: '#95a5a6' },
			needPoints: 100,
			progressPercent: 0,
			recentHistory: []
		};

		try {
			// 1. 尝试从缓存读取
			let cachedData = cacheHelper.get(CACHE_KEY);
			if (cachedData) {
				console.log('📦 从缓存加载积分信息');
				return cachedData;
			}

			// 2. 从云端获取
			let res = await cloudHelper.callCloudSumbit('points/my_info', {});
			console.log('💰 从云端加载积分信息');

			// 检查返回数据格式
			let pointsData = res;
			if (res && res.data) {
				pointsData = res.data;
			}

			// 确保返回数据格式正确
			if (pointsData && pointsData.totalPoints !== undefined) {
				// 3. 保存到缓存
				cacheHelper.set(CACHE_KEY, pointsData, CACHE_TIME);
				return pointsData;
			} else {
				console.log('积分数据格式不正确，使用默认值');
				return DEFAULT_POINTS;
			}
		} catch (e) {
			console.error('获取积分信息失败:', e);
			return DEFAULT_POINTS;
		}
	}

	// 新增：获取积分历史
	static async getPointsHistory(page = 1, size = 20) {
		const CACHE_KEY_PREFIX = 'USER_POINTS_HISTORY_';
		const CACHE_TIME = 60 * 30; // 30分钟

		// 按页码和大小缓存
		let cacheKey = CACHE_KEY_PREFIX + page + '_' + size;

		try {
			// 1. 尝试从缓存读取
			let cachedData = cacheHelper.get(cacheKey);
			if (cachedData) {
				console.log('📦 从缓存加载积分历史: page', page);
				return cachedData;
			}

			// 2. 从云端获取
			let res = await cloudHelper.callCloudSumbit('points/my_history', {
				page: page,
				size: size
			});
			console.log('💰 从云端加载积分历史: page', page);

			// 3. 保存到缓存
			if (res && res.list && res.list.length > 0) {
				cacheHelper.set(cacheKey, res, CACHE_TIME);
			}

			return res;
		} catch (e) {
			console.error('获取积分历史失败:', e);
			return { list: [], total: 0 };
		}
	}

	// 新增：清除积分缓存
	static clearPointsCache() {
		cacheHelper.remove('USER_POINTS_INFO');
		cacheHelper.remove('USER_POINTS_HISTORY_'); // 清除所有历史记录缓存
		console.log('🗑️ 已清除积分缓存');
	}

	// 新增：测试云函数时间
	static async testServerTime() {
		try {
			let res = await cloudHelper.callCloudSumbit('points/test', {});
			console.log('云函数时间测试结果:', res);
			return res;
		} catch (e) {
			console.error('测试云函数时间失败:', e);
			throw e;
		}
	}

}

module.exports = PassportBiz;