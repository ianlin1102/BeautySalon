const MgrBiz = require('../../../../biz/mgr_biz.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
	data: {
		isEdit: false,
		adminId: '',
		name: '',
		openid: '',
		status: 1,

		roleList: [],
		roleIndex: 0,
		roleId: '',

		// 用户搜索
		userKeyword: '',
		userResults: [],
		showUserResults: false,
		selectedUser: null, // { name, phone, openid, email }
		searching: false,
	},

	onLoad: async function (options) {
		let ok = await MgrBiz.isMgr(this, 'admin:manage');
		if (!ok) return;

		await this._loadRoles();

		if (options.id) {
			this.setData({ isEdit: true, adminId: options.id });
			await this._loadAdmin(options.id);
		}
	},

	async _loadRoles() {
		try {
			let roles = await cloudHelper.callCloudData('mgr/role_list', {});
			if (roles && Array.isArray(roles)) {
				this.setData({ roleList: roles });
			}
		} catch (e) {
			console.log('加载角色失败', e);
		}
	},

	async _loadAdmin(id) {
		try {
			let res = await cloudHelper.callCloudData('mgr/admin_list', {
				search: '',
				page: 1,
				size: 100,
				isTotal: false,
				oldTotal: 0,
			});
			if (res && res.list) {
				let admin = res.list.find(a => a._id === id);
				if (admin) {
					let roleIndex = this.data.roleList.findIndex(r => r._id === admin.ADMIN_ROLE_ID);
					let selectedUser = null;
					if (admin.ADMIN_OPENID) {
						selectedUser = {
							name: '',
							phone: '',
							openid: admin.ADMIN_OPENID,
						};
					}
					this.setData({
						name: admin.ADMIN_NAME,
						openid: admin.ADMIN_OPENID || '',
						status: admin.ADMIN_STATUS,
						roleId: admin.ADMIN_ROLE_ID,
						roleIndex: roleIndex >= 0 ? roleIndex : 0,
						selectedUser,
					});
				}
			}
		} catch (e) {
			console.log('加载管理员详情失败', e);
		}
	},

	bindNameInput: function (e) {
		this.setData({ name: e.detail.value });
	},

	bindRoleChange: function (e) {
		let idx = e.detail.value;
		let role = this.data.roleList[idx];
		this.setData({
			roleIndex: idx,
			roleId: role ? role._id : '',
		});
	},

	bindStatusChange: function (e) {
		this.setData({
			status: e.detail.value ? 1 : 0
		});
	},

	// ==================== 用户搜索 ====================

	bindUserKeywordInput: function (e) {
		this.setData({ userKeyword: e.detail.value });
	},

	bindSearchUser: async function () {
		let keyword = this.data.userKeyword.trim();
		if (!keyword) return;

		this.setData({ searching: true, showUserResults: true, userResults: [] });

		try {
			let results = await cloudHelper.callCloudData('mgr/user_search', { keyword });
			this.setData({
				userResults: results || [],
				searching: false,
			});
		} catch (e) {
			this.setData({ searching: false });
		}
	},

	bindSelectUser: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let user = this.data.userResults[idx];
		if (!user) return;

		this.setData({
			selectedUser: user,
			openid: user.openid,
			name: this.data.name || user.name, // 如果姓名为空则用用户的名字
			showUserResults: false,
			userKeyword: '',
		});
	},

	bindClearUser: function () {
		this.setData({
			selectedUser: null,
			openid: '',
		});
	},

	bindCloseResults: function () {
		this.setData({ showUserResults: false });
	},

	// ==================== 保存 ====================

	bindSave: async function () {
		let { name, roleId, openid, status, isEdit, adminId, selectedUser } = this.data;

		if (!name.trim()) {
			return pageHelper.showModal('请填写管理员姓名');
		}
		if (!roleId) {
			return pageHelper.showModal('请选择角色');
		}
		if (!isEdit && !selectedUser) {
			return pageHelper.showModal('请搜索并选择一个用户绑定');
		}

		try {
			if (isEdit) {
				await cloudHelper.callCloudSumbit('mgr/admin_edit', {
					id: adminId,
					name: name.trim(),
					roleId,
					openid: openid.trim(),
					status,
				});
			} else {
				await cloudHelper.callCloudSumbit('mgr/admin_add', {
					name: name.trim(),
					roleId,
					openid: openid.trim(),
				});
			}

			pageHelper.showSuccToast(isEdit ? '修改成功' : '添加成功');
			setTimeout(() => { wx.navigateBack(); }, 1500);
		} catch (e) {
			// cloudHelper 已处理错误提示
		}
	}
});
