const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const bizHelper = require('../../../../biz/biz_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const cacheHelper = require('../../../../helper/cache_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');
const validate = require('../../../../helper/validate.js');
const AdminMeetBiz = require('../../../../biz/admin_meet_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		id: null,

		// 取消时间限制选择器
		showCancelPicker: false,
		cancelPickerValue: [0, 0, 0],
		cancelDayOptions: [
			{ value: 0, label: '0天' },
			{ value: 1, label: '1天' },
			{ value: 2, label: '2天' },
			{ value: 3, label: '3天' },
			{ value: 4, label: '4天' },
			{ value: 5, label: '5天' },
			{ value: 6, label: '6天' },
			{ value: 7, label: '7天' },
			{ value: -1, label: '不能取消' }
		],
		cancelHourOptions: Array.from({ length: 24 }, (_, i) => i),
		cancelMinuteOptions: [0, 15, 30, 45],
		cancelSetDisplay: '预约后不限制取消',

		// 消费类型选项
		costTypeOptions: [
			{ value: 'times', label: '仅次数卡' },
			{ value: 'balance', label: '仅储值卡' },
			{ value: 'both', label: '次数卡或储值卡' }
		],
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		pageHelper.getOptions(this, options);

		this.setData(await AdminMeetBiz.initFormData()); // 初始化表单数据

		await this._loadInstructorList();
		await this._loadDetail();

		this._setContentDesc();
	},

	/** 加载导师列表 */
	_loadInstructorList: async function () {
		try {
			let params = {};
			let opt = { title: 'none' };
			let result = await cloudHelper.callCloudData('instructor/list', params, opt);

			let instructorOptions = [];

			// 添加"尚未决定"选项
			instructorOptions.push({
				INSTRUCTOR_ID: 'UNDECIDED',
				INSTRUCTOR_NAME: '尚未决定',
				INSTRUCTOR_PIC: ''
			});

			// 映射导师列表，将 _id 转换为 INSTRUCTOR_ID
			if (result && result.list) {
				result.list.forEach(instructor => {
					instructorOptions.push({
						INSTRUCTOR_ID: instructor._id,
						INSTRUCTOR_NAME: instructor.INSTRUCTOR_NAME,
						INSTRUCTOR_PIC: instructor.INSTRUCTOR_PIC || ''
					});
				});
			}

			this.setData({
				instructorOptions: instructorOptions
			});
		} catch (err) {
			console.error('加载导师列表失败:', err);
			// 即使失败也要设置默认选项
			this.setData({
				instructorOptions: [{
					INSTRUCTOR_ID: 'UNDECIDED',
					INSTRUCTOR_NAME: '尚未决定',
					INSTRUCTOR_PIC: ''
				}]
			});
		}
	},

	/** 导师选择变化 */
	bindInstructorChange: function (e) {
		let index = parseInt(e.detail.value);
		let instructor = this.data.instructorOptions[index];

		if (!instructor) {
			console.error('[admin_meet_edit] 未找到导师对象，index:', index);
			return;
		}

		this.setData({
			formInstructorIndex: index,
			formInstructorId: instructor.INSTRUCTOR_ID,
			formInstructorName: instructor.INSTRUCTOR_NAME,
			formInstructorPic: instructor.INSTRUCTOR_PIC || ''
		});
	},

	/** 根据导师ID获取索引 */
	_getInstructorIndex: function (instructorId) {
		let options = this.data.instructorOptions;
		if (!options || options.length === 0) return 0;

		// 如果ID为空字符串,映射到UNDECIDED
		let targetId = (!instructorId || instructorId === '') ? 'UNDECIDED' : instructorId;

		for (let i = 0; i < options.length; i++) {
			if (options[i].INSTRUCTOR_ID === targetId) {
				return i;
			}
		}
		return 0; // 默认返回第一个（尚未决定）
	},

	_loadDetail: async function () {
		let id = this.data.id;
		if (!id) return;

		pageHelper.formSetBarTitleByAddEdit(id, '后台-活动/预约');

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};
		let meet = await cloudHelper.callCloudData('admin/meet_detail', params, opt);

		if (!meet) {
			this.setData({
				isLoad: null
			})
			return;
		}

		// 初始化取消限制设置
		let cancelSet = meet.MEET_CANCEL_SET || { isLimit: false, days: 0, hours: 0, minutes: 0 };
		let cancelDisplay = this._getCancelDisplay(cancelSet);

		// 初始化消费设置
		let costSet = meet.MEET_COST_SET || { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true };
		let costDisplay = this._getCostDisplay(costSet);

		// 确保 formDaysSet 是数组
		let formDaysSet = meet.MEET_DAYS_SET;
		if (!Array.isArray(formDaysSet)) {
			formDaysSet = [];
		}

		// 确保 formFormSet 是数组
		let formFormSet = meet.MEET_FORM_SET;
		if (!Array.isArray(formFormSet)) {
			console.warn('MEET_FORM_SET 不是数组，使用空数组', formFormSet);
			formFormSet = [];
		}

		this.setData({
			isLoad: true,


			// 表单数据
			formTitle: meet.MEET_TITLE,
			formTypeId: meet.MEET_TYPE_ID,
			formInstructorId: meet.MEET_INSTRUCTOR_ID || 'UNDECIDED',
			formInstructorName: meet.MEET_INSTRUCTOR_NAME || '尚未决定',
			formInstructorPic: meet.MEET_INSTRUCTOR_PIC || '',
			formInstructorIndex: this._getInstructorIndex(meet.MEET_INSTRUCTOR_ID || 'UNDECIDED'),
			formContent: meet.MEET_CONTENT,
			formOrder: meet.MEET_ORDER,
			formStyleSet: meet.MEET_STYLE_SET,
			formCourseInfo: meet.MEET_COURSE_INFO || '',

			formDaysSet: formDaysSet,

			formIsShowLimit: meet.MEET_IS_SHOW_LIMIT,

			formCancelSet: cancelSet,
			cancelSetDisplay: cancelDisplay,

			formCostSet: costSet,
			formCostTypeIndex: this._getCostTypeIndex(costSet.costType),
			costSetDisplay: costDisplay,

			formFormSet: formFormSet,
		});
	},


	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {},

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

	bindFormSetCmpt: function (e) {
		// 确保是数组
		let formFormSet = e.detail;
		if (!Array.isArray(formFormSet)) {
			formFormSet = [];
		}
		this.setData({
			formFormSet: formFormSet,
		});
	},

	bindFormAddSubmit: async function () {
		pageHelper.formClearFocus(this);

		if (!AdminBiz.isAdmin(this)) return;

		// 调试：打印所有关键字段的类型
		console.log('=== 新增提交前数据检查 ===');
		console.log('formCancelSet:', this.data.formCancelSet, 'type:', typeof this.data.formCancelSet);
		console.log('formCostSet:', this.data.formCostSet, 'type:', typeof this.data.formCostSet);
		console.log('formFormSet:', this.data.formFormSet, 'isArray:', Array.isArray(this.data.formFormSet));
		console.log('formDaysSet:', this.data.formDaysSet, 'isArray:', Array.isArray(this.data.formDaysSet));

		let data = this.data;
		if (data.formTitle.length <= 0) return pageHelper.formHint(this, 'formTitle', '请填写「标题」');

		if (data.formTypeId.length <= 0) return pageHelper.formHint(this, 'formTypeId', '请选择「分类」');

		if (data.formStyleSet.pic.length <= 0) {
			pageHelper.anchor('formStyleSet', this);
			return pageHelper.formHint(this, 'formStyleSet', '封面图片未设置');
		}
		if (data.formDaysSet.length <= 0) {
			pageHelper.anchor('formDaysSet', this);
			return pageHelper.formHint(this, 'formDaysSet', '请配置「可预约时段」');
		}
		if (data.contentDesc.includes('未填写'))
			return pageHelper.formHint(this, 'formContent', '请填写「详细介绍」');

		// 验证消费设置
		if (data.formCostSet && data.formCostSet.isEnabled) {
			let costSet = data.formCostSet;
			if (costSet.costType === 'times' || costSet.costType === 'both') {
				if (!costSet.timesCost || costSet.timesCost <= 0) {
					pageHelper.anchor('formCostSet', this);
					return pageHelper.showModal('次数卡消耗次数必须大于0');
				}
			}
			if (costSet.costType === 'balance' || costSet.costType === 'both') {
				if (!costSet.balanceCost || costSet.balanceCost <= 0) {
					pageHelper.anchor('formCostSet', this);
					return pageHelper.showModal('储值卡消耗金额必须大于0');
				}
			}
		}

		// 在验证前确保数组字段格式正确
		if (!Array.isArray(data.formFormSet)) {
			console.error('formFormSet 不是数组:', data.formFormSet);
			return pageHelper.showModal('用户资料设置数据格式错误，请刷新页面重试');
		}
		if (data.formFormSet.length <= 0) {
			return pageHelper.showModal('请至少设置一项「用户填写资料」');
		}
		if (!Array.isArray(data.formDaysSet)) {
			console.error('formDaysSet 不是数组:', data.formDaysSet);
			return pageHelper.showModal('预约时间设置数据格式错误，请刷新页面重试');
		}

		// 确保对象字段格式正确（可以是undefined，但不能是其他类型）
		if (data.formCancelSet !== undefined && (typeof data.formCancelSet !== 'object' || data.formCancelSet === null || Array.isArray(data.formCancelSet))) {
			console.error('formCancelSet 格式错误:', data.formCancelSet);
			data.formCancelSet = { isLimit: false, days: 0, hours: 0, minutes: 0 };
		}
		if (data.formCostSet !== undefined && (typeof data.formCostSet !== 'object' || data.formCostSet === null || Array.isArray(data.formCostSet))) {
			console.error('formCostSet 格式错误:', data.formCostSet);
			data.formCostSet = { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true };
		}

		data = validate.check(data, AdminMeetBiz.CHECK_FORM, this);
		if (!data) return;
		data.typeName = AdminMeetBiz.getTypeName(data.typeId);

		try {
			// 先创建，再上传 
			let result = await cloudHelper.callCloudSumbit('admin/meet_insert', data);
			let meetId = result.data.id;

			let formContent = this.data.formContent;
			if (formContent && formContent.length > 0) {
				wx.showLoading({
					title: '提交中...',
					mask: true
				});
				await AdminMeetBiz.updateMeetCotnentPic(meetId, formContent, this);
			}

			// 样式 提交处理
			let formStyleSet = this.data.formStyleSet;
			wx.showLoading({
				title: '提交中...',
				mask: true
			});
			if (!await AdminMeetBiz.updateMeetStyleSet(meetId, formStyleSet, this)) return;

			let callback = async function () {
				bizHelper.removeCacheList('admin-meet');
				bizHelper.removeCacheList('meet-list');
				// 清除前端缓存
				cacheHelper.remove('MEET_HAS_DAYS');
				cacheHelper.remove('MEET_LIST_');
				wx.navigateBack();

			}
			pageHelper.showSuccToast('添加成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}

	},

	bindFormEditSubmit: async function () {
		pageHelper.formClearFocus(this);

		if (!AdminBiz.isAdmin(this)) return;

		// 调试：打印所有关键字段的类型
		console.log('=== 编辑提交前数据检查 ===');
		console.log('formCancelSet:', this.data.formCancelSet, 'type:', typeof this.data.formCancelSet);
		console.log('formCostSet:', this.data.formCostSet, 'type:', typeof this.data.formCostSet);
		console.log('formFormSet:', this.data.formFormSet, 'isArray:', Array.isArray(this.data.formFormSet));
		console.log('formDaysSet:', this.data.formDaysSet, 'isArray:', Array.isArray(this.data.formDaysSet));

		let data = this.data;
		if (data.formTitle.length <= 0) return pageHelper.formHint(this, 'formTitle', '请填写「标题」');

		if (data.formTypeId.length <= 0) return pageHelper.formHint(this, 'formTypeId', '请选择「分类」');

		if (data.formStyleSet.pic.length <= 0) {
			pageHelper.anchor('formStyleSet', this);
			return pageHelper.formHint(this, 'formStyleSet', '封面图片未设置');
		}
		if (data.formDaysSet.length <= 0) {
			pageHelper.anchor('formDaysSet', this);
			return pageHelper.formHint(this, 'formDaysSet', '请配置「可预约时段」');
		}

		// 验证消费设置
		if (data.formCostSet && data.formCostSet.isEnabled) {
			let costSet = data.formCostSet;
			if (costSet.costType === 'times' || costSet.costType === 'both') {
				if (!costSet.timesCost || costSet.timesCost <= 0) {
					pageHelper.anchor('formCostSet', this);
					return pageHelper.showModal('次数卡消耗次数必须大于0');
				}
			}
			if (costSet.costType === 'balance' || costSet.costType === 'both') {
				if (!costSet.balanceCost || costSet.balanceCost <= 0) {
					pageHelper.anchor('formCostSet', this);
					return pageHelper.showModal('储值卡消耗金额必须大于0');
				}
			}
		}

		// 在验证前确保数组字段格式正确
		if (!Array.isArray(data.formFormSet)) {
			console.error('formFormSet 不是数组:', data.formFormSet);
			return pageHelper.showModal('用户资料设置数据格式错误，请刷新页面重试');
		}
		if (data.formFormSet.length <= 0) {
			return pageHelper.showModal('请至少设置一项「用户填写资料」');
		}
		if (!Array.isArray(data.formDaysSet)) {
			console.error('formDaysSet 不是数组:', data.formDaysSet);
			return pageHelper.showModal('预约时间设置数据格式错误，请刷新页面重试');
		}

		// 确保对象字段格式正确（可以是undefined，但不能是其他类型）
		if (data.formCancelSet !== undefined && (typeof data.formCancelSet !== 'object' || data.formCancelSet === null || Array.isArray(data.formCancelSet))) {
			console.error('formCancelSet 格式错误:', data.formCancelSet);
			data.formCancelSet = { isLimit: false, days: 0, hours: 0, minutes: 0 };
		}
		if (data.formCostSet !== undefined && (typeof data.formCostSet !== 'object' || data.formCostSet === null || Array.isArray(data.formCostSet))) {
			console.error('formCostSet 格式错误:', data.formCostSet);
			data.formCostSet = { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true };
		}

		// DEBUG: 验证调用前最后一次检查
		console.log('[admin_meet_edit] 调用 validate.check 前:');
		console.log('  data.formDaysSet:', data.formDaysSet, 'isArray:', Array.isArray(data.formDaysSet));
		console.log('  data.formFormSet:', data.formFormSet, 'isArray:', Array.isArray(data.formFormSet));
		console.log('  data.formCancelSet:', data.formCancelSet, 'typeof:', typeof data.formCancelSet);
		console.log('  data.formCostSet:', data.formCostSet, 'typeof:', typeof data.formCostSet);
		console.log('  CHECK_FORM 规则:', AdminMeetBiz.CHECK_FORM);

		data = validate.check(data, AdminMeetBiz.CHECK_FORM, this);
		if (!data) return;

		data.typeName = AdminMeetBiz.getTypeName(data.typeId);

		try {
			let meetId = this.data.id;
			data.id = meetId;

			// 先修改，再上传 
			await cloudHelper.callCloudSumbit('admin/meet_edit', data);

			// 富文本 提交处理
			let formContent = this.data.formContent;
			wx.showLoading({
				title: '提交中...',
				mask: true
			});
			if (!await AdminMeetBiz.updateMeetCotnentPic(meetId, formContent, this)) return;


			// 样式 提交处理
			let formStyleSet = this.data.formStyleSet;
			wx.showLoading({
				title: '提交中...',
				mask: true
			});
			if (!await AdminMeetBiz.updateMeetStyleSet(meetId, formStyleSet, this)) return;


			let callback = async function () {
				// 更新列表页面数据
				let node = {
					'MEET_TITLE': data.title,
					'MEET_TYPE_NAME': data.typeName,
					'MEET_DAYS_SET': data.daysSet,
					'MEET_FORM_SET': data.formSet,
					'MEET_EDIT_TIME': timeHelper.time('Y-M-D h:m:s'),
					'leaveDay': AdminMeetBiz.getLeaveDay(data.daysSet)
				}
				pageHelper.modifyPrevPageListNodeObject(meetId, node);
				// 清除前端缓存
				cacheHelper.remove('MEET_HAS_DAYS');
				cacheHelper.remove('MEET_LIST_');
				wx.navigateBack();

			}
			pageHelper.showSuccToast('编辑成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}

	},


	bindMyImgUploadListener: function (e) {
		this.setData({
			imgList: e.detail
		});
	},

	switchModel: function (e) {
		pageHelper.switchModel(this, e);
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	_setContentDesc: function () {
		let contentDesc = '未填写';
		let content = this.data.formContent;
		let imgCnt = 0;
		let textCnt = 0;
		for (let k in content) {
			if (content[k].type == 'img') imgCnt++;
			if (content[k].type == 'text') textCnt++;
		}

		if (imgCnt || textCnt) {
			contentDesc = textCnt + '段文字，' + imgCnt + '张图片';
		}
		this.setData({
			contentDesc
		});
	},

	// 取消限制开关
	bindCancelLimitChange: function (e) {
		let isLimit = e.detail.value;

		// 创建新的 cancelSet 对象
		let cancelSet = {
			isLimit: isLimit,
			days: this.data.formCancelSet.days,
			hours: this.data.formCancelSet.hours,
			minutes: this.data.formCancelSet.minutes
		};

		if (!isLimit) {
			// 关闭限制时重置为默认值
			cancelSet.days = 0;
			cancelSet.hours = 0;
			cancelSet.minutes = 0;
		}

		this.setData({
			formCancelSet: cancelSet,
			cancelSetDisplay: this._getCancelDisplay(cancelSet)
		});
	},

	// 显示取消时间选择器
	bindShowCancelPicker: function () {
		let cancelSet = this.data.formCancelSet;

		// 设置当前值到选择器
		let dayIndex = 0;
		if (cancelSet.days === -1) {
			dayIndex = 8; // "不能取消"选项
		} else {
			dayIndex = cancelSet.days;
		}

		let hourIndex = cancelSet.hours || 0;
		let minuteIndex = this.data.cancelMinuteOptions.indexOf(cancelSet.minutes) || 0;

		this.setData({
			showCancelPicker: true,
			cancelPickerValue: [dayIndex, hourIndex, minuteIndex]
		});
	},

	// 隐藏取消时间选择器
	bindHideCancelPicker: function () {
		this.setData({
			showCancelPicker: false
		});
	},

	// 选择器滚动
	bindCancelPickerChange: function (e) {
		this.setData({
			cancelPickerValue: e.detail.value
		});
	},

	// 确认选择
	bindConfirmCancelPicker: function () {
		let value = this.data.cancelPickerValue;

		// 获取选中的天数
		let dayOption = this.data.cancelDayOptions[value[0]];
		let days = dayOption.value;

		// 创建新的 cancelSet 对象
		let cancelSet = {
			isLimit: this.data.formCancelSet.isLimit,
			days: days,
			hours: 0,
			minutes: 0
		};

		// 如果不是"不能取消"，设置小时和分钟
		if (days !== -1) {
			cancelSet.hours = this.data.cancelHourOptions[value[1]];
			cancelSet.minutes = this.data.cancelMinuteOptions[value[2]];
		}

		this.setData({
			formCancelSet: cancelSet,
			cancelSetDisplay: this._getCancelDisplay(cancelSet),
			showCancelPicker: false
		});
	},

	// 获取取消限制的显示文本
	_getCancelDisplay: function (cancelSet) {
		if (!cancelSet || !cancelSet.isLimit) {
			return '预约后不限制取消';
		}

		if (cancelSet.days === -1) {
			return '预约后不能取消';
		}

		let parts = [];
		if (cancelSet.days > 0) parts.push(cancelSet.days + '天');
		if (cancelSet.hours > 0) parts.push(cancelSet.hours + '时');
		if (cancelSet.minutes > 0) parts.push(cancelSet.minutes + '分');

		if (parts.length === 0) {
			return '预约开始前不能取消';
		}

		return '预约开始前' + parts.join('') + '不能取消';
	},

	// 获取消费设置的显示文本
	_getCostDisplay: function (costSet) {
		if (!costSet || !costSet.isEnabled) {
			return '免费预约';
		}

		let parts = [];
		if (costSet.costType === 'times' || costSet.costType === 'both') {
			if (costSet.timesCost > 0) {
				parts.push(costSet.timesCost + '次');
			}
		}
		if (costSet.costType === 'balance' || costSet.costType === 'both') {
			if (costSet.balanceCost > 0) {
				parts.push(costSet.balanceCost + '元');
			}
		}

		if (parts.length === 0) {
			return '免费预约';
		}

		let desc = '消耗' + parts.join(' 或 ');
		if (costSet.costType === 'both') {
			desc += ' (用户可选)';
		}
		return desc;
	},

	// 获取消费类型在选项数组中的索引
	_getCostTypeIndex: function (costType) {
		let options = this.data.costTypeOptions;
		for (let i = 0; i < options.length; i++) {
			if (options[i].value === costType) {
				return i;
			}
		}
		return 0; // 默认返回第一个
	},

	// 消费启用开关
	bindCostEnabledChange: function (e) {
		let isEnabled = e.detail.value;
		let costSet = {
			isEnabled: isEnabled,
			costType: this.data.formCostSet.costType,
			timesCost: this.data.formCostSet.timesCost,
			balanceCost: this.data.formCostSet.balanceCost,
			allowAutoSelect: this.data.formCostSet.allowAutoSelect
		};

		if (!isEnabled) {
			// 关闭时重置为免费
			costSet.costType = 'free';
			costSet.timesCost = 1;
			costSet.balanceCost = 0;
		}

		this.setData({
			formCostSet: costSet,
			costSetDisplay: this._getCostDisplay(costSet)
		});
	},

	// 消费类型选择
	bindCostTypeChange: function (e) {
		let index = parseInt(e.detail.value);
		let costType = this.data.costTypeOptions[index].value;

		let costSet = {
			isEnabled: this.data.formCostSet.isEnabled,
			costType: costType,
			timesCost: this.data.formCostSet.timesCost,
			balanceCost: this.data.formCostSet.balanceCost,
			allowAutoSelect: this.data.formCostSet.allowAutoSelect
		};

		this.setData({
			formCostSet: costSet,
			formCostTypeIndex: index,
			costSetDisplay: this._getCostDisplay(costSet)
		});
	},

	// 次数输入
	bindTimesInput: function (e) {
		let times = parseInt(e.detail.value) || 1;
		if (times < 1) times = 1;
		if (times > 999) times = 999;

		let costSet = {
			isEnabled: this.data.formCostSet.isEnabled,
			costType: this.data.formCostSet.costType,
			timesCost: times,
			balanceCost: this.data.formCostSet.balanceCost,
			allowAutoSelect: this.data.formCostSet.allowAutoSelect
		};

		this.setData({
			formCostSet: costSet,
			costSetDisplay: this._getCostDisplay(costSet)
		});
	},

	// 金额输入
	bindBalanceInput: function (e) {
		let balance = parseFloat(e.detail.value);

		// 如果是空字符串或无效值，设置为空（允许用户清空输入）
		if (e.detail.value === '' || isNaN(balance)) {
			balance = 0;
		} else {
			if (balance < 0) balance = 0;
			if (balance > 999999) balance = 999999;
			// 保留两位小数
			balance = Math.round(balance * 100) / 100;
		}

		let costSet = {
			isEnabled: this.data.formCostSet.isEnabled,
			costType: this.data.formCostSet.costType,
			timesCost: this.data.formCostSet.timesCost,
			balanceCost: balance,
			allowAutoSelect: this.data.formCostSet.allowAutoSelect
		};

		this.setData({
			formCostSet: costSet,
			costSetDisplay: this._getCostDisplay(costSet)
		});
	},

	// 自动选择开关
	bindAutoSelectChange: function (e) {
		let allowAutoSelect = e.detail.value;
		let costSet = {
			isEnabled: this.data.formCostSet.isEnabled,
			costType: this.data.formCostSet.costType,
			timesCost: this.data.formCostSet.timesCost,
			balanceCost: this.data.formCostSet.balanceCost,
			allowAutoSelect: allowAutoSelect
		};

		this.setData({
			formCostSet: costSet
		});
	},

	// 阻止触摸移动
	preventTouchMove: function () {
		return false;
	},

	// 阻止关闭
	preventClose: function () {
		return false;
	}

})