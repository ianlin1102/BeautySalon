const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const cacheHelper = require('../../../../helper/cache_helper.js');
const bizHelper = require('../../../../biz/biz_helper.js');

Page({

	data: {
		isLoad: false,
		formName: '',
		formPic: '',
		formDesc: '',
		formOrder: 9999,
		imgList: []
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;

		this._loadDetail();
	},

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

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};
		let instructor = await cloudHelper.callCloudData('admin/instructor_detail', params, opt);
		if (!instructor) {
			this.setData({
				isLoad: null
			})
			return;
		};

		let imgList = instructor.INSTRUCTOR_PIC ? [instructor.INSTRUCTOR_PIC] : [];

		this.setData({
			isLoad: true,
			imgList: imgList,
			formName: instructor.INSTRUCTOR_NAME,
			formPic: instructor.INSTRUCTOR_PIC,
			formDesc: instructor.INSTRUCTOR_DESC || '',
			formOrder: instructor.INSTRUCTOR_ORDER
		});
	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let data = this.data;

		// 数据校验
		if (!data.formName || data.formName.trim() == '') {
			return pageHelper.showModal('请填写导师姓名');
		}

		if (!data.formPic || data.formPic.trim() == '') {
			return pageHelper.showModal('请上传导师头像');
		}

		if (!data.formOrder || data.formOrder < 1 || data.formOrder > 9999) {
			return pageHelper.showModal('排序号必须在1-9999之间');
		}

		try {
			// 上传图片到云存储（如果是新上传的图片）
			let imgList = [data.formPic];
			let isTempFile = !data.formPic.startsWith('cloud://') && !data.formPic.startsWith('https://');

			if (isTempFile) {
				console.log('检测到临时文件,准备上传:', data.formPic);
				wx.showLoading({
					title: '图片上传中...',
					mask: true
				});
				imgList = await cloudHelper.transTempPics(imgList, 'instructor/');
				console.log('上传后的图片URL:', imgList[0]);
			} else {
				console.log('图片已在云存储:', data.formPic);
			}

			let params = {
				id: this.data.id,
				name: data.formName,
				pic: imgList[0],
				desc: data.formDesc || '',
				order: data.formOrder
			};

			await cloudHelper.callCloudSumbit('admin/instructor_edit', params);

			let callback = async function () {
				bizHelper.removeCacheList('admin-instructor');
				// 清除前端缓存
				cacheHelper.remove('INSTRUCTOR_LIST');
				wx.navigateBack();
			}
			pageHelper.showSuccToast('修改成功', 2000, callback);

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
