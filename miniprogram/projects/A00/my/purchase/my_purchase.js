const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const PassportBiz = require('../../../../biz/passport_biz.js');

Page({

	data: {
		isLoad: false,
		list: [],
		groups: [], // 按月分组
		page: 1,
		size: 20,
		total: 0,
		hasMore: true,
		loading: false,
	},

	onLoad: function (options) {
		if (!PassportBiz.isLoggedIn()) {
			pageHelper.showModal('请先登录');
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
			let opts = { title: 'bar' };
			let res = await cloudHelper.callCloudData('purchase/my_orders', params, opts);

			if (!res) {
				this.setData({ isLoad: true, loading: false });
				return;
			}

			let newItems = res.list || [];

			// 格式化时间和状态
			for (let item of newItems) {
				// 格式化创建时间
				if (item.PURCHASE_CREATE_TIME) {
					let d = new Date(item.PURCHASE_CREATE_TIME);
					let y = d.getFullYear();
					let m = String(d.getMonth() + 1).padStart(2, '0');
					let day = String(d.getDate()).padStart(2, '0');
					let h = String(d.getHours()).padStart(2, '0');
					let min = String(d.getMinutes()).padStart(2, '0');
					item.createTimeFmt = `${y}-${m}-${day} ${h}:${min}`;
					item.monthLabel = `${y}年${m}月`;
				}

				// 状态描述
				let statusMap = {
					0: '待支付',
					1: '待确认',
					2: '已完成',
					'-1': '已取消'
				};
				item.statusDesc = statusMap[String(item.PURCHASE_STATUS)] || '未知';
			}

			let newList = this.data.list.concat(newItems);
			let hasMore = newList.length < (res.total || newList.length + 1);

			// 按月份分组
			let groups = this._groupByMonth(newList);

			this.setData({
				isLoad: true,
				list: newList,
				groups: groups,
				page: this.data.page + 1,
				hasMore: hasMore,
				loading: false,
			});
		} catch (err) {
			console.error('加载购买记录失败:', err);
			this.setData({ isLoad: true, loading: false });
		}
	},

	_groupByMonth: function (list) {
		let map = {};
		let order = [];
		for (let item of list) {
			let month = item.monthLabel || '未知';
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
	 * 预览凭证图片（只读）
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

	url: function (e) {
		pageHelper.url(e, this);
	},
})
