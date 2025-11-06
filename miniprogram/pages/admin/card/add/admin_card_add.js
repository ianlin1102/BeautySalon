const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const bizHelper = require('../../../../biz/biz_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const validate = require('../../../../helper/validate.js');
const AdminCardBiz = require('../../../../biz/admin_card_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {

	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		this.setData(await AdminCardBiz.initFormData()); // 初始化表单数据
		this.setData({
			isLoad: true
		});

		this._setContentDesc();
	},

	_setContentDesc: function () {
		AdminBiz.setContentDesc(this);
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

	model: function (e) {
		pageHelper.model(this, e);
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
		// 图片也改为可选
		try {

			// 卡项描述(CARD_DESC)：直接使用用户填写的值，不做任何提取
			// 注意：validate.check() 已经将 formDesc 映射为 desc
			// data.desc 已经包含了用户填写的卡项描述，留空则为空字符串

			// 先创建，再上传
			let result = await cloudHelper.callCloudSumbit('admin/card_insert', data);
			let cardId = result.data.id;

			// 图片 提交处理
			wx.showLoading({
				title: '提交中...',
				mask: true
			});
			let imgList = this.data.imgList;
			await AdminCardBiz.updateCardPic(cardId, imgList);

			let formContent = this.data.formContent;
			if (formContent && formContent.length > 0) {
				wx.showLoading({
					title: '提交中...',
					mask: true
				});
				await AdminCardBiz.updateCardContentPic(cardId, formContent, this);
			}

			let callback = async function () {
				bizHelper.removeCacheList('admin-card');
				bizHelper.removeCacheList('card-list');
				wx.navigateBack();

			}
			pageHelper.showSuccToast('添加成功', 2000, callback);

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
