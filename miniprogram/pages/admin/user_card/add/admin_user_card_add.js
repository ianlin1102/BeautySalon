const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	data: {
		userId: '',
		userName: '',
		cardName: '',
		cardType: 1, // 1=次数卡, 2=余额卡
		times: '',
		amount: '',
		reason: '',
		paymentMethod: '',
		paymentMethods: ['现金', '微信', '支付宝', '银行卡', '其他']
	},

	onLoad: function(options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (!options.userId) {
			pageHelper.showModal('参数错误');
			return;
		}

		this.setData({
			userId: decodeURIComponent(options.userId),
			userName: options.userName ? decodeURIComponent(options.userName) : ''
		});
	},

	// 输入卡项名称
	onCardNameInput: function(e) {
		this.setData({ cardName: e.detail.value });
	},

	// 选择卡项类型
	onTypeChange: function(e) {
		this.setData({
			cardType: parseInt(e.detail.value) + 1,
			times: '',
			amount: ''
		});
	},

	// 输入次数
	onTimesInput: function(e) {
		this.setData({ times: e.detail.value });
	},

	// 输入金额
	onAmountInput: function(e) {
		this.setData({ amount: e.detail.value });
	},

	// 输入原因
	onReasonInput: function(e) {
		this.setData({ reason: e.detail.value });
	},

	// 选择支付方式
	onPaymentChange: function(e) {
		this.setData({
			paymentMethod: this.data.paymentMethods[e.detail.value]
		});
	},

	// 提交
	bindSubmit: async function() {
		let { userId, cardName, cardType, times, amount, reason, paymentMethod } = this.data;

		// 验证
		if (!cardName.trim()) {
			pageHelper.showModal('请输入卡项名称');
			return;
		}

		if (cardType === 1) {
			if (!times || parseInt(times) <= 0) {
				pageHelper.showModal('请输入有效的次数');
				return;
			}
		} else {
			if (!amount || parseFloat(amount) <= 0) {
				pageHelper.showModal('请输入有效的金额');
				return;
			}
		}

		if (!reason.trim()) {
			pageHelper.showModal('请输入充值原因');
			return;
		}

		try {
			let params = {
				userId: userId,
				cardName: cardName.trim(),
				type: cardType,
				times: cardType === 1 ? parseInt(times) : 0,
				amount: cardType === 2 ? parseFloat(amount) : 0,
				reason: reason.trim(),
				paymentMethod: paymentMethod
			};

			let opts = { title: '提交中' };
			await cloudHelper.callCloudSumbit('admin/user_card_add', params, opts);

			pageHelper.showSuccToast('添加成功');

			// 返回上一页并刷新
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
		} catch (e) {
			console.error(e);
			pageHelper.showModal('添加失败: ' + (e.message || '未知错误'));
		}
	},

	// 取消
	bindCancel: function() {
		wx.navigateBack();
	}
});
