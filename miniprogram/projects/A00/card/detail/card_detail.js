/**
 * 我的卡项详情页面
 */

const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');
const PassportBiz = require('../../../../biz/passport_biz.js');
const skin = require('../../skin/skin.js');
let behavior = require('../../../../behavior/my_join_bh.js');

Page({
	behaviors: [behavior],

	data: {
		id: '',
		card: null,
		records: [],

		// 分页
		page: 1,
		size: 20,
		total: 0,
		isLoad: false,
		isLoadMore: true
	},

	onLoad: function (options) {
		if (!options.id) {
			pageHelper.showModal('参数错误', '缺少卡项ID');
			return;
		}

		this.setData({
			id: options.id
		});

		this.loadCardDetail();
		this.loadRecords();
	},

	onReady: function () {
		PassportBiz.initPage({
			skin,
			that: this
		});
	},

	// 加载卡项详情
	async loadCardDetail() {
		try {
			let result = await cloudHelper.callCloudData('card/my_card_detail', {
				userCardId: this.data.id
			});

			// 计算进度百分比
			let progressPercent = 0;
			if (result.USER_CARD_TYPE === 1) {
				// 次数卡
				progressPercent = result.USER_CARD_TOTAL_TIMES > 0
					? (result.USER_CARD_REMAIN_TIMES / result.USER_CARD_TOTAL_TIMES * 100)
					: 0;
			} else {
				// 余额卡
				progressPercent = result.USER_CARD_TOTAL_AMOUNT > 0
					? (result.USER_CARD_REMAIN_AMOUNT / result.USER_CARD_TOTAL_AMOUNT * 100)
					: 0;
			}

			result.progressPercent = progressPercent;
			result.progressText = progressPercent.toFixed(1);

			this.setData({
				card: result
			});
		} catch (e) {
			pageHelper.showModal('加载失败', e.message || e.errMsg);
			console.error('加载卡项详情失败:', e);
		}
	},

	// 加载使用记录
	async loadRecords(isRefresh = false) {
		if (isRefresh) {
			this.setData({
				page: 1,
				records: [],
				isLoadMore: true
			});
		}

		if (!this.data.isLoadMore) return;
		if (this.data.isLoad) return;

		this.setData({ isLoad: true });

		try {
			let params = {
				userCardId: this.data.id,
				page: this.data.page,
				size: this.data.size
			};

			let result = await cloudHelper.callCloudData('card/my_card_records', params);

			let records = this.data.records;
			if (isRefresh) {
				records = result.list;
			} else {
				records = records.concat(result.list);
			}

			this.setData({
				records: records,
				total: result.total,
				page: this.data.page + 1,
				isLoadMore: records.length < result.total,
				isLoad: false
			});
		} catch (e) {
			this.setData({ isLoad: false });
			console.error('加载使用记录失败:', e);
		}
	},

	// 下拉刷新
	onPullDownRefresh: async function () {
		await this.loadCardDetail();
		await this.loadRecords(true);
		wx.stopPullDownRefresh();
	},

	// 上拉加载更多
	onReachBottom: function () {
		this.loadRecords();
	},

	// 复制识别码
	onCopyId: function () {
		if (!this.data.card) return;
		wx.setClipboardData({
			data: this.data.card.USER_CARD_UNIQUE_ID,
			success: () => {
				pageHelper.showToast('识别码已复制');
			}
		});
	}
});
