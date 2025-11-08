const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({

	data: {
		isLoad: false,
		about: null
	},

	onLoad: async function (options) {
		await this._loadDetail();
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function () {
		let opts = {
			title: 'bar'
		};

		try {
			let about = await cloudHelper.callCloudData('about/detail', {}, opts);

			this.setData({
				isLoad: true,
				about: about
			});
		} catch (err) {
			console.error(err);
			this.setData({
				isLoad: null
			});
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	}

});
