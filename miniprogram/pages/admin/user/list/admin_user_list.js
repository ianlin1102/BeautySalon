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
	},

	bindDelTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');

		let params = {
			id
		}

		let callback = async () => {
			try {
				let opts = {
					title: '删除中'
				}
				await cloudHelper.callCloudSumbit('admin/user_del', params, opts).then(res => {
					
					pageHelper.delListNode(id, this.data.dataList.list, 'USER_MINI_OPENID');
					this.data.dataList.total--;
					this.setData({
						dataList: this.data.dataList
					});
					pageHelper.showSuccToast('删除成功');
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认删除？删除不可恢复', callback);

	},

	bindStatusTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');
		let status = pageHelper.dataset(e, 'status');

		let params = {
			id,
			status
		}
		try {
			await cloudHelper.callCloudSumbit('admin/user_status', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'USER_STATUS', status, 'USER_MINI_OPENID');
				this.setData({
					dataList: this.data.dataList
				});
				pageHelper.showSuccToast('设置成功');
			});
		} catch (e) {
			console.log(e);
		}
	},

	// 点击用户跳转详情页
	bindUserTap: function(e) {
		let user = e.currentTarget.dataset.user;
		// 优先使用各平台的用户ID
		let userId = user.USER_MINI_OPENID || user.USER_GOOGLE_ID || user.USER_ID || user._id;
		wx.navigateTo({
			url: '../detail/admin_user_detail?userId=' + encodeURIComponent(userId)
		});
	},

	// 复制用户ID
	bindCopyId: function(e) {
		let id = e.currentTarget.dataset.id;
		let type = e.currentTarget.dataset.type;
		if (!id) {
			wx.showToast({ title: '无可复制内容', icon: 'none' });
			return;
		}
		wx.setClipboardData({
			data: id,
			success: function() {
				wx.showToast({ title: type + '已复制', icon: 'success' });
			}
		});
	},

	_getSearchMenu: async function () {

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
				label: '注册时间正序',
				type: 'sort',
				value: 'newasc'
			},
			{
				label: '注册时间倒序',
				type: 'sort',
				value: 'newdesc'
			},

		]
		this.setData({
			sortItems,
			sortMenus
		})


	}

})