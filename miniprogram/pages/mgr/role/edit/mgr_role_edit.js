const MgrBiz = require('../../../../biz/mgr_biz.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

const ALL_PERMISSIONS = [
	{ key: 'meet', label: '课程与预约管理' },
	{ key: 'user', label: '用户管理' },
	{ key: 'card', label: '次卡管理' },
	{ key: 'admin:manage', label: '管理员管理' },
	{ key: 'log:view', label: '查看日志' },
];

const PRESETS = {
	teacher: ['meet'],
	super: ['*'],
};

Page({
	data: {
		roleList: [],
		isLoad: false,

		// 编辑表单
		showForm: false,
		isEdit: false,
		editId: '',
		formName: '',
		formPermissions: [],
		allPermissions: ALL_PERMISSIONS,
		isSuperRole: false,
	},

	onLoad: async function () {
		let ok = await MgrBiz.isMgr(this, 'admin:manage');
		if (!ok) return;

		await this._loadRoles();
	},

	async _loadRoles() {
		try {
			let roles = await cloudHelper.callCloudData('mgr/role_list', {});
			this.setData({
				roleList: roles || [],
				isLoad: true,
			});
		} catch (e) {
			this.setData({ isLoad: true });
		}
	},

	// 生成权限 Map（用于 WXML checkbox 判断）
	_updatePermMap: function (perms) {
		let permMap = {};
		perms.forEach(p => { permMap[p] = true; });
		this.setData({ permMap });
	},

	// 打开新建表单
	bindAdd: function () {
		this.setData({
			showForm: true,
			isEdit: false,
			editId: '',
			formName: '',
			formPermissions: [],
			isSuperRole: false,
		});
		this._updatePermMap([]);
	},

	// 打开编辑表单
	bindEdit: function (e) {
		let id = e.currentTarget.dataset.id;
		let role = this.data.roleList.find(r => r._id === id);
		if (!role) return;

		let isSuperRole = role.ROLE_PERMISSIONS.includes('*');
		let perms = isSuperRole ? [] : [...role.ROLE_PERMISSIONS];
		this.setData({
			showForm: true,
			isEdit: true,
			editId: id,
			formName: role.ROLE_NAME,
			formPermissions: perms,
			isSuperRole,
		});
		this._updatePermMap(perms);
	},

	bindCancel: function () {
		this.setData({ showForm: false });
	},

	bindNameInput: function (e) {
		this.setData({ formName: e.detail.value });
	},

	// 权限复选框
	bindPermChange: function (e) {
		let perms = e.detail.value;
		this.setData({ formPermissions: perms });
		this._updatePermMap(perms);
	},

	// 超级管理员开关
	bindSuperChange: function (e) {
		this.setData({ isSuperRole: e.detail.value });
	},

	// 预设：老师
	bindPresetTeacher: function () {
		let perms = [...PRESETS.teacher];
		this.setData({
			formPermissions: perms,
			isSuperRole: false,
		});
		this._updatePermMap(perms);
	},

	// 预设：全部权限
	bindPresetSuper: function () {
		this.setData({
			isSuperRole: true,
			formPermissions: [],
		});
		this._updatePermMap([]);
	},

	bindSave: async function () {
		let { formName, formPermissions, isSuperRole, isEdit, editId } = this.data;

		if (!formName.trim()) {
			return pageHelper.showModal('请填写角色名称');
		}

		let permissions = isSuperRole ? ['*'] : formPermissions;

		try {
			if (isEdit) {
				await cloudHelper.callCloudSumbit('mgr/role_edit', {
					id: editId,
					name: formName.trim(),
					permissions,
				});
			} else {
				await cloudHelper.callCloudSumbit('mgr/role_add', {
					name: formName.trim(),
					permissions,
				});
			}

			pageHelper.showSuccToast(isEdit ? '修改成功' : '添加成功');
			this.setData({ showForm: false });
			await this._loadRoles();
		} catch (e) {
			// cloudHelper 已处理错误提示
		}
	}
});
