const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	data: {
		userCardId: '',
		userId: '',
		card: null,
		isLoad: false,
		// 调整表单
		adjustType: 'add', // add=增加, sub=减少
		changeValue: '',
		reason: ''
	},

	onLoad: async function(options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (!options.userCardId) {
			pageHelper.showModal('参数错误');
			return;
		}

		this.setData({
			userCardId: options.userCardId,
			userId: options.userId ? decodeURIComponent(options.userId) : ''
		});

		await this._loadCardDetail();
	},

	_loadCardDetail: async function() {
		try {
			// 通过卡项ID搜索
			let params = { uniqueId: this.data.userCardId };
			let opts = { title: '加载中' };

			// 先尝试用 userCardId 作为 uniqueId 搜索
			let result = null;
			try {
				result = await cloudHelper.callCloudData('admin/user_card_search_by_id', params, opts);
			} catch (e) {
				// 如果搜索失败，可能是因为传的是 _id 而不是 uniqueId
				// 这种情况下需要通过用户搜索获取卡项
			}

			if (result && result.userCard) {
				this.setData({
					isLoad: true,
					card: result.userCard
				});
			} else {
				// 如果找不到，可能需要其他方式获取
				this.setData({ isLoad: true });
				pageHelper.showModal('未找到卡项信息');
			}
		} catch (e) {
			console.error(e);
			this.setData({ isLoad: true });
			pageHelper.showModal('加载失败');
		}
	},

	// 切换调整类型
	onAdjustTypeChange: function(e) {
		this.setData({ adjustType: e.detail.value });
	},

	// 输入变动值
	onChangeValueInput: function(e) {
		this.setData({ changeValue: e.detail.value });
	},

	// 输入原因
	onReasonInput: function(e) {
		this.setData({ reason: e.detail.value });
	},

	// 提交调整
	bindSubmit: async function() {
		let { userCardId, card, adjustType, changeValue, reason } = this.data;

		if (!card) {
			pageHelper.showModal('卡项信息未加载');
			return;
		}

		if (!changeValue || parseFloat(changeValue) <= 0) {
			pageHelper.showModal('请输入有效的调整数值');
			return;
		}

		if (!reason.trim()) {
			pageHelper.showModal('请输入调整原因');
			return;
		}

		// 计算实际变动值
		let numValue = parseFloat(changeValue);
		if (adjustType === 'sub') {
			numValue = -numValue;
		}

		try {
			let params = {
				userCardId: card._id,
				reason: reason.trim()
			};

			// 根据卡项类型设置变动值
			if (card.USER_CARD_TYPE === 1) {
				params.changeTimes = Math.floor(numValue);
			} else {
				params.changeAmount = numValue;
			}

			let opts = { title: '提交中' };
			await cloudHelper.callCloudSumbit('admin/user_card_adjust', params, opts);

			pageHelper.showSuccToast('调整成功');

			// 返回上一页
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
		} catch (e) {
			console.error(e);
			pageHelper.showModal('调整失败: ' + (e.message || '未知错误'));
		}
	},

	// 取消
	bindCancel: function() {
		wx.navigateBack();
	}
});
