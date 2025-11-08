const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cacheHelper = require('../../../../helper/cache_helper.js');

Page({
	data: {
		isLoad: false,
		instructorList: []
	},

	onLoad: async function (options) {
		await this._loadList();
	},

	_loadList: async function () {
		const CACHE_KEY = 'INSTRUCTOR_LIST_V2';
		const CACHE_TIME = 60 * 30; // 30分钟缓存
		const CACHE_TIMESTAMP_KEY = 'INSTRUCTOR_LIST_TIMESTAMP';

		try {
			// 1. 先尝试从缓存读取并显示
			let cachedData = cacheHelper.get(CACHE_KEY);
			let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
			let now = Date.now();

			// 如果有缓存,先显示缓存内容(避免白屏)
			if (cachedData && cachedData.length > 0) {
				this.setData({
					instructorList: cachedData,
					isLoad: true
				});

				// 如果缓存还在有效期内(30分钟),直接返回
				if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
					return;
				}
			} else {
				this.setData({ isLoad: false });
			}

			// 2. 从云端获取最新数据(缓存过期或无缓存时)
			let opts = {
				title: 'bar'
			};

			let result = await cloudHelper.callCloudData('instructor/list', {}, opts);
			let list = result.list || [];

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
					instructorList: list,
					isLoad: true
				});

				if (list.length > 0) {
					cacheHelper.set(CACHE_KEY, list, CACHE_TIME);
					cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
				}
			} else {
				// 数据没变化,只更新时间戳
				cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
				this.setData({ isLoad: true });
			}
		} catch (err) {
			this.setData({
				isLoad: null
			});
		}
	},

	onPullDownRefresh: async function () {
		// 清除缓存，强制重新加载
		cacheHelper.remove('INSTRUCTOR_LIST');
		cacheHelper.remove('INSTRUCTOR_LIST_V2');
		cacheHelper.remove('INSTRUCTOR_LIST_TIMESTAMP');
		await this._loadList();
		wx.stopPullDownRefresh();
	},

	// 点击导师卡片
	onInstructorTap: function (e) {
		const id = e.currentTarget.dataset.id;
		if (id) {
			wx.navigateTo({
				url: '/projects/A00/instructor/detail/instructor_detail?id=' + id
			});
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	}
});
