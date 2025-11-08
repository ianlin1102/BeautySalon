/**
 * 我的卡项列表页面
 */

const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');
const PassportBiz = require('../../../../biz/passport_biz.js');
const skin = require('../../skin/skin.js');
let behavior = require('../../../../behavior/my_join_bh.js');

Page({
	behaviors: [behavior],

	data: {
		// 卡项汇总
		summary: {
			totalTimes: 0,
			totalAmount: 0,
			totalCardsCount: 0
		},

		// 卡项列表
		dataList: [],

		// 筛选
		currentType: -1, // -1=全部 1=次数卡 2=余额卡
		currentStatus: -1, // -1=全部 0=已用完 1=使用中 2=已过期

		// 分页
		page: 1,
		size: 20,
		total: 0,
		isLoad: false,
		isLoadMore: true
	},

	onLoad: function (options) {
		this.loadSummary();
		this.loadList();
	},

	onReady: function () {
		PassportBiz.initPage({
			skin,
			that: this
		});
	},

	// 加载卡项汇总
	async loadSummary() {
		try {
			let result = await cloudHelper.callCloudData('card/my_card_summary', {});
			this.setData({
				summary: {
					totalTimes: result.totalTimes || 0,
					totalAmount: result.totalAmount || 0,
					totalCardsCount: result.totalCardsCount || 0
				}
			});
		} catch (e) {
			console.error('获取卡项汇总失败:', e);
		}
	},

	// 加载卡项列表
	async loadList(isRefresh = false) {
		if (isRefresh) {
			this.setData({
				page: 1,
				dataList: [],
				isLoadMore: true
			});
		}

		if (!this.data.isLoadMore) return;
		if (this.data.isLoad) return;

		this.setData({ isLoad: true });

		try {
			let params = {
				page: this.data.page,
				size: this.data.size
			};

			// 添加筛选条件
			if (this.data.currentType !== -1) {
				params.type = this.data.currentType;
			}
			if (this.data.currentStatus !== -1) {
				params.status = this.data.currentStatus;
			}

			let result = await cloudHelper.callCloudData('card/my_cards', params);

			let dataList = this.data.dataList;
			if (isRefresh) {
				dataList = result.list;
			} else {
				dataList = dataList.concat(result.list);
			}

			this.setData({
				dataList: dataList,
				total: result.total,
				page: this.data.page + 1,
				isLoadMore: dataList.length < result.total,
				isLoad: false
			});
		} catch (e) {
			this.setData({ isLoad: false });
			pageHelper.showModal('获取卡项列表失败', e.message || e.errMsg);
			console.error('获取卡项列表失败:', e);
		}
	},

	// 下拉刷新
	onPullDownRefresh: async function () {
		await this.loadSummary();
		await this.loadList(true);
		wx.stopPullDownRefresh();
	},

	// 上拉加载更多
	onReachBottom: function () {
		this.loadList();
	},

	// 切换类型筛选
	onTypeChange: function (e) {
		let type = parseInt(e.currentTarget.dataset.type);
		this.setData({
			currentType: type
		});
		this.loadList(true);
	},

	// 切换状态筛选
	onStatusChange: function (e) {
		let status = parseInt(e.currentTarget.dataset.status);
		this.setData({
			currentStatus: status
		});
		this.loadList(true);
	},

	// 查看卡项详情
	onCardTap: function (e) {
		let id = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: '../detail/card_detail?id=' + id
		});
	},

	// 复制识别码
	onCopyId: function (e) {
		let uniqueId = e.currentTarget.dataset.id;
		wx.setClipboardData({
			data: uniqueId,
			success: () => {
				pageHelper.showToast('识别码已复制');
			}
		});
	}
});
