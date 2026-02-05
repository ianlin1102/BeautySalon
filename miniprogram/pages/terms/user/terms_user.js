const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');
const deviceHelper = require('../../../helper/device_helper.js');
const PassportBiz = require('../../../biz/passport_biz.js');

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

	onReady: function () {
		// 页面渲染完成后检查是否需要滚动
		setTimeout(() => {
			this._checkScrollNeeded();
		}, 300);
	},

	_loadTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/get', { type: 'user_terms' }, { title: 'bar' });
			this.setData({
				isLoad: true,
				sections: res.sections || [],
				version: res.version || 0
			}, () => {
				// 内容加载后再次检查
				setTimeout(() => {
					this._checkScrollNeeded();
				}, 300);
			});
		} catch (err) {
			pageHelper.showModal('加载条款失败');
		}
	},

	// 检查内容是否需要滚动，如果不需要则自动视为已阅读
	_checkScrollNeeded: function () {
		if (this.data.scrolledToBottom) return;

		const query = wx.createSelectorQuery().in(this);
		query.select('.terms-content').boundingClientRect();
		query.select('.terms-content').scrollOffset();
		query.exec((res) => {
			if (!res || !res[0]) return;

			const scrollViewHeight = res[0].height;
			const scrollHeight = res[1] ? res[1].scrollHeight : 0;

			// 如果内容高度小于等于可视区域高度，说明不需要滚动
			// 或者滚动高度接近可视高度（允许50px误差）
			if (scrollHeight <= scrollViewHeight + 50) {
				this.setData({ scrolledToBottom: true });
			}
		});
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
		// 检查登录状态
		if (!PassportBiz.isLoggedIn()) {
			return pageHelper.showModal('请先登录后再同意条款');
		}
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
