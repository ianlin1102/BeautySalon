/**
 * 卡项商城页面
 */

const cloudHelper = require('../../../helper/cloud_helper.js');
const pageHelper = require('../../../helper/page_helper.js');

Page({
	data: {
		allCards: [], // 所有卡项（从后端获取一次后缓存）
		displayCards: [], // 当前显示的卡项（根据tab筛选）
		loading: false,
		dataLoaded: false, // 标记数据是否已加载
		currentTab: 0, // 0=全部, 1=次数卡, 2=余额卡

		// 统计数据
		totalCount: 0, // 所有卡项总数
		timesCardCount: 0, // 次卡数量
		balanceCardCount: 0, // 储值卡数量

		// 彩虹色配置
		rainbowColors: [
			'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 紫色
			'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // 粉红
			'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // 蓝色
			'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // 青绿
			'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // 橙粉
			'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // 蓝紫
			'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // 浅蓝粉
			'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // 浅粉
			'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // 橙色
			'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', // 红蓝
		]
	},

	onLoad: function (options) {
		this.loadAllCards();
	},

	// 切换分类标签
	switchTab: function (e) {
		let tab = parseInt(e.currentTarget.dataset.tab);
		if (this.data.currentTab === tab) return;

		this.setData({
			currentTab: tab
		});

		// 直接从缓存的数据中筛选，不需要请求后端
		this.filterCards();
	},

	// 下拉刷新
	onPullDownRefresh: function () {
		// 重新加载所有数据
		this.setData({
			dataLoaded: false
		});
		this.loadAllCards();
	},

	// 一次性加载所有卡项
	async loadAllCards() {
		if (this.data.loading) return;

		this.setData({ loading: true });

		try {
			// 请求所有卡项（不分页，不筛选）
			let params = {
				page: 1,
				size: 1000, // 设置一个很大的数字，获取所有卡项
				cateId: '0',
				isTotal: true
			};

			let result = await cloudHelper.callCloudData('card/list', params);

			let allCards = result.list || [];

			// 统计各类卡项数量
			let timesCardCount = 0;
			let balanceCardCount = 0;

			allCards.forEach(card => {
				if (card.cardType === 1) {
					timesCardCount++;
				} else if (card.cardType === 2) {
					balanceCardCount++;
				}
			});

			// 为每张卡片分配颜色
			allCards = allCards.map((card, index) => {
				let colorIndex = index % this.data.rainbowColors.length;
				card.bgColor = this.data.rainbowColors[colorIndex];
				return card;
			});

			this.setData({
				allCards: allCards,
				totalCount: allCards.length,
				timesCardCount: timesCardCount,
				balanceCardCount: balanceCardCount,
				dataLoaded: true,
				loading: false
			});

			// 根据当前标签筛选显示
			this.filterCards();

			wx.stopPullDownRefresh();

		} catch (e) {
			console.error('加载卡项列表失败:', e);
			this.setData({
				loading: false,
				dataLoaded: true
			});
			wx.showToast({
				title: '加载失败',
				icon: 'none'
			});
			wx.stopPullDownRefresh();
		}
	},

	// 根据当前标签筛选卡项
	filterCards() {
		let displayCards = [];

		if (this.data.currentTab === 0) {
			// 全部
			displayCards = this.data.allCards;
		} else if (this.data.currentTab === 1) {
			// 次卡
			displayCards = this.data.allCards.filter(card => card.cardType === 1);
		} else if (this.data.currentTab === 2) {
			// 储值卡
			displayCards = this.data.allCards.filter(card => card.cardType === 2);
		}

		this.setData({
			displayCards: displayCards
		});
	},

	// 查看卡项详情
	viewCard(e) {
		let id = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: `/pages/card/detail/card_detail?id=${id}`
		});
	},

	// 返回
	goBack() {
		wx.navigateBack({
			delta: 1,
			fail: () => {
				wx.switchTab({
					url: '/projects/A00/default/index/default_index'
				});
			}
		});
	}
});
