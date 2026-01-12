const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');
const PassportBiz = require('../../../biz/passport_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		card: null,
		agreedDisclaimer: false, // 是否同意免责声明
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!pageHelper.getOptions(this, options)) return;

		this._loadDetail();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {

	},

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

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function () {
		let id = this.data.id;
		if (!id) return;

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};

		try {
			let card = await cloudHelper.callCloudData('card/view', params, opt);
			if (!card) {
				this.setData({
					isLoad: null
				})
				return;
			}

			console.log('卡项详情数据:', card);
			console.log('CARD_CONTENT:', card.CARD_CONTENT);
			console.log('CARD_PAYMENT_ZELLE:', card.CARD_PAYMENT_ZELLE);

			this.setData({
				isLoad: true,
				card: card
			});
		} catch (err) {
			console.error(err);
			this.setData({
				isLoad: null
			});
		}
	},

	/**
	 * 勾选免责声明
	 */
	bindAgreeDisclaimer: function (e) {
		const agreed = e.detail.value.length > 0;
		this.setData({
			agreedDisclaimer: agreed
		});
	},

	/**
	 * 查看免责声明
	 */
	bindViewDisclaimer: function () {
		wx.navigateTo({
			url: '/pages/card/disclaimer/card_disclaimer'
		});
	},

	/**
	 * 立即购买按钮
	 */
	bindPurchaseTap: function () {
		// 检查是否同意免责声明
		if (!this.data.agreedDisclaimer) {
			pageHelper.showModal('请先阅读并同意购买免责声明');
			return;
		}

		// 检查登录状态
		if (!PassportBiz.check(this)) {
			return;
		}

		// TODO: 实现购买流程
		pageHelper.showModal('购买功能即将上线，敬请期待！');
	},

	/**
	 * 预览图片
	 */
	bindViewImage: function (e) {
		let url = pageHelper.dataset(e, 'url');
		let urls = this.data.card.CARD_PIC || [];
		wx.previewImage({
			current: url,
			urls: urls
		});
	}

})
