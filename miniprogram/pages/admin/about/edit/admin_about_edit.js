const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const AdminCardBiz = require('../../../../biz/admin_card_biz.js');

Page({

	data: {
		isLoad: false,
		formTitle: '',
		formContent: [],
		contentDesc: '未填写'
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
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

		let opt = {
			title: 'bar'
		};
		let about = await cloudHelper.callCloudData('admin/about_detail', {}, opt);

		this.setData({
			isLoad: true,
			formTitle: about.ABOUT_TITLE || '',
			formContent: about.ABOUT_CONTENT || []
		}, () => {
			this._setContentDesc();
		});
	},

	_setContentDesc: function () {
		let contentDesc = '未填写';
		let formContent = this.data.formContent;
		if (formContent && formContent.length > 0) {
			let hasContent = false;
			for (let item of formContent) {
				if (item.type === 'text' && item.val && item.val.trim()) {
					hasContent = true;
					break;
				}
				if (item.type === 'img' && item.val) {
					hasContent = true;
					break;
				}
			}
			if (hasContent) {
				contentDesc = '已填写';
			}
		}
		this.setData({ contentDesc });
	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let data = this.data;

		console.log('========== 开始提交 ==========');
		console.log('原始 data.formTitle:', data.formTitle);
		console.log('原始 data.formContent:', data.formContent);

		try {
			wx.showLoading({
				title: '提交中...',
				mask: true
			});

			// 1. 清理 formContent 数据，确保只包含纯净的对象
			let cleanContent = [];
			if (data.formContent && data.formContent.length > 0) {
				console.log('开始清理 formContent，原始长度:', data.formContent.length);
				for (let i = 0; i < data.formContent.length; i++) {
					let item = data.formContent[i];
					console.log(`formContent[${i}]:`, item);
					console.log(`  - type: ${item.type}`);
					console.log(`  - val: ${item.val}`);
					console.log(`  - 所有keys:`, Object.keys(item));

					// 只保留 type 和 val 字段，移除其他可能的脏数据
					cleanContent.push({
						type: item.type,
						val: item.val || ''
					});
				}
				console.log('清理后的 cleanContent:', cleanContent);
			}

			// 2. 提取富文本中的图片并上传
			let imgList = [];
			for (let item of cleanContent) {
				if (item.type == 'img' && item.val) {
					imgList.push(item.val);
				}
			}

			// 上传图片到云存储
			if (imgList.length > 0) {
				console.log('开始上传富文本中的图片，数量:', imgList.length);
				let uploadedImgs = await cloudHelper.transTempPics(imgList, 'about/', 'about');
				console.log('图片上传完成:', uploadedImgs);

				// 更新富文本中的图片地址
				let imgIdx = 0;
				for (let item of cleanContent) {
					if (item.type == 'img') {
						item.val = uploadedImgs[imgIdx];
						imgIdx++;
					}
				}
			}

			// 3. 保存数据（标题 + 富文本内容）
			let params = {
				title: data.formTitle || '',
				content: cleanContent,
				pic: [] // 不再使用单独的封面图片
			};

			console.log('========== 提交参数 ==========');
			console.log('params.title:', params.title);
			console.log('params.content:', params.content);
			console.log('完整 params JSON:', JSON.stringify(params));
			console.log('========== 开始调用 API ==========');

			let result = await cloudHelper.callCloudSumbit('admin/about_edit', params);
			console.log('admin/about_edit 返回结果:', result);

			// 更新本地数据
			this.setData({
				formContent: cleanContent
			});

			wx.hideLoading();
			pageHelper.showSuccToast('保存成功', 2000);

		} catch (err) {
			wx.hideLoading();
			console.error('提交失败:', err);
			pageHelper.showModal('提交失败', err.msg || err.message || '未知错误');
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	}

})
