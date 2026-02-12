/**
 * 卡项使用记录页面（管理员查看）
 */

const AdminCardBiz = require('../../../biz/admin_card_biz.js');

Page({
	data: {
		userId: '',
		userCardId: '',  // 卡项 _id，用于查询记录
		uniqueId: '',    // 卡项 UNIQUE_ID，用于查询详情
		cardInfo: null,
		records: [],
		page: 1,
		size: 20,
		total: 0,
		hasMore: true,
		loading: false
	},

	onLoad: function (options) {
		if (options.userId) {
			this.setData({
				userId: decodeURIComponent(options.userId),
				userCardId: options.userCardId ? decodeURIComponent(options.userCardId) : '',
				uniqueId: options.uniqueId ? decodeURIComponent(options.uniqueId) : ''
			});

			this._loadCardInfo();
			this.loadRecords();
		} else {
			wx.showToast({
				title: '参数错误',
				icon: 'none'
			});
		}
	},

	// 加载卡项详情（用 uniqueId 查）
	async _loadCardInfo() {
		let uniqueId = this.data.uniqueId;
		if (!uniqueId) return;

		try {
			let result = await AdminCardBiz.searchByUniqueId(uniqueId);
			if (result && result.userCard) {
				this.setData({ cardInfo: result.userCard });
			}
		} catch (e) {
			console.error('加载卡项详情失败:', e);
		}
	},

	// 加载记录（用 userCardId = _id 查）
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
