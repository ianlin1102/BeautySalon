const cloudHelper = require('../../../helper/cloud_helper.js');
const pageHelper = require('../../../helper/page_helper.js');

Component({
	options: {
		addGlobalClass: true
	},

	/**
	 * 组件的属性列表
	 */
	properties: {
		// 初始榜单类型 'all' 或 'season'
		type: {
			type: String,
			value: 'all'
		},
		// 显示数量限制
		limit: {
			type: Number,
			value: 10
		}
	},

	/**
	 * 组件的初始数据
	 */
	data: {
		currentType: 'all',      // 当前榜单类型
		rankList: [],            // 排行榜数据
		loading: false,          // 加载状态
		refreshing: false        // 下拉刷新状态
	},

	/**
	 * 组件生命周期
	 */
	lifetimes: {
		attached: function() {
			// 组件加载时初始化
			this.setData({
				currentType: this.properties.type
			});
			this.loadRankData();
		}
	},

	/**
	 * 组件的方法列表
	 */
	methods: {
		/**
		 * 切换榜单类型
		 */
		switchType: function(e) {
			const type = e.currentTarget.dataset.type;
			if (type === this.data.currentType) return;

			this.setData({
				currentType: type
			});
			this.loadRankData();
		},

		/**
		 * 下拉刷新
		 */
		onRefresh: async function() {
			this.setData({ refreshing: true });

			try {
				// 1. 先清除后端缓存
				await this.clearBackendCache();

				// 2. 重新加载数据
				await this.loadRankData(true);

				// 3. 显示成功提示
				wx.showToast({
					title: '刷新成功',
					icon: 'success',
					duration: 1500
				});
			} catch (err) {
				console.error('刷新失败:', err);
				wx.showToast({
					title: '刷新失败',
					icon: 'none',
					duration: 2000
				});
			} finally {
				// 4. 结束刷新状态
				setTimeout(() => {
					this.setData({ refreshing: false });
				}, 500);
			}
		},

		/**
		 * 清除后端缓存
		 */
		clearBackendCache: async function() {
			try {
				await cloudHelper.callCloudData('checkin/clear_cache', {}, {
					title: 'none'  // 不显示loading
				});
			} catch (err) {
				console.error('清除后端缓存失败:', err);
				// 即使清除缓存失败，也继续刷新数据
			}
		},

		/**
		 * 加载排行榜数据
		 * @param {boolean} forceRefresh - 是否强制刷新（不使用缓存）
		 */
		loadRankData: async function(forceRefresh = false) {
			if (this.data.loading && !forceRefresh) {
				return;
			}

			this.setData({ loading: true });

			try {
				const params = {
					type: this.data.currentType,
					limit: this.properties.limit
				};

				const result = await cloudHelper.callCloudData('checkin/rank_list', params, {
					title: forceRefresh ? 'none' : 'bar'  // 下拉刷新时不显示loading
				});

				if (result && result.list) {
					this.setData({
						rankList: result.list
					});
				}
			} catch (err) {
				console.error('加载排行榜失败:', err);
				if (!forceRefresh) {
					pageHelper.showModal('加载排行榜失败，请稍后重试');
				}
			} finally {
				this.setData({ loading: false });
			}
		},

		/**
		 * 刷新排行榜（外部调用）
		 */
		refresh: function() {
			this.loadRankData();
		}
	}
});
