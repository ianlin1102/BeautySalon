/**
 * Notes: MGR管理员与角色管理控制器
 * Date: 2026-02-11
 */

const BaseMgrController = require('./base_mgr_controller.js');
const MgrAdminService = require('../../service/mgr/mgr_admin_service.js');
const LogModel = require('../../model/log_model.js');
const config = require('../../../config/config.js');

class MgrAdminController extends BaseMgrController {

	/** 搜索用户（用于绑定管理员） */
	async searchUser() {
		this._checkPermission('admin:manage');

		let rules = {
			keyword: 'required|string|min:1|max:50|name=搜索关键词',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		return await service.searchUserList(input.keyword);
	}

	/** 获取管理员列表 */
	async getAdminList() {
		this._checkPermission('admin:manage');
		await this._verifySuperAdmin();

		let rules = {
			search: 'string|name=搜索',
			page: 'required|int|name=页码',
			size: 'int|name=每页条数',
			isTotal: 'bool|name=是否统计总数',
			oldTotal: 'int|name=旧总数',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		return await service.getAdminList(input);
	}

	/** 新增管理员 */
	async addAdmin() {
		this._checkPermission('admin:manage');
		await this._verifySuperAdmin();

		let rules = {
			name: 'required|string|min:1|max:30|name=姓名',
			roleId: 'required|string|name=角色ID',
			openid: 'string|name=OpenID',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		let result = await service.addAdmin(input);
		this.log('新增了管理员「' + input.name + '」', LogModel.TYPE.SYS);
		return result;
	}

	/** 编辑管理员 */
	async editAdmin() {
		this._checkPermission('admin:manage');
		await this._verifySuperAdmin();

		let rules = {
			id: 'required|string|name=管理员ID',
			name: 'string|min:1|max:30|name=姓名',
			roleId: 'string|name=角色ID',
			openid: 'string|name=OpenID',
			status: 'int|name=状态',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		let result = await service.editAdmin(input);
		let desc = '修改了管理员「' + (input.name || input.id) + '」';
		if (input.status === 0) desc = '禁用了管理员「' + (input.name || input.id) + '」';
		if (input.status === 1) desc = '启用了管理员「' + (input.name || input.id) + '」';
		this.log(desc, LogModel.TYPE.SYS);
		return result;
	}

	/** 获取角色列表 */
	async getRoleList() {
		this._checkPermission('admin:manage');

		let service = new MgrAdminService();
		return await service.getRoleList();
	}

	/** 新增角色 */
	async addRole() {
		this._checkPermission('admin:manage');
		await this._verifySuperAdmin();

		let rules = {
			name: 'required|string|min:1|max:30|name=角色名称',
			permissions: 'array|name=权限列表',
			sort: 'int|name=排序',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		let result = await service.addRole(input);
		this.log('新增了角色「' + input.name + '」', LogModel.TYPE.SYS);
		return result;
	}

	/** 编辑角色 */
	async editRole() {
		this._checkPermission('admin:manage');
		await this._verifySuperAdmin();

		let rules = {
			id: 'required|string|name=角色ID',
			name: 'string|min:1|max:30|name=角色名称',
			permissions: 'array|name=权限列表',
			sort: 'int|name=排序',
			status: 'int|name=状态',
		};
		let input = this.validateData(rules);

		let service = new MgrAdminService();
		let result = await service.editRole(input);
		this.log('修改了角色「' + (input.name || input.id) + '」', LogModel.TYPE.SYS);
		return result;
	}
}

module.exports = MgrAdminController;
