const pageHelper = require('../../../helper/page_helper');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {

	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {

	},

	/**
	 * 用户点击"我已阅读并同意"
	 */
	bindAgreeTap: function() {
		// 获取当前页面栈
		const pages = getCurrentPages();

		// 获取上一个页面（卡项详情页）
		if (pages.length >= 2) {
			const prevPage = pages[pages.length - 2];

			// 设置上一个页面的同意状态为true
			prevPage.setData({
				agreedDisclaimer: true
			});
		}

		// 返回上一页
		wx.navigateBack({
			delta: 1
		});
	},

	/**
	 * 用户点击"返回"
	 */
	bindCancelTap: function() {
		wx.navigateBack({
			delta: 1
		});
	}
});
