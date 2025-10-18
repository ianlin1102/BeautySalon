let behavior = require('../../../../behavior/my_index_bh.js');
let PassortBiz = require('../../../../biz/passport_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],

	data: {
		pointsInfo: null  // 新增：积分信息
	},

	onReady: async function () {
		PassortBiz.initPage({
			skin,
			that: this,
			isLoadSkin: true,
			tabIndex: -1
		});
		
		// 初始加载时也使用优化的加载顺序
		try {
			// 1. 先加载用户信息
			if (this._loadUser) {
				await this._loadUser();
			}
			
			// 2. 再并行加载其他数据
			const promises = [];
			
			if (this._loadTodayList) {
				promises.push(this._loadTodayList());
			}
			
			promises.push(this.getPointsInfo());
			
			await Promise.all(promises);
			
		} catch (err) {
			console.log('页面初始化数据加载出错:', err);
		}
	},

	onShow: async function () {
		try {
			// 优化加载顺序：先加载用户信息，再加载其他数据
			// 1. 加载用户信息
			if (this._loadUser) {
				await this._loadUser();
			}
			
			// 2. 并行加载今日预约和积分信息
			const promises = [];
			
			if (this._loadTodayList) {
				promises.push(this._loadTodayList());
			}
			
			promises.push(this.getPointsInfo());
			
			await Promise.all(promises);
			
		} catch (err) {
			console.log('页面数据加载出错:', err);
		}
	},

	// 新增：获取积分信息方法
	async getPointsInfo() {
		try {
			console.log('my_index.js: 开始获取积分信息');
			let pointsInfo = await PassortBiz.getPointsInfo();
			console.log('my_index.js: 收到积分信息:', pointsInfo);
			
			this.setData({
				pointsInfo: pointsInfo
			});
			console.log('my_index.js: 页面数据已更新');
		} catch (e) {
			console.error('my_index.js: 获取积分信息失败:', e);
			// 设置默认积分信息，避免页面显示异常
			this.setData({
				pointsInfo: {
					totalPoints: 0,
					currentLevel: { name: '新手会员', color: '#95a5a6' },
					needPoints: 100,
					progressPercent: 0,
					recentHistory: []
				}
			});
		}
	},

	bindSetTap: function (e) {
		this.setTap(e, skin);
	},

	// 临时测试方法
	async testPointsAPI() {
		const cloudHelper = require('../../../../helper/cloud_helper.js');
		
		try {
			console.log('正在测试积分API...');
			wx.showLoading({ title: '正在初始化...' });
			
			// 1. 测试基本连接
			let testResult = await cloudHelper.callCloudSumbit('points/test', {});
			console.log('points/test 结果:', testResult);
			
			// 2. 初始化积分系统（创建数据库集合和测试数据）
			let initResult = await cloudHelper.callCloudSumbit('points/init', {});
			console.log('points/init 结果:', initResult);
			
			// 3. 获取积分信息
			let infoResult = await cloudHelper.callCloudSumbit('points/my_info', {});
			console.log('points/my_info 结果:', infoResult);
			
			wx.hideLoading();
			wx.showToast({
				title: '初始化完成！',
				icon: 'success'
			});
			
			// 刷新积分信息
			this.getPointsInfo();
			
		} catch (e) {
			wx.hideLoading();
			console.error('测试失败:', e);
			wx.showToast({
				title: '初始化失败',
				icon: 'error'
			});
		}
	}
})