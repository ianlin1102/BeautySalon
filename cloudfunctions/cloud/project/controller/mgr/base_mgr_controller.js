/**
 * Notes: MGR管理后台基础控制器
 * Date: 2026-02-11
 */

const BaseController = require('../base_controller.js');
const MgrAdminModel = require('../../model/mgr_admin_model.js');
const MgrRoleModel = require('../../model/mgr_role_model.js');
const BaseAdminService = require('../../service/admin/base_admin_service.js');
const config = require('../../../config/config.js');
const AppError = require('../../../framework/core/app_error.js');

class BaseMgrController extends BaseController {

	constructor(route, openId, event) {
		super(route, openId, event);

		this._mgrAdmin = null;
		this._mgrAdminId = '';
		this._adminPermissions = [];
	}

	async initSetup() {
		await super.initSetup();

		// 通过 OpenID 查找管理员身份
		let admin = await MgrAdminModel.getOne({
			ADMIN_OPENID: this._openId,
			ADMIN_STATUS: MgrAdminModel.STATUS.ENABLED
		});

		if (admin) {
			this._mgrAdmin = admin;
			this._mgrAdminId = admin._id;

			// 加载角色权限
			let role = await MgrRoleModel.getOne(admin.ADMIN_ROLE_ID);
			this._adminPermissions = (role && role.ROLE_PERMISSIONS) || [];
			return;
		}

		// Bootstrap 检查
		if (config.BOOTSTRAP_SUPER_OPENID && config.BOOTSTRAP_SUPER_OPENID === this._openId) {
			this._mgrAdmin = { ADMIN_NAME: 'Bootstrap Admin', _id: 'bootstrap' };
			this._mgrAdminId = 'bootstrap';
			this._adminPermissions = ['*'];
			return;
		}

		throw new AppError('无管理权限', 2401);
	}

	_checkPermission(flag) {
		if (this._adminPermissions.includes('*')) return;
		if (!this._adminPermissions.includes(flag)) {
			throw new AppError('无操作权限', 403);
		}
	}

	/** 记录操作日志 */
	async log(content, type) {
		let service = new BaseAdminService();
		await service.insertLog(content, {
			ADMIN_ID: this._mgrAdminId,
			ADMIN_NAME: this._mgrAdmin.ADMIN_NAME,
		}, type);
	}

	// 实时验证超级管理员（用于敏感操作的二次检查）
	async _verifySuperAdmin() {
		// Bootstrap 管理员直接通过
		if (config.BOOTSTRAP_SUPER_OPENID && config.BOOTSTRAP_SUPER_OPENID === this._openId) {
			return;
		}

		const admin = await MgrAdminModel.getOne({
			ADMIN_OPENID: this._openId,
			ADMIN_STATUS: MgrAdminModel.STATUS.ENABLED
		});
		if (!admin) throw new AppError('账户已失效', 401);

		const role = await MgrRoleModel.getOne(admin.ADMIN_ROLE_ID);
		if (!role || !role.ROLE_PERMISSIONS.includes('*')) {
			throw new AppError('需要超级管理员权限', 403);
		}
	}
}

module.exports = BaseMgrController;
