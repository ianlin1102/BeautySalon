const AdminCardBiz = require('../../../../biz/admin_card_biz.js');
const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		//设置搜索菜单
		await this._getSearchMenu();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () {},

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

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);

		// 修正后端返回的不准确的 total 值
		// 使用实际列表长度作为总数（因为管理页面通常不会有大量数据，可以一次性加载）
		if (this.data.dataList && this.data.dataList.list) {
			let actualTotal = this.data.dataList.list.length;

			// 只在第一页且数据加载完成时修正（避免分页场景下的问题）
			if (this.data.dataList.page === 1 && actualTotal > 0) {
				this.data.dataList.total = actualTotal;
				this.setData({
					dataList: this.data.dataList
				});
			}
		}
	},

	bindSortTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let id = e.currentTarget.dataset.id;
		let sort = e.currentTarget.dataset.sort;
		if (!id || !sort) return;

		let params = {
			id,
			sort
		}

		try {
			await cloudHelper.callCloudSumbit('admin/card_sort', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'CARD_ORDER', sort);
				this.setData({
					dataList: this.data.dataList
				});
				pageHelper.showSuccToast('排序成功');
			});
		} catch (e) {
			console.log(e);
		}
	},

	_del: async function (id, that) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!id) return;

		let params = {
			id
		}

		let callback = async () => {
			try {
				let opts = {
					title: '删除中'
				}
				await cloudHelper.callCloudSumbit('admin/card_del', params, opts).then(res => {
					pageHelper.delListNode(id, that.data.dataList.list, '_id');
					that.data.dataList.total--;
					that.setData({
						dataList: that.data.dataList
					});
					pageHelper.showSuccToast('删除成功');
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认删除？删除不可恢复', callback);

	},

	bindReviewTap: function (e) {
		let id = pageHelper.dataset(e, 'id');
		wx.navigateTo({
			url: '/pages/test/card_detail?id=' + id,
		});
	},

	bindStatusSelectTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let itemList = ['启用', '停用', '删除'];
		let id = pageHelper.dataset(e, 'id');
		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: { //启用
						await this._setStatus(id, 1, this);
						break;
					}
					case 1: { //停止
						await this._setStatus(id, 0, this);
						break;
					}
					case 2: { //删除
						await this._del(id, this);
						break;
					}

				}


			},
			fail: function (res) {}
		})
	},


	_setStatus: async function (id, status, that) {
		status = Number(status);
		let params = {
			id,
			status
		}

		try {
			await cloudHelper.callCloudSumbit('admin/card_status', params).then(res => {
				pageHelper.modifyListNode(id, that.data.dataList.list, 'CARD_STATUS', status, '_id');
				that.setData({
					dataList: that.data.dataList
				});
				pageHelper.showSuccToast('设置成功');
			});
		} catch (e) {
			console.log(e);
		}
	},

	_getSearchMenu: async function () {
		let arr = await AdminCardBiz.getCateList();

		let sortItems = [];
		let sortMenus = [{
				label: '全部',
				type: '',
				value: ''
			}, {
				label: '正常',
				type: 'status',
				value: 1
			},
			{
				label: '停用',
				type: 'status',
				value: 0
			},
			{
				label: '次数卡',
				type: 'cardType',
				value: 1
			},
			{
				label: '余额卡',
				type: 'cardType',
				value: 2
			}
		]
		sortMenus = sortMenus.concat(arr);
		this.setData({
			sortItems,
			sortMenus
		})


	}

})
