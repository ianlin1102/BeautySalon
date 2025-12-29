/**
 * Notes: 后台管理控制模块
 * Date: 2025-03-15 19:20:00 
 */

const BaseController = require('../base_controller.js');
const BaseAdminService = require('../../service/admin/base_admin_service.js');

const timeUtil = require('../../../framework/utils/time_util.js');

class AdminController extends BaseController {

	constructor(route, openId, event) {
		super(route, openId, event);

		// 当前时间戳
		this._timestamp = timeUtil.time();

		this._admin = null;
		this._adminId = '0';

	}

	/** 是否管理员  */
	async isAdmin() {
		// 判断是否管理员
		let service = new BaseAdminService();

		// HTTP 请求使用 JWT 认证，直接从 event._httpAdmin 获取管理员信息
		if (this._event._isHttpRequest && this._event._httpAdmin) {
			this._admin = {
				ADMIN_ID: this._event._httpAdmin.adminId,
				ADMIN_NAME: this._event._httpAdmin.adminName,
				ADMIN_TYPE: this._event._httpAdmin.adminType,
				ADMIN_STATUS: 1
			};
			this._adminId = this._admin.ADMIN_ID;
			return;
		}

		// 小程序请求使用 token 验证
		let admin = await service.isAdmin(this._token);
		this._admin = admin;
		this._adminId = admin.ADMIN_ID;
	}

	/** 是否超级管理员  */
	async isSuperAdmin() {
		// 判断是否管理员
		let service = new BaseAdminService();

		// HTTP 请求使用 JWT 认证，直接从 event._httpAdmin 获取管理员信息
		if (this._event._isHttpRequest && this._event._httpAdmin) {
			// 检查是否为超级管理员（type === 1）
			if (this._event._httpAdmin.adminType !== 1) {
				this.AppError('仅超级管理员可操作');
			}
			this._admin = {
				ADMIN_ID: this._event._httpAdmin.adminId,
				ADMIN_NAME: this._event._httpAdmin.adminName,
				ADMIN_TYPE: this._event._httpAdmin.adminType,
				ADMIN_STATUS: 1
			};
			this._adminId = this._admin.ADMIN_ID;
			return;
		}

		// 小程序请求使用 token 验证
		let admin = await service.isSuperAdmin(this._token);
		this._admin = admin;
		this._adminId = admin.ADMIN_ID;
	}

	/** 记录日志 */
	async log(content, type) {
		let service = new BaseAdminService();
		await service.insertLog(content, this._admin, type);
	}

	/**日志除前获取名称 */
	async getNameBeforeLog(type, oid) {
		let service = new BaseAdminService();
		return await service.getNameBeforeLog(type, oid);
	}

}

module.exports = AdminController;