const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
	data: {
		isLoad: false,
		instructor: null,
		id: ''
	},

	onLoad: async function (options) {
		const id = options.id;
		if (!id) {
			wx.showToast({
				title: '参数错误',
				icon: 'none'
			});
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
			return;
		}

		this.setData({
			id: id
		});

		await this._loadDetail();
	},

	_loadDetail: async function () {
		try {
			let params = {
				id: this.data.id
			};

			let instructor = await cloudHelper.callCloudData('instructor/detail', params);

			if (!instructor) {
				wx.showToast({
					title: '导师不存在',
					icon: 'none'
				});
				setTimeout(() => {
					wx.navigateBack();
				}, 1500);
				return;
			}

			this.setData({
				instructor: instructor,
				isLoad: true
			});
		} catch (err) {
			this.setData({
				isLoad: null
			});
		}
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	url: function (e) {
		pageHelper.url(e, this);
	}
});
