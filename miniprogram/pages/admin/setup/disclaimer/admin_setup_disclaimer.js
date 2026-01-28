const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

// 默认声明内容
const DEFAULT_SECTIONS = [
	{
		title: '一、购买须知',
		content: '1. 购买本卡项即表示您已充分了解并同意本免责声明的全部内容。\n2. 卡项一经售出，概不退换。请在购买前仔细核对卡项类型、次数/金额、有效期等信息。\n3. 卡项仅限本人使用，不得转让、出售或赠予他人。'
	},
	{
		title: '二、使用规则',
		content: '1. 卡项使用时需提前预约，预约时间以实际可预约时段为准。\n2. 如需取消预约，请至少提前24小时通知，否则将扣除相应次数或金额。\n3. 卡项在有效期内未使用完毕，过期自动作废，不予退款或延期。'
	},
	{
		title: '三、免责条款',
		content: '1. 因不可抗力（如自然灾害、政府行为等）导致无法提供服务的，本机构不承担任何责任。\n2. 用户因个人原因无法使用卡项的（如身体状况、时间安排等），本机构不承担责任。\n3. 本机构保留对卡项规则的最终解释权。'
	},
	{
		title: '四、其他说明',
		content: '1. 本免责声明的修改、更新及最终解释权归本机构所有。\n2. 如对本声明有任何疑问，请联系客服咨询。'
	}
];

Page({
	data: {
		isLoad: false,
		formTitle: '卡项购买免责声明',
		sections: []
	},

	onLoad: async function(options) {
		if (!AdminBiz.isAdmin(this)) return;
		await this._loadDetail();
	},

	onPullDownRefresh: async function() {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function() {
		if (!AdminBiz.isAdmin(this)) return;

		try {
			let opts = { title: 'bar' };
			let res = await cloudHelper.callCloudData('admin/disclaimer_get', {}, opts);

			let sections = (res && res.sections && res.sections.length > 0) ? res.sections : DEFAULT_SECTIONS;

			this.setData({
				isLoad: true,
				formTitle: res?.title || '卡项购买免责声明',
				sections: sections
			});
		} catch (err) {
			console.error('加载失败:', err);
			this.setData({
				isLoad: true,
				sections: DEFAULT_SECTIONS
			});
		}
	},

	// 修改小节标题
	bindTitleInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].title = e.detail.value;
		this.setData({ sections });
	},

	// 修改小节内容
	bindContentInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].content = e.detail.value;
		this.setData({ sections });
	},

	// 添加小节
	bindAddSection: function() {
		let sections = this.data.sections;
		let num = sections.length + 1;
		let numCn = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][num - 1] || num;
		sections.push({
			title: `${numCn}、新增条款`,
			content: '请输入条款内容'
		});
		this.setData({ sections });
	},

	// 删除小节
	bindDelSection: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		if (sections.length <= 1) {
			pageHelper.showModal('至少保留一个条款');
			return;
		}
		sections.splice(idx, 1);
		this.setData({ sections });
	},

	// 恢复默认
	bindResetDefault: function() {
		pageHelper.showConfirm('确认恢复为默认内容？当前编辑内容将丢失', () => {
			this.setData({
				formTitle: '卡项购买免责声明',
				sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS))
			});
		});
	},

	// 提交保存
	bindFormSubmit: async function() {
		if (!AdminBiz.isAdmin(this)) return;

		let data = {
			title: this.data.formTitle,
			sections: this.data.sections
		};

		// 校验
		for (let i = 0; i < data.sections.length; i++) {
			if (!data.sections[i].title || !data.sections[i].title.trim()) {
				pageHelper.showModal(`第 ${i + 1} 个条款标题不能为空`);
				return;
			}
			if (!data.sections[i].content || !data.sections[i].content.trim()) {
				pageHelper.showModal(`第 ${i + 1} 个条款内容不能为空`);
				return;
			}
		}

		try {
			let opts = { title: '保存中' };
			await cloudHelper.callCloudSumbit('admin/disclaimer_save', data, opts);
			pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error('保存失败:', err);
			pageHelper.showModal('保存失败，请重试');
		}
	}
});
