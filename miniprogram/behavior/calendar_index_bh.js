const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const timeHelper = require('../helper/time_helper.js');
const cacheHelper = require('../helper/cache_helper.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		list: [],

		day: '',
		hasDays: []
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		_loadList: async function () {
			const CACHE_KEY_PREFIX = 'MEET_LIST_';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY_PREFIX = 'MEET_LIST_TIMESTAMP_';

			let day = this.data.day;
			let cacheKey = CACHE_KEY_PREFIX + day; // 按日期缓存
			let timestampKey = CACHE_TIMESTAMP_KEY_PREFIX + day;

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(cacheKey);
				let cacheTimestamp = cacheHelper.get(timestampKey);
				let now = Date.now();

				// 如果有缓存,先显示缓存内容(避免白屏)
				if (cachedData) {
					this.setData({
						list: cachedData,
						isLoad: true
					});

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						return;
					}
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let params = {
					day: day
				}
				let opts = {
					title: this.data.isLoad ? 'bar' : 'bar'
				}

				if (!cachedData) {
					this.setData({ list: null });
				}

				await cloudHelper.callCloudSumbit('meet/list_by_day', params, opts).then(res => {
					let list = res.data || [];

					// 3. 对比数据是否有变化
					let hasChanged = false;
					if (!cachedData || cachedData.length !== list.length) {
						hasChanged = true;
					} else {
						// 简单对比:检查ID列表是否一致
						let cachedIds = cachedData.map(item => item._id).sort().join(',');
						let newIds = list.map(item => item._id).sort().join(',');
						if (cachedIds !== newIds) {
							hasChanged = true;
						}
					}

					// 4. 如果数据有变化,更新界面和缓存
					if (hasChanged || !cachedData) {
						this.setData({
							list: list,
							isLoad: true
						});

						if (list.length > 0) {
							cacheHelper.set(cacheKey, list, CACHE_TIME);
							cacheHelper.set(timestampKey, now, CACHE_TIME);
						}
					} else {
						// 数据没变化,只更新时间戳
						cacheHelper.set(timestampKey, now, CACHE_TIME);
					}
				});
			} catch (err) {
				console.error('加载预约列表失败:', err);
				// 如果有缓存,继续使用缓存;否则设置空数组
				if (!this.data.list) {
					this.setData({
						list: [],
						isLoad: true
					});
				}
			}
		},

		_loadHasList: async function () {
			const CACHE_KEY = 'MEET_HAS_DAYS';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY = 'MEET_HAS_DAYS_TIMESTAMP';

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(CACHE_KEY);
				let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
				let now = Date.now();

				// 如果有缓存,先显示缓存内容
				if (cachedData) {
					this.setData({
						hasDays: cachedData
					});

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						return;
					}
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let params = {
					day: timeHelper.time('Y-M-D')
				}
				let opts = {
					title: 'bar'
				}
				await cloudHelper.callCloudSumbit('meet/list_has_day', params, opts).then(res => {
					let hasDays = res.data || [];

					// 3. 对比数据是否有变化
					let hasChanged = false;
					if (!cachedData || cachedData.length !== hasDays.length) {
						hasChanged = true;
					} else {
						// 简单对比:检查日期列表是否一致
						let cachedDays = cachedData.sort().join(',');
						let newDays = hasDays.sort().join(',');
						if (cachedDays !== newDays) {
							hasChanged = true;
						}
					}

					// 4. 如果数据有变化,更新界面和缓存
					if (hasChanged || !cachedData) {
						this.setData({
							hasDays: hasDays
						});

						if (hasDays.length > 0) {
							cacheHelper.set(CACHE_KEY, hasDays, CACHE_TIME);
							cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
						}
					} else {
						// 数据没变化,只更新时间戳
						cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
					}
				});
			} catch (err) {
				console.error('加载可预约日期失败:', err);
				// 如果有缓存,继续使用缓存;否则设置空数组
				if (!this.data.hasDays || this.data.hasDays.length === 0) {
					this.setData({
						hasDays: []
					});
				}
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {

		},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			this.setData({
				day: timeHelper.time('Y-M-D')
			});
			await this._loadHasList();
			await this._loadList();
		},

		/**
		 * 生命周期函数--监听页面隐藏
		 */
		onHide: function () {

		},

		/**
		 * 生命周期函数--监听页面卸载
		 */
		onUnload: function () {

		},

		/**
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			// 清除缓存，强制重新加载
			cacheHelper.remove('MEET_HAS_DAYS');
			cacheHelper.remove('MEET_HAS_DAYS_TIMESTAMP');

			// 清除所有日期的预约列表缓存(需要手动清除,因为是按日期的key)
			// 这里只清除当前日期的缓存,其他日期的缓存会在30分钟后自动失效
			let currentDay = this.data.day;
			if (currentDay) {
				cacheHelper.remove('MEET_LIST_' + currentDay);
				cacheHelper.remove('MEET_LIST_TIMESTAMP_' + currentDay);
			}

			await this._loadHasList();
			await this._loadList();
			wx.stopPullDownRefresh();
		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindClickCmpt: async function (e) {
			let day = e.detail.day;
			this.setData({
				day
			}, async () => {
				await this._loadList();
			});
		},

		bindMonthChangeCmpt: function (e) {
			console.log(e.detail)
		},

		url: async function (e) {
			pageHelper.url(e, this);
		},
	}
})