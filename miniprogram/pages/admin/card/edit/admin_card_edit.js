const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const validate = require('../../../../helper/validate.js');
const AdminCardBiz = require('../../../../biz/admin_card_biz.js');
const dataHelper = require('../../../../helper/data_helper.js');
const setting = require('../../../../setting/setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
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

	model: function (e) {
		pageHelper.model(this, e);
	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let id = this.data.id;
		if (!id) return;

		if (!this.data.isLoad) this.setData(await AdminCardBiz.initFormData(id)); // 初始化表单数据

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};
		let card = await cloudHelper.callCloudData('admin/card_detail', params, opt);
		if (!card) {
			this.setData({
				isLoad: null
			})
			return;
		};


		this.setData({
			isLoad: true,

			imgList: card.CARD_PIC || [],

			// 表单数据
			formType: card.CARD_TYPE,
			formName: card.CARD_NAME,
			formDesc: card.CARD_DESC,
			formPrice: card.CARD_PRICE,
			formTimes: card.CARD_TIMES || 0,
			formAmount: card.CARD_AMOUNT || 0,
			formValidityDays: card.CARD_VALIDITY_DAYS || '',
			formOrder: card.CARD_ORDER,
			formPaymentZelle: card.CARD_PAYMENT_ZELLE || '',
			formPaymentQr: card.CARD_PAYMENT_QR || '',
			formPaymentInstructions: card.CARD_PAYMENT_INSTRUCTIONS || '',
			formContent: card.CARD_CONTENT || [],
		}, () => {
			this._setContentDesc();
		});
	},

	_setContentDesc: function () {
		AdminBiz.setContentDesc(this);
	},

	/**
	 * 数据提交
	 */
	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let data = this.data;

		// 数据校验
		data = validate.check(data, AdminCardBiz.CHECK_FORM, this);
		if (!data) return;

		// 验证卡项类型对应的值
		if (data.formType == 1 && (!data.formTimes || data.formTimes <= 0)) {
			return pageHelper.showModal('次数卡必须填写包含次数');
		}
		if (data.formType == 2 && (!data.formAmount || data.formAmount <= 0)) {
			return pageHelper.showModal('余额卡必须填写充值金额');
		}

		// 详细内容改为可选，不再验证

		try {
			let cardId = this.data.id;
			data.id = cardId;

			// 编辑时，如果没有图片，说明用户没有修改图片，保留原有图片即可
			// 只有在新增时才强制要求上传封面图

			// 提取简介
			data.desc = AdminCardBiz.getDesc(data.formDesc, this.data.formContent);

			// 先修改，再上传
			await cloudHelper.callCloudSumbit('admin/card_edit', data);

			// 图片 提交处理（如果用户上传了新图片）
			if (this.data.imgList.length > 0) {
				wx.showLoading({
					title: '提交中...',
					mask: true
				});
				let imgList = this.data.imgList;
				await AdminCardBiz.updateCardPic(cardId, imgList);
			}

			let formContent = this.data.formContent;
			if (formContent && formContent.length > 0) {
				wx.showLoading({
					title: '提交中...',
					mask: true
				});
				await AdminCardBiz.updateCardContentPic(cardId, formContent, this);
			}



			let callback = async () => {

				// 更新列表页面数据
				let node = {
					'CARD_NAME': data.name,
					'CARD_TYPE': data.type,
					'CARD_PRICE': data.price,
					'CARD_TIMES': data.times,
					'CARD_AMOUNT': data.amount,
					'CARD_VALIDITY_DAYS': data.validityDays || 0,
					'CARD_ORDER': data.order
				}
				pageHelper.modifyPrevPageListNodeObject(cardId, node);

				wx.navigateBack();

			}
			pageHelper.showSuccToast('修改成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}

	},


	bindImgUploadCmpt: function (e) {
		this.setData({
			imgList: e.detail
		});
	},

	switchModel: function (e) {
		pageHelper.switchModel(this, e);
	},

	/**
	 * 卡项类型切换
	 */
	bindTypeChange: function (e) {
		let type = parseInt(e.currentTarget.dataset.type);

		// 如果点击的是当前已选中的类型，不做处理
		if (this.data.formType === type) {
			return;
		}

		let updateData = {
			formType: type
		};

		// 切换类型时，重置对应字段的默认值
		if (type === 1) {
			// 切换到次数卡，重置次数为0，清空金额
			updateData.formTimes = 0;
			updateData.formAmount = 0;
		} else if (type === 2) {
			// 切换到余额卡，重置金额为0，清空次数
			updateData.formAmount = 0;
			updateData.formTimes = 0;
		}

		this.setData(updateData);
	},

	url: function (e) {
		pageHelper.url(e, this);
	}

})
