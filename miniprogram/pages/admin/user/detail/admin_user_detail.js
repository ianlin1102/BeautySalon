const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');

Page({
	data: {
		isLoad: false,
		userId: '',
		user: null,
		totalBalance: 0,
		totalTimes: 0,
		cards: [],
		showActionModal: false,
		userAddTime: '',
		userLoginTime: ''
	},

	onLoad: async function(options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (!options.userId) {
			pageHelper.showModal('参数错误');
			return;
		}

		this.setData({ userId: decodeURIComponent(options.userId) });
		await this._loadUserDetail();
	},

	_loadUserDetail: async function() {
		try {
			let params = { keyword: this.data.userId };
			let opts = { title: '加载中' };
			let result = await cloudHelper.callCloudData('admin/user_search', params, opts);

			if (!result || !result.user) {
				pageHelper.showModal('用户不存在');
				return;
			}

			// 用户来源描述
			let sourceDesc = '未知';
			if (result.user.USER_MINI_OPENID) sourceDesc = '微信小程序';
			else if (result.user.USER_GOOGLE_ID) sourceDesc = 'Google';
			else if (result.user.USER_ACCOUNT) sourceDesc = 'Web注册';

			// 格式化时间
			let userAddTime = '';
			let userLoginTime = '';
			if (result.user.USER_ADD_TIME) {
				userAddTime = timeHelper.timestamp2Time(result.user.USER_ADD_TIME, 'Y-M-D');
			}
			if (result.user.USER_LOGIN_TIME) {
				userLoginTime = timeHelper.timestamp2Time(result.user.USER_LOGIN_TIME, 'Y-M-D h:m');
			}

			this.setData({
				isLoad: true,
				user: result.user,
				userId: result.userId || this.data.userId,
				sourceDesc: sourceDesc,
				totalBalance: result.totalBalance || 0,
				totalTimes: result.totalTimes || 0,
				cards: result.cards?.list || [],
				userAddTime: userAddTime,
				userLoginTime: userLoginTime
			});
		} catch (e) {
			console.error(e);
			pageHelper.showModal('加载失败: ' + e.message);
		}
	},

	onShow: async function() {
		// 返回时刷新数据
		if (this.data.isLoad) {
			await this._loadUserDetail();
		}
	},

	onPullDownRefresh: async function() {
		await this._loadUserDetail();
		wx.stopPullDownRefresh();
	},

	// 复制用户ID
	bindCopyId: function(e) {
		let id = e.currentTarget.dataset.id;
		let type = e.currentTarget.dataset.type || 'ID';
		if (!id) {
			wx.showToast({ title: '无可复制内容', icon: 'none' });
			return;
		}
		wx.setClipboardData({
			data: id,
			success: function() {
				wx.showToast({ title: type + '已复制', icon: 'success' });
			}
		});
	},

	// 显示添加卡项Modal
	bindShowActionModal: function() {
		this.setData({ showActionModal: true });
	},

	// 关闭Modal
	bindCloseModal: function() {
		this.setData({ showActionModal: false });
	},

	// 从Modal复制ID
	bindCopyIdFromModal: function() {
		let id = this.data.userId;
		if (!id) {
			wx.showToast({ title: '无可复制内容', icon: 'none' });
			return;
		}
		wx.setClipboardData({
			data: id,
			success: function() {
				wx.showToast({ title: 'ID已复制', icon: 'success' });
			}
		});
	},

	// 前往卡项管理
	bindGoToCardManage: function() {
		this.setData({ showActionModal: false });
		wx.navigateTo({
			url: '/pages/admin/user_card/manage/admin_user_card_manage'
		});
	},

	// 添加卡项（旧方法保留兼容）
	bindAddCard: function() {
		this.bindShowActionModal();
	},

	// 查看卡项详情/调整
	bindCardTap: function(e) {
		let card = e.currentTarget.dataset.card;
		// 使用 USER_CARD_UNIQUE_ID 作为查询标识
		let cardId = card.USER_CARD_UNIQUE_ID || card._id;
		wx.navigateTo({
			url: '/pages/admin/user_card/adjust/admin_user_card_adjust?userCardId=' + encodeURIComponent(cardId) + '&userId=' + encodeURIComponent(this.data.userId)
		});
	},

	// 查看预约记录
	bindViewMeets: function() {
		let userName = this.data.user?.USER_NAME || '';
		wx.navigateTo({
			url: '/pages/admin/meet/join/admin_meet_join?userId=' + encodeURIComponent(this.data.userId) + '&userName=' + encodeURIComponent(userName)
		});
	},

	// 查看购买记录
	bindViewPurchases: function() {
		let userName = this.data.user?.USER_NAME || '';
		wx.navigateTo({
			url: '/pages/admin/purchase/list/admin_purchase_list?userId=' + encodeURIComponent(this.data.userId) + '&userName=' + encodeURIComponent(userName)
		});
	},

	// 返回
	bindBack: function() {
		wx.navigateBack();
	}
});
