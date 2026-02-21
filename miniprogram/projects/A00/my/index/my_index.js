let behavior = require('../../../../behavior/my_index_bh.js');
let PassortBiz = require('../../../../biz/passport_biz.js');
let MgrBiz = require('../../../../biz/mgr_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],

	data: {
		myStats: {  // 统计数据
			cardCount: 0,
			courseCount: 0,
			appointmentCount: 0
		},
		nextAppointment: null,  // 最近一个预约
		isMgrAdmin: false,  // 是否为MGR管理员
		userRole: 'student',  // student | instructor | admin
		userRoleLabel: '学员'
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

			// 2. 检查角色（需要在用户信息加载后）
			await this._checkMgrAccess();

			// 3. 加载预约列表
			if (this._loadTodayList) {
				await this._loadTodayList();
			}

			// 4. 加载统计数据和最近预约
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

			// 2. 加载预约列表
			if (this._loadTodayList) {
				await this._loadTodayList();
			}

			// 3. 加载统计数据和最近预约
			await this.loadMyStats();
			await this.loadNextAppointment();

			// 4. 检查角色
			await this._checkMgrAccess();

		} catch (err) {
			// 静默失败
		}
	},

	// 检查MGR管理员权限并设置角色
	async _checkMgrAccess() {
		if (!PassortBiz.isLoggedIn()) {
			this.setData({
				isMgrAdmin: false,
				userRole: 'student',
				userRoleLabel: '学员'
			});
			return;
		}
		try {
			let mgrInfo = await MgrBiz.checkMgrAccess();
			let isMgr = !!mgrInfo;
			let isSuperAdmin = isMgr && mgrInfo.permissions && mgrInfo.permissions.includes('*');

			let userRole = 'student';
			let userRoleLabel = '学员';
			if (isSuperAdmin) {
				userRole = 'admin';
				userRoleLabel = '管理员';
			} else if (isMgr) {
				userRole = 'staff';
				userRoleLabel = '员工';
			}

			console.log('角色检查结果:', userRoleLabel, mgrInfo);
			this.setData({
				isMgrAdmin: isMgr,
				userRole,
				userRoleLabel
			});
		} catch (e) {
			this.setData({
				isMgrAdmin: false,
				userRole: 'student',
				userRoleLabel: '学员'
			});
		}
	},

	// 加载最近一个预约
	async loadNextAppointment() {
		// 未登录时不加载
		if (!PassortBiz.isLoggedIn()) {
			this.setData({ nextAppointment: null });
			return;
		}

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
		// 未登录时不加载
		if (!PassortBiz.isLoggedIn()) {
			this.setData({
				myStats: { cardCount: 0, courseCount: 0, appointmentCount: 0 }
			});
			return;
		}

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
					// 统计所有可用卡项 (STATUS=1)
					cardCount = cardResult.list.filter(item => item.USER_CARD_STATUS === 1).length;
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
		await this.loadMyStats();
		await this.loadNextAppointment();

		wx.stopPullDownRefresh();
	}
})