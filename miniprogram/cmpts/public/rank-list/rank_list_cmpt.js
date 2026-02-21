const cloudHelper = require('../../../helper/cloud_helper.js');
const pageHelper = require('../../../helper/page_helper.js');

const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

Component({
	options: {
		addGlobalClass: true
	},

	/**
	 * 组件的属性列表
	 */
	properties: {
		// 初始榜单类型 'all' 或 'month'
		type: {
			type: String,
			value: 'all'
		},
		// 显示数量限制
		limit: {
			type: Number,
			value: 10
		},
		// 当前用户ID
		userId: {
			type: String,
			value: ''
		}
	},

	/**
	 * 组件的初始数据
	 */
	data: {
		currentType: 'all',      // 当前榜单类型
		rankList: [],            // 排行榜数据（完整列表，前3用于领奖台）
		loading: false,          // 加载状态
		refreshing: false,       // 下拉刷新状态
		userStats: null,         // 当前用户签到统计 { monthCount, totalCount, userName, userAvatar }
		myRankInfo: null         // 我的排名信息
	},

	/**
	 * 属性观察器
	 */
	observers: {
		'userId': function(userId) {
			if (!userId) return;
			// userId 在 attached 之后由页面 onShow 设置，需要重新加载用户统计
			if (!this.data.userStats) {
				this._loadUserStats();
			}
			// 如果排行榜已加载，重新计算 myRankInfo
			if (this.data.rankList && this.data.rankList.length > 0) {
				this._computeMyRankInfo(this.data.rankList);
			}
		}
	},

	/**
	 * 组件生命周期
	 */
	lifetimes: {
		attached: function() {
			// 初始化前端缓存
			this._cache = { all: null, month: null };

			this.setData({
				currentType: this.properties.type
			});
			// 加载用户统计（如果 userId 已有值）
			this._loadUserStats();
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

			this.setData({ currentType: type });

			// 检查前端缓存
			const cached = this._cache[type];
			if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
				// 使用缓存数据
				this.setData({ rankList: cached.rankList });
				this._computeMyRankInfo(cached.rankList);
				return;
			}

			this.loadRankData();
		},

		/**
		 * 下拉刷新
		 */
		onRefresh: async function() {
			this.setData({ refreshing: true });

			try {
				// 1. 清除前端缓存
				this._cache = { all: null, month: null };

				// 2. 先清除后端缓存
				await this.clearBackendCache();

				// 3. 重新加载用户统计
				this._loadUserStats();

				// 4. 重新加载排行数据
				await this.loadRankData(true);

				// 5. 显示成功提示
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
				// 6. 结束刷新状态
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

			const type = this.data.currentType;

			// 检查前端缓存（非强制刷新时）
			if (!forceRefresh) {
				const cached = this._cache && this._cache[type];
				if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
					this.setData({ rankList: cached.rankList });
					this._computeMyRankInfo(cached.rankList);
					return;
				}
			}

			this.setData({ loading: true });

			try {
				const params = {
					type: type,
					limit: this.properties.limit
				};

				const result = await cloudHelper.callCloudData('checkin/rank_list', params, {
					title: forceRefresh ? 'none' : 'bar'  // 下拉刷新时不显示loading
				});

				if (result && result.list) {
					// 计算排行榜高度比例（只处理前3）
					const processedList = this.calculateBarHeights(result.list);
					this.setData({ rankList: processedList });

					// 保存到前端缓存
					if (this._cache) {
						this._cache[type] = {
							rankList: processedList,
							timestamp: Date.now()
						};
					}

					this._computeMyRankInfo(processedList);
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
		 * 加载当前用户签到统计（只需调用一次）
		 */
		_loadUserStats: async function() {
			let userId = this.properties.userId;
			if (!userId) return;

			try {
				const result = await cloudHelper.callCloudData('checkin/user_stats', {
					userId: userId
				}, {
					title: 'none'
				});

				if (result) {
					this.setData({ userStats: result });
					// userStats 加载完后重新计算 myRankInfo
					if (this.data.rankList && this.data.rankList.length > 0) {
						this._computeMyRankInfo(this.data.rankList);
					}
				}
			} catch (err) {
				console.error('加载用户签到统计失败:', err);
			}
		},

		/**
		 * 计算"我的排名"信息
		 */
		_computeMyRankInfo: function(rankList) {
			const userId = this.properties.userId;
			const userStats = this.data.userStats;
			if (!userId || !userStats) {
				this.setData({ myRankInfo: null });
				return;
			}

			// 在排行榜中查找当前用户
			let inTop10 = false;
			let rank = null;
			let userName = userStats.userName || '';
			let userAvatar = userStats.userAvatar || '';

			for (let i = 0; i < rankList.length; i++) {
				if (rankList[i].userId === userId) {
					inTop10 = true;
					rank = rankList[i].rank || (i + 1);
					// 优先使用排行榜中的名字/头像（可能更新）
					userName = rankList[i].userName || userName;
					userAvatar = rankList[i].userAvatar || userAvatar;
					break;
				}
			}

			// 根据当前tab选择对应的签到次数
			const checkinCount = this.data.currentType === 'all'
				? (userStats.totalCount || 0)
				: (userStats.monthCount || 0);

			this.setData({
				myRankInfo: {
					inTop10: inTop10,
					rank: rank,
					checkinCount: checkinCount,
					userName: userName,
					userAvatar: userAvatar
				}
			});
		},

		/**
		 * 刷新排行榜（外部调用）
		 */
		refresh: function() {
			this.loadRankData();
		},

		/**
		 * 计算领奖台高度比例
		 * 基于核销次数动态计算高度，确保视觉效果成比例
		 * 只处理前3名用于领奖台，其余保持原样用于列表
		 */
		calculateBarHeights: function(list) {
			if (!list || list.length === 0) return list;

			// 只处理前三名的高度
			const topThree = list.slice(0, 3);

			// 找出最大核销次数
			const maxCount = Math.max(...topThree.map(item => item.checkinCount || 0));

			// 如果所有人都是0次，使用默认高度
			if (maxCount === 0) {
				let processed = topThree.map((item, index) => ({
					...item,
					barHeight: index === 0 ? 110 : (index === 1 ? 80 : 60)
				}));
				return processed.concat(list.slice(3));
			}

			// 定义高度范围（compact）
			const MIN_HEIGHT = 40;   // 最小高度 (rpx)
			const MAX_HEIGHT = 180;  // 最大高度 (rpx)

			// 计算前三名的高度
			const processedTop = topThree.map((item) => {
				const count = item.checkinCount || 0;
				const barHeight = Math.round((count / maxCount) * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT);
				return {
					...item,
					barHeight: barHeight
				};
			});

			// 合并：前3有barHeight，4-10无barHeight
			return processedTop.concat(list.slice(3));
		}
	}
});
