const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const bizHelper = require('../../../../biz/biz_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const cacheHelper = require('../../../../helper/cache_helper.js');
const validate = require('../../../../helper/validate.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		formPic: '',
		formUrl: '',
		formOrder: 9999,
		imgList: []
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		this.setData({
			isLoad: true
		});
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
		if (!data.formPic || data.formPic.trim() == '') {
			return pageHelper.showModal('请上传轮播图片');
		}

		if (!data.formOrder || data.formOrder < 1 || data.formOrder > 9999) {
			return pageHelper.showModal('排序号必须在1-9999之间');
		}

		try {
			// 上传图片到云存储
			let imgList = [data.formPic];
			let isTempFile = !data.formPic.startsWith('cloud://') && !data.formPic.startsWith('https://');

			if (isTempFile) {
				console.log('检测到临时文件,准备上传:', data.formPic);
				wx.showLoading({
					title: '图片上传中...',
					mask: true
				});
				imgList = await cloudHelper.transTempPics(imgList, 'carousel/');
				console.log('上传后的图片URL:', imgList[0]);
			} else {
				console.log('图片已在云存储:', data.formPic);
			}

			let params = {
				pic: imgList[0],
				url: data.formUrl || '',
				order: data.formOrder
			};

			await cloudHelper.callCloudSumbit('admin/carousel_insert', params);

			let callback = async function () {
				bizHelper.removeCacheList('admin-carousel');
				// 清除前端缓存
				cacheHelper.remove('CAROUSEL_LIST');
				wx.navigateBack();
			}
			pageHelper.showSuccToast('添加成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}

	},

	bindImgUploadCmpt: function (e) {
		let imgList = e.detail;
		this.setData({
			imgList: imgList,
			formPic: imgList && imgList.length > 0 ? imgList[0] : ''
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	}

})
