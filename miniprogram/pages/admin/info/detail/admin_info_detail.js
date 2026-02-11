const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({

	data: {
		isLoad: false,
		joinId: '',
		detail: null
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (!options.joinId) {
			pageHelper.showModal('参数错误');
			return;
		}

		this.setData({ joinId: decodeURIComponent(options.joinId) });
		await this._loadDetail();
	},

	_loadDetail: async function () {
		try {
			let params = { joinId: this.data.joinId };
			let opts = { title: '加载中' };
			let result = await cloudHelper.callCloudData('admin/join_detail', params, opts);

			if (!result) {
				pageHelper.showModal('预约记录不存在');
				return;
			}

			this.setData({
				isLoad: true,
				detail: result
			});
		} catch (err) {
			console.error(err);
		}
	},

	bindCheckinTap: async function (e) {
		let flag = pageHelper.dataset(e, 'flag');
		let detail = this.data.detail;

		let params = {
			joinId: detail._id,
			flag: Number(flag)
		};

		let callback = async () => {
			try {
				let opts = {
					title: flag == 1 ? '签到中' : '取消签到中'
				};
				await cloudHelper.callCloudSumbit('admin/join_checkin', params, opts).then(res => {
					this.setData({
						'detail.JOIN_IS_CHECKIN': Number(flag)
					});
					pageHelper.showSuccToast(flag == 1 ? '签到成功' : '已取消签到');
				});
			} catch (err) {
				console.error(err);
			}
		};

		if (flag == 1) {
			callback();
		} else {
			pageHelper.showConfirm('确认取消签到?', callback);
		}
	},

	bindCancelTap: function (e) {
		let detail = this.data.detail;

		let callback = async () => {
			let params = {
				joinId: detail._id,
				status: 99
			};

			try {
				let opts = { title: '取消中' };
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						'detail.JOIN_STATUS': 99
					});
					pageHelper.showSuccToast('已取消');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认取消该预约?', callback);
	},

	bindStatusTap: async function (e) {
		let status = pageHelper.dataset(e, 'status');
		let detail = this.data.detail;

		let params = {
			joinId: detail._id,
			status: Number(status)
		};

		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						'detail.JOIN_STATUS': Number(status),
						'detail.JOIN_REASON': ''
					});
					pageHelper.showSuccToast('操作成功');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认恢复预约?', callback);
	},

	bindDelTap: function (e) {
		let detail = this.data.detail;

		let callback = async () => {
			let params = {
				joinId: detail._id
			};

			try {
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/join_del', params, opts).then(res => {
					pageHelper.showSuccToast('已删除');
					setTimeout(() => {
						wx.navigateBack();
					}, 1500);
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认删除该记录?', callback);
	},

	bindPhoneTap: function (e) {
		let phone = pageHelper.dataset(e, 'phone');
		wx.makePhoneCall({
			phoneNumber: phone,
			fail: () => {}
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	}

});
