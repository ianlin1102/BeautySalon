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
		agreedCardTerms: false, // 是否同意卡项条款

		// 条款相关
		showTermsModal: false,
		termsTitle: '',
		termsSections: [],
		showUserTermsModal: false,
		userTermsSections: [],
		userTermsVersion: 0,
		needAgreeUserTerms: false,

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
	 * 勾选卡项条款
	 */
	bindAgreeCardTerms: function (e) {
		const agreed = e.detail.value.length > 0;
		this.setData({
			agreedCardTerms: agreed
		});
	},

	/**
	 * 查看卡项条款
	 */
	bindViewCardTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/get', { type: 'card_terms' }, { title: 'bar' });
			this.setData({
				showTermsModal: true,
				termsTitle: '卡项购买条款',
				termsSections: res.sections || []
			});
		} catch (err) {
			console.error('获取条款失败:', err);
			pageHelper.showModal('获取条款失败，请重试');
		}
	},

	/**
	 * 关闭条款弹窗
	 */
	bindCloseTermsModal: function () {
		this.setData({ showTermsModal: false });
	},

	/**
	 * 跳转到卡项条款页面
	 */
	bindNavToCardTerms: function () {
		wx.navigateTo({ url: '/pages/terms/card/terms_card' });
	},

	/**
	 * 检查用户条款状态（严格模式 - 阻止继续）
	 */
	_checkUserTermsStrict: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/check_user_terms', {}, { title: 'none' });

			if (res.needAgree || res.userAgreed !== 1) {
				return new Promise((resolve) => {
					wx.showModal({
						title: '需要同意用户条款',
						content: '您需要先同意用户服务条款才能继续操作',
						cancelText: '我再看看',
						confirmText: '前往同意',
						success: (result) => {
							if (result.confirm) {
								wx.navigateTo({ url: '/pages/terms/user/terms_user' });
							}
							resolve(false);
						}
					});
				});
			}
			return true;
		} catch (err) {
			console.error('检查用户条款失败:', err);
			return true;
		}
	},

	/**
	 * 检查用户条款状态（旧版本 - 内嵌弹窗）
	 */
	_checkUserTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/check_user_terms', {}, { title: 'none' });
			if (res.needAgree) {
				// 需要同意用户条款，获取条款内容
				let termsRes = await cloudHelper.callCloudData('terms/get', { type: 'user_terms' }, { title: 'none' });
				this.setData({
					needAgreeUserTerms: true,
					showUserTermsModal: true,
					userTermsSections: termsRes.sections || [],
					userTermsVersion: res.currentVersion
				});
				return false;
			}
			return true;
		} catch (err) {
			console.error('检查用户条款失败:', err);
			return true; // 失败时默认通过
		}
	},

	/**
	 * 同意用户条款
	 */
	bindAgreeUserTerms: async function () {
		try {
			await cloudHelper.callCloudSumbit('terms/agree_user_terms', {
				version: this.data.userTermsVersion
			}, { title: '提交中' });

			// 记录用户条款同意信息（用于审计）
			this._userTermsInfo = {
				version: this.data.userTermsVersion,
				time: Date.now()
			};

			this.setData({
				showUserTermsModal: false,
				needAgreeUserTerms: false
			});

			// 同意后继续购买流程
			this.setData({ showPurchaseModal: true });
		} catch (err) {
			console.error('同意条款失败:', err);
			pageHelper.showModal('操作失败，请重试');
		}
	},

	/**
	 * 拒绝用户条款
	 */
	bindRefuseUserTerms: function () {
		this.setData({ showUserTermsModal: false });
	},

	/**
	 * 立即购买按钮 - 显示购买确认弹窗
	 * 检查顺序：1. 登录 → 2. 用户条款 → 3. 卡项购买条款
	 */
	bindPurchaseTap: async function () {
		// 1. 首先检查登录状态
		if (!PassportBiz.isLoggedIn()) {
			pageHelper.showModal('请先登录');
			return;
		}

		// 2. 检查用户条款
		let userTermsStrictOk = await this._checkUserTermsStrict();
		if (!userTermsStrictOk) return;

		// 3. 检查是否同意卡项购买条款
		if (!this.data.agreedCardTerms) {
			pageHelper.showModal('请先阅读并同意卡项购买条款');
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

			// 构建条款同意信息（用于审计追踪）
			let termsInfo = {
				cardTermsAgreed: this.data.agreedCardTerms || false,
				cardTermsTime: Date.now(),
				userTermsVersion: this._userTermsInfo ? this._userTermsInfo.version : 0,
				userTermsTime: this._userTermsInfo ? this._userTermsInfo.time : 0,
			};

			let result = await PurchaseBiz.createOrder(card._id, 'zelle', termsInfo);

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
