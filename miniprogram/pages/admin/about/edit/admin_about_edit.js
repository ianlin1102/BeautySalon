const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const setting = require('../../../../setting/setting.js');

Page({

	data: {
		isLoad: false,
		showInstructorPicker: false,
		allInstructors: [],       // All instructors for picker
		featuredInstructors: [],  // Selected featured instructors (full objects)
		featuredIds: [],          // Selected IDs only
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		await this._loadDetail();
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let opts = { title: 'bar' };

		// Load setup data
		let setup = await cloudHelper.callCloudData('home/setup_all', {}, opts);
		if (!setup) return;

		// Load all instructors for picker
		let instrResult = await cloudHelper.callCloudData('instructor/list', {}, opts);
		let allInstructors = (instrResult && instrResult.list) || [];

		// Match featured instructors
		let featuredIds = setup.SETUP_FEATURED_INSTRUCTORS || [];
		let featuredInstructors = [];
		for (let id of featuredIds) {
			let found = allInstructors.find(i => i._id === id);
			if (found) featuredInstructors.push(found);
		}

		// Mark selected in allInstructors
		allInstructors.forEach(i => {
			i.selected = featuredIds.includes(i._id);
		});

		this.setData({
			isLoad: true,
			formAbout: setup.SETUP_ABOUT || '',
			formAboutEn: setup.SETUP_ABOUT_EN || '',
			formAddress: setup.SETUP_ADDRESS || '',
			formAddressEn: setup.SETUP_ADDRESS_EN || '',
			formPhone: setup.SETUP_PHONE || '',
			formHours: setup.SETUP_HOURS || '',
			formHoursEn: setup.SETUP_HOURS_EN || '',
			formWechat: setup.SETUP_WECHAT || '',
			formServicePic: setup.SETUP_SERVICE_PIC || [],
			formOfficePic: setup.SETUP_OFFICE_PIC || [],
			allInstructors,
			featuredInstructors,
			featuredIds,
		});
	},

	// Instructor picker
	bindShowInstructorPicker: function () {
		this.setData({ showInstructorPicker: true });
	},

	bindHideInstructorPicker: function () {
		this.setData({ showInstructorPicker: false });
	},

	bindPickInstructor: function (e) {
		let id = pageHelper.dataset(e, 'id');
		let { featuredInstructors, featuredIds, allInstructors } = this.data;

		if (featuredIds.includes(id)) {
			// Already selected — remove
			featuredIds = featuredIds.filter(fid => fid !== id);
			featuredInstructors = featuredInstructors.filter(i => i._id !== id);
		} else {
			if (featuredIds.length >= 4) {
				wx.showToast({ title: '最多选择4位', icon: 'none' });
				return;
			}
			let instr = allInstructors.find(i => i._id === id);
			if (instr) {
				featuredIds.push(id);
				featuredInstructors.push(instr);
			}
		}

		// Update selected state
		allInstructors.forEach(i => {
			i.selected = featuredIds.includes(i._id);
		});

		this.setData({
			featuredInstructors,
			featuredIds,
			allInstructors,
		});
	},

	bindRemoveInstructor: function (e) {
		let index = pageHelper.dataset(e, 'index');
		let { featuredInstructors, featuredIds, allInstructors } = this.data;

		let removedId = featuredInstructors[index]._id;
		featuredInstructors.splice(index, 1);
		featuredIds = featuredIds.filter(id => id !== removedId);

		allInstructors.forEach(i => {
			i.selected = featuredIds.includes(i._id);
		});

		this.setData({
			featuredInstructors,
			featuredIds,
			allInstructors,
		});
	},

	// Form submit
	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		try {
			// Upload QR images if needed
			let servicePic = this.data.formServicePic;
			let officePic = this.data.formOfficePic;

			if ((servicePic.length > 0 || officePic.length > 0)) {
				wx.showLoading({ title: '图片上传中' });
			}

			servicePic = await cloudHelper.transTempPics(servicePic, setting.SETUP_PIC_PATH, '');
			officePic = await cloudHelper.transTempPics(officePic, setting.SETUP_PIC_PATH, '');

			let data = {
				about: this.data.formAbout,
				aboutEn: this.data.formAboutEn,
				featuredInstructors: this.data.featuredIds,
				address: this.data.formAddress,
				addressEn: this.data.formAddressEn,
				phone: this.data.formPhone,
				hours: this.data.formHours,
				hoursEn: this.data.formHoursEn,
				wechat: this.data.formWechat,
				servicePic,
				officePic,
			};

			await cloudHelper.callCloudSumbit('admin/setup_about', data).then(res => {
				pageHelper.showSuccToast('保存成功', 1500);
			});
		} catch (err) {
			console.log(err);
		}
	},

	bindUploadCmpt: function (e) {
		let item = pageHelper.dataset(e, 'item');
		this.setData({ [item]: e.detail });
	},

	model: function (e) {
		pageHelper.model(this, e);
	},

	url: function (e) {
		pageHelper.url(e, this);
	}

})
