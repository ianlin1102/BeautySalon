const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({

	data: {
		isLoad: false,
		list: [],
		groups: [], // 按月分组后的数据
		page: 1,
		size: 20,
		total: 0,
		hasMore: true,
		loading: false,
		userId: '',
		userName: '',
	},

	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		// 按用户筛选
		if (options && options.userId) {
			let userId = decodeURIComponent(options.userId);
			let userName = options.userName ? decodeURIComponent(options.userName) : '';
			this.setData({
				userId: userId,
				userName: userName
			}, () => {
				// 确保 userId 已设置后再加载列表
				this._loadList();
			});
			wx.setNavigationBarTitle({
				title: userName ? userName + ' 的购买记录' : '用户购买记录'
			});
			return;
		}

		this._loadList();
	},

	onPullDownRefresh: async function () {
		this.setData({ page: 1, list: [], groups: [], hasMore: true });
		await this._loadList();
		wx.stopPullDownRefresh();
	},

	onReachBottom: function () {
		if (this.data.hasMore && !this.data.loading) {
			this._loadList();
		}
	},

	_loadList: async function () {
		if (this.data.loading) return;
		this.setData({ loading: true });

		try {
			let params = {
				page: this.data.page,
				size: this.data.size,
			};
			// 按用户筛选
			if (this.data.userId) {
				params.userId = this.data.userId;
			}
			let opts = { title: 'bar' };
			let res = await cloudHelper.callCloudData('admin/purchase_proof_list', params, opts);

			if (!res) {
				this.setData({ isLoad: true, loading: false });
				return;
			}

			let newList = this.data.list.concat(res.list || []);
			let hasMore = newList.length < (res.total || 0);

			// 按月份分组
			let groups = this._groupByMonth(newList);

			this.setData({
				isLoad: true,
				list: newList,
				groups: groups,
				total: res.total || 0,
				page: this.data.page + 1,
				hasMore: hasMore,
				loading: false,
			});
		} catch (err) {
			console.error('加载购买凭证列表失败:', err);
			this.setData({ isLoad: true, loading: false });
		}
	},

	/**
	 * 按月份分组
	 */
	_groupByMonth: function (list) {
		let map = {};
		let order = [];
		for (let item of list) {
			let month = item.PURCHASE_MONTH || '未知';
			if (!map[month]) {
				map[month] = [];
				order.push(month);
			}
			map[month].push(item);
		}
		return order.map(month => ({
			month: month,
			items: map[month]
		}));
	},

	/**
	 * 预览凭证图片
	 */
	bindPreviewProof: function (e) {
		let url = e.currentTarget.dataset.url;
		if (url) {
			wx.previewImage({
				current: url,
				urls: [url]
			});
		}
	},

	/**
	 * 确认购买
	 */
	bindConfirmPurchase: function (e) {
		let purchaseId = e.currentTarget.dataset.id;
		let that = this;
		pageHelper.showConfirm('确认该购买订单？确认后将为用户开通卡项。', async function () {
			try {
				let params = { purchaseId };
				let opts = { title: '处理中..' };
				await cloudHelper.callCloudSumbit('admin/purchase_confirm', params, opts);
				pageHelper.showSuccToast('确认成功');
				// 重新加载
				that.setData({ page: 1, list: [], groups: [], hasMore: true });
				that._loadList();
			} catch (err) {
				console.error('确认失败:', err);
				pageHelper.showModal('操作失败，请重试');
			}
		});
	},

	/**
	 * 拒绝购买
	 */
	bindRejectPurchase: function (e) {
		let purchaseId = e.currentTarget.dataset.id;
		let that = this;
		pageHelper.showConfirm('确认拒绝该购买订单？', async function () {
			try {
				let params = { purchaseId };
				let opts = { title: '处理中..' };
				await cloudHelper.callCloudSumbit('admin/purchase_reject', params, opts);
				pageHelper.showSuccToast('已拒绝');
				// 重新加载
				that.setData({ page: 1, list: [], groups: [], hasMore: true });
				that._loadList();
			} catch (err) {
				console.error('拒绝失败:', err);
				pageHelper.showModal('操作失败，请重试');
			}
		});
	},

	/**
	 * 删除购买记录（含凭证图片）
	 */
	bindDeletePurchase: function (e) {
		let purchaseId = e.currentTarget.dataset.id;
		let that = this;
		pageHelper.showConfirm('确认删除该记录？删除后记录和凭证图片都将被清除，无法恢复！', async function () {
			try {
				let params = { purchaseId };
				let opts = { title: '删除中..' };
				await cloudHelper.callCloudSumbit('admin/purchase_delete', params, opts);
				pageHelper.showSuccToast('删除成功');
				// 重新加载
				that.setData({ page: 1, list: [], groups: [], hasMore: true });
				that._loadList();
			} catch (err) {
				console.error('删除失败:', err);
				pageHelper.showModal('删除失败，请重试');
			}
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	},
})
