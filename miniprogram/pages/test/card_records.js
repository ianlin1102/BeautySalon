/**
 * 卡项使用记录页面
 */

const AdminCardBiz = require('../../biz/admin_card_biz.js');

Page({
	data: {
		userId: '',
		userCardId: '',
		userInfo: null,
		cardInfo: null,
		records: [],
		page: 1,
		size: 20,
		total: 0,
		hasMore: true,
		loading: false
	},

	onLoad: function (options) {
		// 从参数获取userId和可选的userCardId
		if (options.userId) {
			this.setData({
				userId: decodeURIComponent(options.userId),
				userCardId: options.userCardId ? decodeURIComponent(options.userCardId) : ''
			});

			// 如果有用户信息，直接设置
			if (options.userName && options.userMobile) {
				this.setData({
					userInfo: {
						USER_NAME: decodeURIComponent(options.userName || ''),
						USER_MOBILE: decodeURIComponent(options.userMobile)
					}
				});
			}

			// 如果有卡项信息，直接设置
			if (options.cardName && options.uniqueId) {
				this.setData({
					cardInfo: {
						USER_CARD_CARD_NAME: decodeURIComponent(options.cardName),
						USER_CARD_UNIQUE_ID: decodeURIComponent(options.uniqueId)
					}
				});
			}

			// 加载记录
			this.loadRecords();
		} else {
			wx.showToast({
				title: '参数错误',
				icon: 'none'
			});
		}
	},

	// 加载记录
	async loadRecords() {
		if (this.data.loading) return;

		this.setData({ loading: true });

		try {
			let result = await AdminCardBiz.getUserCardRecords(
				this.data.userId,
				this.data.userCardId,
				this.data.page,
				this.data.size
			);

			let records = this.data.page === 1 ? result.list : this.data.records.concat(result.list);

			this.setData({
				records: records,
				total: result.total,
				hasMore: records.length < result.total,
				loading: false
			});
		} catch (e) {
			console.error('加载记录失败:', e);
			this.setData({ loading: false });
			wx.showToast({
				title: '加载失败',
				icon: 'none'
			});
		}
	},

	// 加载更多
	loadMore() {
		if (!this.data.hasMore || this.data.loading) {
			return;
		}

		this.setData({
			page: this.data.page + 1
		}, () => {
			this.loadRecords();
		});
	},

	// 返回
	goBack() {
		wx.navigateBack({
			delta: 1
		});
	}
});
