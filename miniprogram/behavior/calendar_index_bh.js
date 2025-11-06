const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const timeHelper = require('../helper/time_helper.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		list: [],

		day: '',
		hasDays: []
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		_loadList: async function () {
			let params = {
				day: this.data.day
			}
			let opts = {
				title: this.data.isLoad ? 'bar' : 'bar'
			}
			try {
				this.setData({
					list: null
				});
				await cloudHelper.callCloudSumbit('meet/list_by_day', params, opts).then(res => {
					console.log('📅 返回的预约列表数据:', res.data);
					if (res.data && res.data.length > 0) {
						console.log('📝 第一个项目数据:', res.data[0]);
						console.log('🖼️ 图片URL:', res.data[0].pic);
						console.log('⏰ 时间段数据:', res.data[0].times);
					}
					this.setData({
						list: res.data,
						isLoad: true
					});
				});
			} catch (err) {
				console.error(err);
			}
		},

		_loadHasList: async function () {
			let params = {
				day: timeHelper.time('Y-M-D')
			}
			let opts = {
				title: 'bar'
			}
			try {
				await cloudHelper.callCloudSumbit('meet/list_has_day', params, opts).then(res => {
					console.log('📅 hasDays 返回数据:', res.data);
					console.log('📅 hasDays 数据类型:', typeof res.data, Array.isArray(res.data));
					console.log('📅 hasDays 长度:', res.data ? res.data.length : 'null');
					this.setData({
						hasDays: res.data,
					});
				});
			} catch (err) {
				console.error('❌ _loadHasList 错误:', err);
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {

		},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			this.setData({
				day: timeHelper.time('Y-M-D')
			});
			await this._loadHasList();
			await this._loadList();
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

		/**
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			await this._loadHasList();
			await this._loadList();
			wx.stopPullDownRefresh();
		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindClickCmpt: async function (e) {
			let day = e.detail.day;
			this.setData({
				day
			}, async () => {
				await this._loadList();
			});
		},

		bindMonthChangeCmpt: function (e) {
			console.log(e.detail)
		},

		url: async function (e) {
			pageHelper.url(e, this);
		},
	}
})