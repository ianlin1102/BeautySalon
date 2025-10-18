const pageHelper = require('../helper/page_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoading: false
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) { 
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		_loadList: async function () { 
			// 防止重复加载
			if (this.data.isLoading) return;
			
			this.setData({ isLoading: true });
			try {
				let opts = {
					title: 'bar'
				}
				await cloudHelper.callCloudSumbit('news/home_list', {}, opts).then(res => {
					this.setData({
						dataList: res.data
					});
				});
			} catch (err) {
				console.error('加载数据失败:', err);
			} finally {
				this.setData({ isLoading: false });
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			await this._loadList(); 
		},

		onPullDownRefresh: async function () {
			await this._loadList();
			wx.stopPullDownRefresh();
		},

		/**
		 * 生命周期函数--监听页面隐藏
		 */
		onHide: function () {

		},

		/**
		 * 生命周期函数--监听页面卸载
		 */
		onUnload: function () {

		},

		url: async function (e) {
			pageHelper.url(e, this);
		},


		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},
	}
})