const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');
const deviceHelper = require('../../../helper/device_helper.js');

Page({
	data: {
		isLoad: false,
		sections: [],
		version: 0,

		// 滚动相关
		scrolledToBottom: false,
		scrollTop: 0,

		// 表单
		checkbox: false,
		printedName: '',
		submitting: false,
	},

	onLoad: async function () {
		await this._loadTerms();
	},

	_loadTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/get', { type: 'user_terms' }, { title: 'bar' });
			this.setData({
				isLoad: true,
				sections: res.sections || [],
				version: res.version || 0
			});
		} catch (err) {
			pageHelper.showModal('加载条款失败');
		}
	},

	// 滚动事件
	bindScroll: function (e) {
		this.setData({ scrollTop: e.detail.scrollTop });
	},

	// 滚动到底部
	bindScrollToLower: function () {
		this.setData({ scrolledToBottom: true });
	},

	// 勾选
	bindCheckboxChange: function (e) {
		this.setData({ checkbox: e.detail.value.length > 0 });
	},

	// 输入姓名
	bindNameInput: function (e) {
		this.setData({ printedName: e.detail.value });
	},

	// 提交同意
	bindSubmit: async function () {
		if (!this.data.scrolledToBottom) {
			return pageHelper.showModal('请先阅读完整条款');
		}
		if (!this.data.checkbox) {
			return pageHelper.showModal('请勾选同意条款');
		}
		if (!this.data.printedName || !this.data.printedName.trim()) {
			return pageHelper.showModal('请输入您的法律姓名');
		}

		if (this.data.submitting) return;
		this.setData({ submitting: true });

		try {
			let deviceInfo = deviceHelper.getDeviceInfo();

			await cloudHelper.callCloudSumbit('terms/agree_user_terms', {
				version: this.data.version,
				printedName: this.data.printedName.trim(),
				checkbox: this.data.checkbox,
				deviceInfo: deviceInfo
			}, { title: '提交中' });

			wx.showToast({ title: '同意成功', icon: 'success' });

			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
		} catch (err) {
			console.error('同意失败:', err);
			pageHelper.showModal('提交失败，请重试');
		} finally {
			this.setData({ submitting: false });
		}
	},
});
