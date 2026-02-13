const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');

module.exports = Behavior({

	data: {
		isLoad: false
	},

	methods: {
		onLoad: async function (options) {
			const accountInfo = wx.getAccountInfoSync();
			this.setData({ accountInfo });
			this._loadDetail();
		},

		_loadDetail: async function () {
			let opts = { title: 'bar' };
			let aboutData = await cloudHelper.callCloudData('home/about_data', {}, opts);
			if (!aboutData) {
				this.setData({ isLoad: null });
				return;
			}

			// Determine instructor layout type based on count
			let instructorCount = (aboutData.instructors || []).length;
			let instructorLayout = 'none'; // 0
			if (instructorCount === 1) instructorLayout = 'center';
			else if (instructorCount === 2) instructorLayout = 'two';
			else if (instructorCount === 3) instructorLayout = 'three';
			else if (instructorCount >= 4) instructorLayout = 'scroll';

			this.setData({
				aboutData,
				instructorLayout,
				instructorCount,
				isLoad: true
			});
		},

		onReady: function () {},

		onShow: function () {
			// 每次显示时重新加载，保证管理员修改后能看到最新数据
			if (this.data.isLoad) {
				this._loadDetail();
			}
		},

		onPullDownRefresh: function () {
			this._loadDetail();
			wx.stopPullDownRefresh();
		},

		onShareAppMessage: function () {},

		url: function (e) {
			pageHelper.url(e, this);
		},

		bindInstructorTap: function (e) {
			wx.navigateTo({
				url: '/projects/A00/instructor/index/instructor_index'
			});
		},

		bindPreviewQr: function (e) {
			let src = e.currentTarget.dataset.src;
			if (src) {
				wx.previewImage({
					current: src,
					urls: [src]
				});
			}
		}
	}
})
