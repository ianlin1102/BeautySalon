let behavior = require('../../../../behavior/my_index_bh.js');
let PassortBiz = require('../../../../biz/passport_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],

	data: {
		pointsInfo: null,  // 积分信息
		myStats: {  // 统计数据
			cardCount: 0,
			courseCount: 0,
			appointmentCount: 0
		},
		nextAppointment: null  // 最近一个预约
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

			// 2. 并行加载预约和积分信息
			const promises = [];

			if (this._loadTodayList) {
				promises.push(this._loadTodayList());
			}

			promises.push(this.getPointsInfo());

			await Promise.all(promises);

			// 3. 加载统计数据和最近预约
			await this.loadMyStats();
			await this.loadNextAppointment();

		} catch (err) {
			// 静默失败
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

			// 3. 加载统计数据和最近预约
			await this.loadMyStats();
			await this.loadNextAppointment();

		} catch (err) {
			// 静默失败
		}
	},

	// 加载最近一个预约
	async loadNextAppointment() {
		const cloudHelper = require('../../../../helper/cloud_helper.js');
		const timeHelper = require('../../../../helper/time_helper.js');

		try {
			let params = {
				search: '',
				sortType: 'timeasc',  // 按时间正序
				sortVal: '',
				orderBy: {},
				page: 1,
				size: 20,
				isTotal: false
			};
			let opts = { title: 'bar' };
			let result = await cloudHelper.callCloudSumbit('my/my_join_list', params, opts);
			let allJoins = result.data.list || [];

			// 过滤有效预约（未过期且状态为成功）
			let nowTimeStr = timeHelper.time('Y-M-D h:m');
			let futureJoins = allJoins.filter(join => {
				if (join.JOIN_STATUS !== 1) return false;
				if (!join.JOIN_MEET_DAY || !join.JOIN_MEET_TIME_END) return false;
				// 需要解析日期格式，JOIN_MEET_DAY 可能是 "12月3日 (周二)" 格式
				// 这里我们使用原始数据，因为后端已格式化
				return !join.isTimeout;
			});

			// 获取最近一个
			let nextAppointment = futureJoins.length > 0 ? futureJoins[0] : null;

			this.setData({
				nextAppointment: nextAppointment
			});
		} catch (e) {
			this.setData({
				nextAppointment: null
			});
		}
	},

	// 加载统计数据
	async loadMyStats() {
		const cloudHelper = require('../../../../helper/cloud_helper.js');
		const cacheHelper = require('../../../../helper/cache_helper.js');
		const timeHelper = require('../../../../helper/time_helper.js');

		const CACHE_KEY = 'MY_STATS_DATA';
		const CACHE_TIME = 60 * 30; // 30分钟
		const CACHE_TIMESTAMP_KEY = 'MY_STATS_TIMESTAMP';

		try {
			// 1. 先尝试从缓存读取
			let cachedData = cacheHelper.get(CACHE_KEY);
			let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
			let now = Date.now();

			// 如果有缓存且在有效期内，直接使用
			if (cachedData && cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
				this.setData({
					myStats: cachedData
				});
				return;
			}

			// 2. 缓存过期或无缓存，重新获取数据
			let cardCount = 0;
			let appointmentCount = 0;
			let courseCount = 0;

			// 获取卡包数量
			try {
				let cardResult = await cloudHelper.callCloudData('card/my_cards', {
					page: 1,
					size: 1000
				});

				if (cardResult && cardResult.list) {
					cardCount = cardResult.list.length;
				}
			} catch (e) {
				// 静默失败
			}

			// 获取预约数量
			try {
				let params = {
					search: '',
					sortType: '',
					sortVal: '',
					orderBy: {},
					page: 1,
					size: 100,
					isTotal: false
				};
				let opts = { title: 'bar' };
				let result = await cloudHelper.callCloudSumbit('my/my_join_list', params, opts);
				let allJoins = result.data.list || [];

				// 过滤有效预约
				let nowTimeStr = timeHelper.time('Y-M-D h:m');
				let futureJoins = allJoins.filter(join => {
					if (join.JOIN_STATUS !== 1) return false;
					if (!join.JOIN_MEET_DAY || !join.JOIN_MEET_TIME_END) return false;
					try {
						let joinDateTime = join.JOIN_MEET_DAY + ' ' + join.JOIN_MEET_TIME_END;
						return joinDateTime > nowTimeStr;
					} catch (e) {
						return false;
					}
				});

				appointmentCount = futureJoins.length;
			} catch (e) {
				// 静默失败
			}

			// 3. 更新数据和缓存
			let statsData = {
				cardCount: cardCount,
				courseCount: courseCount,
				appointmentCount: appointmentCount
			};

			this.setData({
				myStats: statsData
			});

			// 保存到缓存
			cacheHelper.set(CACHE_KEY, statsData, CACHE_TIME);
			cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
		} catch (e) {
			// 静默失败
		}
	},

	// 新增：获取积分信息方法
	async getPointsInfo() {
		try {
			let pointsInfo = await PassortBiz.getPointsInfo();
			this.setData({
				pointsInfo: pointsInfo
			});
		} catch (e) {
			// 设置默认积分信息，避免页面显示异常
			this.setData({
				pointsInfo: {
					totalPoints: 0,
					currentLevel: {
						name: '新手会员',
						color: '#95a5a6',
						gradientStart: '#bdc3c7',
						gradientEnd: '#7f8c8d',
						shadowColor: 'rgba(149, 165, 166, 0.4)',
						maxPoints: 99
					},
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

	// 下拉刷新
	onPullDownRefresh: async function () {
		const cacheHelper = require('../../../../helper/cache_helper.js');

		// 清除所有缓存，强制重新加载
		cacheHelper.remove('MY_JOIN_LIST');
		cacheHelper.remove('MY_JOIN_LIST_TIMESTAMP');
		cacheHelper.remove('MY_STATS_DATA');
		cacheHelper.remove('MY_STATS_TIMESTAMP');

		// 重新加载数据
		await this._loadTodayList();
		await this._loadUser();
		await this.getPointsInfo();
		await this.loadMyStats();
		await this.loadNextAppointment();

		wx.stopPullDownRefresh();
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