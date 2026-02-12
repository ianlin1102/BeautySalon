/**
 * Notes: MGR管理员与角色服务
 * Date: 2026-02-11
 */

const BaseService = require('../base_service.js');
const MgrAdminModel = require('../../model/mgr_admin_model.js');
const MgrRoleModel = require('../../model/mgr_role_model.js');
const UserModel = require('../../model/user_model.js');
const timeUtil = require('../../../framework/utils/time_util.js');

class MgrAdminService extends BaseService {

	// ==================== 用户搜索 ====================

	/** 搜索用户（用于绑定管理员 OpenID） */
	async searchUserList(keyword) {
		const fields = 'USER_NAME,USER_MOBILE,USER_MINI_OPENID,USER_ACCOUNT,USER_GOOGLE_EMAIL,USER_SOURCE,USER_AVATAR';

		let where = {
			or: [
				{ USER_NAME: ['like', keyword] },
				{ USER_MOBILE: ['like', keyword] },
				{ USER_ACCOUNT: ['like', keyword] },
				{ USER_GOOGLE_EMAIL: ['like', keyword] },
				{ USER_MINI_OPENID: keyword },
			]
		};

		let list = await UserModel.getAll(where, fields, { USER_ADD_TIME: 'desc' }, 20);

		// 只返回有 OpenID 的用户（能登录小程序的用户才能做管理员）
		return list.filter(u => u.USER_MINI_OPENID).map(u => ({
			name: u.USER_NAME || u.USER_ACCOUNT || '',
			phone: u.USER_MOBILE || '',
			openid: u.USER_MINI_OPENID,
			email: u.USER_GOOGLE_EMAIL || '',
			avatar: u.USER_AVATAR || '',
			source: u.USER_SOURCE || '',
		}));
	}

	// ==================== 管理员 CRUD ====================

	/** 获取管理员列表（分页） */
	async getAdminList({ search, page, size, isTotal, oldTotal }) {
		let where = {};

		if (search) {
			where.ADMIN_NAME = ['like', search];
		}

		let orderBy = { ADMIN_ADD_TIME: 'desc' };
		let fields = 'ADMIN_NAME,ADMIN_ROLE_ID,ADMIN_OPENID,ADMIN_STATUS,ADMIN_LOGIN_CNT,ADMIN_LOGIN_TIME,ADMIN_ADD_TIME';

		let result = await MgrAdminModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

		// 关联角色名称
		if (result && result.list) {
			let roleIds = [...new Set(result.list.map(a => a.ADMIN_ROLE_ID).filter(Boolean))];
			let roleMap = {};
			for (let roleId of roleIds) {
				let role = await MgrRoleModel.getOne(roleId, 'ROLE_NAME');
				if (role) roleMap[roleId] = role.ROLE_NAME;
			}
			for (let admin of result.list) {
				admin.roleName = roleMap[admin.ADMIN_ROLE_ID] || '未知角色';
				admin.loginTimeStr = admin.ADMIN_LOGIN_TIME ? timeUtil.timestamp2Time(admin.ADMIN_LOGIN_TIME) : '从未登录';
			}
		}

		return result;
	}

	/** 新增管理员 */
	async addAdmin({ name, roleId, openid }) {
		// 检查 OpenID 是否已被绑定
		if (openid) {
			let existing = await MgrAdminModel.getOne({ ADMIN_OPENID: openid });
			if (existing) {
				this.AppError('该 OpenID 已绑定其他管理员');
			}
		}

		// 检查角色是否存在
		let role = await MgrRoleModel.getOne(roleId);
		if (!role) this.AppError('角色不存在');

		let data = {
			ADMIN_NAME: name,
			ADMIN_ROLE_ID: roleId,
			ADMIN_OPENID: openid || '',
			ADMIN_STATUS: MgrAdminModel.STATUS.ENABLED,
		};

		let id = await MgrAdminModel.insert(data);
		return { id };
	}

	/** 编辑管理员 */
	async editAdmin({ id, name, roleId, openid, status }) {
		let admin = await MgrAdminModel.getOne(id);
		if (!admin) this.AppError('管理员不存在');

		let data = {};
		if (name !== undefined) data.ADMIN_NAME = name;
		if (roleId !== undefined) {
			let role = await MgrRoleModel.getOne(roleId);
			if (!role) this.AppError('角色不存在');
			data.ADMIN_ROLE_ID = roleId;
		}
		if (openid !== undefined) {
			// 检查 OpenID 是否被其他管理员使用
			if (openid) {
				let existing = await MgrAdminModel.getOne({ ADMIN_OPENID: openid });
				if (existing && existing._id !== id) {
					this.AppError('该 OpenID 已绑定其他管理员');
				}
			}
			data.ADMIN_OPENID = openid;
		}
		if (status !== undefined) data.ADMIN_STATUS = status;

		await MgrAdminModel.edit(id, data);
	}

	// ==================== 角色 CRUD ====================

	/** 获取角色列表 */
	async getRoleList() {
		let where = {};
		let orderBy = { ROLE_SORT: 'asc', ROLE_ADD_TIME: 'desc' };
		let fields = 'ROLE_NAME,ROLE_PERMISSIONS,ROLE_SORT,ROLE_STATUS,ROLE_ADD_TIME';

		let list = await MgrRoleModel.getAll(where, fields, orderBy, 100);

		// 统计每个角色的管理员数量
		for (let role of list) {
			role.adminCount = await MgrAdminModel.count({ ADMIN_ROLE_ID: role._id, ADMIN_STATUS: 1 });
		}

		return list;
	}

	/** 新增角色 */
	async addRole({ name, permissions, sort }) {
		let data = {
			ROLE_NAME: name,
			ROLE_PERMISSIONS: permissions || [],
			ROLE_SORT: sort || 10,
			ROLE_STATUS: MgrRoleModel.STATUS.ENABLED,
		};

		let id = await MgrRoleModel.insert(data);
		return { id };
	}

	/** 编辑角色 */
	async editRole({ id, name, permissions, sort, status }) {
		let role = await MgrRoleModel.getOne(id);
		if (!role) this.AppError('角色不存在');

		let data = {};
		if (name !== undefined) data.ROLE_NAME = name;
		if (permissions !== undefined) data.ROLE_PERMISSIONS = permissions;
		if (sort !== undefined) data.ROLE_SORT = sort;
		if (status !== undefined) data.ROLE_STATUS = status;

		await MgrRoleModel.edit(id, data);
	}

}

module.exports = MgrAdminService;
