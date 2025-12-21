const pageHelper = require('../helper/page_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const cacheHelper = require('../helper/cache_helper.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoading: false,
		carouselList: [],
		instructorList: [],
		currentCarouselIndex: 0
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) { 
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		_loadCarousel: async function () {
			const CACHE_KEY = 'CAROUSEL_LIST';
			const CACHE_TIME = 60 * 30; // 30分钟
			const DEFAULT_CAROUSEL = [{
				CAROUSEL_PIC: '../../skin/images/default_index_bg.png',
				CAROUSEL_URL: '',
				_id: 'default'
			}];

			try {
				// 1. 尝试从缓存读取
				let cachedData = cacheHelper.get(CACHE_KEY);
				if (cachedData && cachedData.length > 0) {
					this.setData({ carouselList: cachedData });
					return;
				}

				// 2. 从云端获取
				let opts = {
					title: 'bar'
				}
				await cloudHelper.callCloudSumbit('carousel/list', {}, opts).then(res => {
					let list = res.data.list || [];

					// 3. 空数据处理：使用默认轮播图
					if (list.length === 0) {
						list = DEFAULT_CAROUSEL;
					} else {
						// 4. 仅缓存有效数据（非默认图）
						cacheHelper.set(CACHE_KEY, list, CACHE_TIME);
					}

					this.setData({ carouselList: list });
				});
			} catch (err) {
				console.error('加载轮播图失败:', err);
				// 5. 错误时使用默认图片
				this.setData({ carouselList: DEFAULT_CAROUSEL });
			}
		},

		_loadInstructor: async function () {
			const CACHE_KEY = 'INSTRUCTOR_LIST_V2';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY = 'INSTRUCTOR_LIST_TIMESTAMP';

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(CACHE_KEY);
				let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
				let now = Date.now();

				// 如果有缓存,先显示缓存内容(避免白屏)
				if (cachedData && cachedData.length > 0) {
					this.setData({ instructorList: cachedData });

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						return;
					}
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let opts = {
					title: 'bar'
				}

				let result = await cloudHelper.callCloudData('instructor/list', {}, opts);

				let list = [];
				if (result && result.list) {
					list = result.list;
				} else if (result && Array.isArray(result)) {
					list = result;
				}

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
					this.setData({ instructorList: list });

					if (list.length > 0) {
						cacheHelper.set(CACHE_KEY, list, CACHE_TIME);
						cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
					}
				} else {
					// 数据没变化,只更新时间戳
					cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
				}
			} catch (err) {
				console.error('加载导师团队失败:', err);
				// 如果有缓存,继续使用缓存;否则设置空数组
				if (!this.data.instructorList || this.data.instructorList.length === 0) {
					this.setData({ instructorList: [] });
				}
			}
		},

		_loadList: async function () {
			// 防止重复加载
			if (this.data.isLoading) return;

			this.setData({ isLoading: true });
			try {
				await Promise.all([
					this._loadCarousel(),
					this._loadInstructor()
				]);
			} catch (err) {
				console.error('加载数据失败:', err);
			} finally {
				this.setData({ isLoading: false });
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			await this._loadList(); 
		},

		onPullDownRefresh: async function () {
			// 清除缓存，强制重新加载
			cacheHelper.remove('CAROUSEL_LIST');
			cacheHelper.remove('INSTRUCTOR_LIST');
			cacheHelper.remove('INSTRUCTOR_LIST_V2');
			cacheHelper.remove('INSTRUCTOR_LIST_TIMESTAMP');
			await this._loadList();
			wx.stopPullDownRefresh();
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

		url: async function (e) {
			pageHelper.url(e, this);
		},

		onCarouselTap: function (e) {
			let url = e.currentTarget.dataset.url;
			if (url) {
				pageHelper.url(e, this);
			}
		},

		/**
		 * 轮播图切换事件
		 */
		onCarouselChange: function (e) {
			this.setData({
				currentCarouselIndex: e.detail.current
			});
		},

		/**
		 * 轮播图按钮点击事件
		 * 支持跳转到页面或外部链接
		 */
		onCarouselButtonTap: function (e) {
			// 获取当前显示的轮播图数据
			let currentIndex = this.data.currentCarouselIndex || 0;
			let carouselList = this.data.carouselList || [];

			if (carouselList.length === 0) {
				wx.showToast({
					title: '敬请期待',
					icon: 'none',
					duration: 2000
				});
				return;
			}

			let currentCarousel = carouselList[currentIndex];
			let url = currentCarousel.CAROUSEL_URL;

			if (!url) {
				// 如果没有设置跳转链接，默认跳转到预约页面
				wx.navigateTo({
					url: '/projects/A00/meet/index/meet_index'
				});
				return;
			}

			// 判断是外部链接还是小程序页面路径
			if (url.startsWith('http://') || url.startsWith('https://')) {
				// 外部链接 - 复制到剪贴板
				wx.setClipboardData({
					data: url,
					success: function () {
						wx.showToast({
							title: '链接已复制',
							icon: 'success',
							duration: 2000
						});
					}
				});
			} else {
				// 内部页面路径
				wx.navigateTo({
					url: url,
					fail: function () {
						// 如果跳转失败，可能是 tabBar 页面，使用 switchTab
						wx.switchTab({
							url: url,
							fail: function () {
								wx.showToast({
									title: '页面不存在',
									icon: 'none',
									duration: 2000
								});
							}
						});
					}
				});
			}
		},

		showComingSoon: function () {
			wx.showToast({
				title: '敬请期待',
				icon: 'none',
				duration: 2000
			});
		},

		onInstructorTap: function (e) {
			const id = e.currentTarget.dataset.id;

			// 如果没有导师数据，显示敬请期待
			if (!this.data.instructorList || this.data.instructorList.length === 0) {
				wx.showToast({
					title: '敬请期待',
					icon: 'none',
					duration: 2000
				});
				return;
			}

			// 如果有ID，跳转到导师详情页
			if (id) {
				wx.navigateTo({
					url: '/projects/A00/instructor/detail/instructor_detail?id=' + id
				});
			} else {
				// 没有传ID，显示敬请期待
				wx.showToast({
					title: '敬请期待',
					icon: 'none',
					duration: 2000
				});
			}
		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},
	}
})