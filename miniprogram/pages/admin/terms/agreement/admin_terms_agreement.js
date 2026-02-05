const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	data: {
		isAdmin: false,
		isLoad: false,
		_params: {},
		search: '',
		versionFilter: 0,
		expandedId: '', // 当前展开详情的记录ID
		detailData: null,
	},

	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		this.setData({ isLoad: true });
	},

	// 搜索
	bindSearchInput: function (e) {
		this.setData({ search: e.detail.value });
	},

	bindSearchTap: function () {
		this.setData({
			_params: {
				search: this.data.search,
				version: this.data.versionFilter,
			}
		});
	},

	// 点击记录查看详情
	bindItemTap: async function (e) {
		let id = e.currentTarget.dataset.id;

		if (this.data.expandedId === id) {
			// 收起
			this.setData({ expandedId: '', detailData: null });
			return;
		}

		// 加载详情
		try {
			let res = await cloudHelper.callCloudData('admin/terms_agreement_detail', { id }, { title: 'bar' });
			this.setData({
				expandedId: id,
				detailData: res
			});
		} catch (err) {
			pageHelper.showModal('获取详情失败');
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	},
});
