const AdminBiz = require('../../../biz/admin_biz.js');
const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		isAllFold: true,

		search: '',
		sortMenus: [],
		sortItems: [],
		dataList: null
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		// 设置搜索菜单
		this._getSearchMenu();

		this.setData({
			isLoad: true,
			_params: {}  // 不传 meetId 和 mark，查询全部
		});
	},

	_getSearchMenu: function () {
		let sortItems = [];
		let sortMenus = [
			{ label: '全部', type: '', value: '' },
			{ label: '未过期', type: 'expired', value: '0' },
			{ label: '已过期', type: 'expired', value: '1' },
			{ label: '预约成功', type: 'status', value: '1' },
			{ label: '用户取消', type: 'status', value: '10' },
			{ label: '系统取消', type: 'status', value: '99' },
			{ label: '已签到', type: 'isCheckin', value: '1' },
			{ label: '未签到', type: 'isCheckin', value: '0' },
		];

		this.setData({
			sortItems,
			sortMenus
		});
	},

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);
	},

	bindUnFoldAllTap: function (e) {
		let dataList = this.data.dataList;
		for (let i = 0; i < dataList.list.length; i++) {
			dataList.list[i].fold = false;
		}
		this.setData({
			dataList,
			isAllFold: false
		});
	},

	bindFoldAllTap: function (e) {
		let dataList = this.data.dataList;
		for (let i = 0; i < dataList.list.length; i++) {
			dataList.list[i].fold = true;
		}
		this.setData({
			dataList,
			isAllFold: true
		});
	},

	bindUnFoldTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		this.setData({
			['dataList.list[' + idx + '].fold']: false
		});
	},

	bindFoldTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		this.setData({
			['dataList.list[' + idx + '].fold']: true
		});
	},

	bindCopyTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let str = '预约活动：' + item.JOIN_MEET_TITLE + '\n';
		str += '预约时间：' + item.JOIN_MEET_DAY + ' ' + item.JOIN_MEET_TIME_START + '~' + item.JOIN_MEET_TIME_END + '\n';

		if (item.JOIN_FORMS) {
			for (let i = 0; i < item.JOIN_FORMS.length; i++) {
				str += item.JOIN_FORMS[i].title + '：' + item.JOIN_FORMS[i].val + '\n';
			}
		}

		wx.setClipboardData({
			data: str,
			success: function () {
				pageHelper.showSuccToast('复制成功');
			}
		});
	},

	bindCheckinTap: async function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let flag = pageHelper.dataset(e, 'flag');
		let item = this.data.dataList.list[idx];

		let params = {
			joinId: item._id,
			isCheckin: Number(flag)
		};

		let callback = async () => {
			try {
				let opts = {
					title: flag == 1 ? '签到中' : '取消签到中'
				};
				await cloudHelper.callCloudSumbit('admin/join_checkin', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_IS_CHECKIN']: Number(flag)
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

	bindStatusTap: async function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let status = pageHelper.dataset(e, 'status');
		let item = this.data.dataList.list[idx];

		let params = {
			joinId: item._id,
			status: Number(status)
		};

		let callback = async () => {
			try {
				let opts = {
					title: '处理中'
				};
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_STATUS']: Number(status),
						['dataList.list[' + idx + '].JOIN_REASON']: ''
					});
					pageHelper.showSuccToast('操作成功');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认恢复预约?', callback);
	},

	bindCancelTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let callback = async () => {
			let params = {
				joinId: item._id,
				status: 99
			};

			try {
				let opts = {
					title: '取消中'
				};
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_STATUS']: 99
					});
					pageHelper.showSuccToast('已取消');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认取消该预约?', callback);
	},

	bindDelTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let callback = async () => {
			let params = {
				joinId: item._id
			};

			try {
				let opts = {
					title: '删除中'
				};
				await cloudHelper.callCloudSumbit('admin/join_del', params, opts).then(res => {
					let dataList = this.data.dataList;
					dataList.list.splice(idx, 1);
					dataList.total--;
					this.setData({
						dataList
					});
					pageHelper.showSuccToast('已删除');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认删除该记录?', callback);
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		let cbFun = () => {
			wx.stopPullDownRefresh();
		};
		this.selectComponent('#cmpt-comm-list').reload(cbFun);
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {}

});
