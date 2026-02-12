const MgrBiz = require('../../../../biz/mgr_biz.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
	data: {
		list: [],
		page: 1,
		total: 0,
		isLoad: false,
		search: '',
	},

	onLoad: async function () {
		let ok = await MgrBiz.isMgr(this, 'admin:manage');
		if (!ok) return;

		await this._loadList();
	},

	onShow: function () {
		// 从编辑页返回时刷新
		if (this.data.isLoad) {
			this._loadList();
		}
	},

	async _loadList() {
		let params = {
			search: this.data.search,
			page: 1,
			size: 50,
			isTotal: true,
			oldTotal: 0,
		};

		try {
			let res = await cloudHelper.callCloudData('mgr/admin_list', params);
			if (res) {
				this.setData({
					list: res.list || [],
					total: res.total || 0,
					isLoad: true,
				});
			}
		} catch (e) {
			this.setData({ isLoad: true });
		}
	},

	bindSearchInput: function (e) {
		this.setData({ search: e.detail.value });
	},

	bindSearch: function () {
		this._loadList();
	},

	bindAdd: function () {
		wx.navigateTo({
			url: '/pages/mgr/admin/edit/mgr_admin_edit'
		});
	},

	bindEdit: function (e) {
		let id = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: '/pages/mgr/admin/edit/mgr_admin_edit?id=' + id
		});
	},

	bindRoleManage: function () {
		wx.navigateTo({
			url: '/pages/mgr/role/edit/mgr_role_edit'
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	}
});
