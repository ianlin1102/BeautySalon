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

		// Purchase flow state
		showPurchaseModal: false,
		showUploadModal: false,
		purchaseId: '',
		proofImage: '',
		uploading: false,
		purchaseSuccess: false,
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
	 * 立即购买按钮 - 显示购买确认弹窗
	 */
	bindPurchaseTap: function () {
		// 检查是否同意免责声明
		if (!this.data.agreedDisclaimer) {
			pageHelper.showModal('请先阅读并同意购买免责声明');
			return;
		}

		// 检查登录状态
		if (!PassportBiz.isLoggedIn()) {
			pageHelper.showModal('请先登录');
			return;
		}

		this.setData({ showPurchaseModal: true });
	},

	/**
	 * 确认购买 - 创建订单
	 */
	bindConfirmPurchase: async function () {
		try {
			const PurchaseBiz = require('../../../biz/purchase_biz.js');
			let card = this.data.card;
			let result = await PurchaseBiz.createOrder(card._id, 'zelle');

			this.setData({
				showPurchaseModal: false,
				showUploadModal: true,
				purchaseId: result.purchaseId,
			});
		} catch (err) {
			console.error('创建订单失败:', err);
			pageHelper.showModal('创建订单失败，请重试');
		}
	},

	/**
	 * 选择凭证图片
	 */
	bindChooseImage: function () {
		wx.chooseMedia({
			count: 1,
			mediaType: ['image'],
			sourceType: ['album', 'camera'],
			sizeType: ['compressed'],
			success: (res) => {
				let tempFilePath = res.tempFiles[0].tempFilePath;
				this.setData({ proofImage: tempFilePath });
			}
		});
	},

	/**
	 * 上传凭证
	 */
	bindUploadProof: async function () {
		if (!this.data.proofImage) {
			pageHelper.showModal('请先选择支付凭证图片');
			return;
		}

		this.setData({ uploading: true });

		try {
			const PurchaseBiz = require('../../../biz/purchase_biz.js');
			await PurchaseBiz.uploadProof(this.data.purchaseId, this.data.proofImage);

			this.setData({
				uploading: false,
				purchaseSuccess: true,
			});
		} catch (err) {
			console.error('上传凭证失败:', err);
			this.setData({ uploading: false });
			pageHelper.showModal('上传失败，请重试');
		}
	},

	/**
	 * 关闭购买确认弹窗
	 */
	bindClosePurchaseModal: function () {
		this.setData({ showPurchaseModal: false });
	},

	/**
	 * 关闭上传弹窗（未上传凭证则取消订单）
	 */
	bindCloseUploadModal: async function () {
		let purchaseId = this.data.purchaseId;
		this.setData({
			showUploadModal: false,
			proofImage: '',
			purchaseId: '',
		});
		// 未上传凭证，取消该订单（作废处理）
		if (purchaseId && !this.data.purchaseSuccess) {
			try {
				await cloudHelper.callCloudSumbit('purchase/cancel', { purchaseId }, { hint: false });
			} catch (err) {
				console.log('取消订单:', err);
			}
		}
	},

	/**
	 * 关闭成功弹窗
	 */
	bindCloseSuccessModal: function () {
		this.setData({
			purchaseSuccess: false,
			showUploadModal: false,
			proofImage: '',
			purchaseId: '',
		});
	},

	/**
	 * 预览凭证图片
	 */
	bindPreviewProof: function () {
		if (this.data.proofImage) {
			wx.previewImage({
				current: this.data.proofImage,
				urls: [this.data.proofImage]
			});
		}
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
