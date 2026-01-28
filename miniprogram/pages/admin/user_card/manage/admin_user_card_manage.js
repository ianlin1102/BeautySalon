const AdminBiz = require('../../../../biz/admin_biz.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
	data: {
		isAdmin: false,
		keyword: '',
		isSearched: false,
		user: null,
		userId: '',
		totalBalance: 0,
		totalTimes: 0,
		cards: [],
		matchedBy: ''
	},

	onLoad: function() {
		this.checkAdmin();
	},

	onShow: function() {
		// 返回时刷新数据
		if (this.data.userId && this.data.isSearched) {
			this.bindSearch();
		}
	},

	async checkAdmin() {
		try {
			await cloudHelper.callCloudData('admin/home', {});
			this.setData({ isAdmin: true });
		} catch (e) {
			this.setData({ isAdmin: false });
			pageHelper.showModal('需要管理员权限');
		}
	},

	onKeywordInput: function(e) {
		this.setData({ keyword: e.detail.value });
	},

	bindSearch: async function() {
		let keyword = this.data.keyword.trim();
		if (!keyword) {
			pageHelper.showModal('请输入搜索关键词');
			return;
		}

		try {
			let params = { keyword };
			let opts = { title: '搜索中' };
			let result = await cloudHelper.callCloudData('admin/user_search', params, opts);

			if (result && result.user) {
				this.setData({
					isSearched: true,
					user: result.user,
					userId: result.userId,
					totalBalance: result.totalBalance || 0,
					totalTimes: result.totalTimes || 0,
					cards: result.cards?.list || [],
					matchedBy: result.matchedBy || ''
				});
			} else {
				this.setData({
					isSearched: true,
					user: null,
					userId: '',
					totalBalance: 0,
					totalTimes: 0,
					cards: [],
					matchedBy: ''
				});
			}
		} catch (e) {
			console.error(e);
			this.setData({
				isSearched: true,
				user: null
			});
		}
	},

	bindViewUserDetail: function() {
		if (!this.data.userId) return;
		wx.navigateTo({
			url: '/pages/admin/user/detail/admin_user_detail?userId=' + encodeURIComponent(this.data.userId)
		});
	},

	bindAddCard: function() {
		if (!this.data.userId) return;
		let userName = this.data.user?.USER_NAME || '';
		wx.navigateTo({
			url: '/pages/admin/user_card/add/admin_user_card_add?userId=' + encodeURIComponent(this.data.userId) + '&userName=' + encodeURIComponent(userName)
		});
	},

	bindCardTap: function(e) {
		let card = e.currentTarget.dataset.card;
		// 使用 USER_CARD_UNIQUE_ID 作为查询标识
		let cardId = card.USER_CARD_UNIQUE_ID || card._id;
		wx.navigateTo({
			url: '/pages/admin/user_card/adjust/admin_user_card_adjust?userCardId=' + encodeURIComponent(cardId) + '&userId=' + encodeURIComponent(this.data.userId)
		});
	}
});
