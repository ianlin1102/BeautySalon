/**
 * Notes: MGR基本信息控制器
 * Date: 2026-02-11
 */

const BaseMgrController = require('./base_mgr_controller.js');
const AdminModel = require('../../model/admin_model.js');
const MgrAdminModel = require('../../model/mgr_admin_model.js');
const LogModel = require('../../model/log_model.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');

class MgrController extends BaseMgrController {

	/** 获取当前管理员信息及权限 */
	async getMyInfo() {
		// initSetup 已验证管理员身份
		return {
			admin: {
				id: this._mgrAdminId,
				name: this._mgrAdmin.ADMIN_NAME,
			},
			permissions: this._adminPermissions
		};
	}

	/** 桥接旧 admin 系统：为 MGR 管理员生成旧 admin token */
	async bridgeAdminToken() {
		// 每个 MGR 管理员对应独立的 ax_admin 记录（用 OpenID 区分）
		let bridgePhone = 'mgr-' + this._openId;
		let admin = await AdminModel.getOne({ ADMIN_PHONE: bridgePhone, ADMIN_STATUS: 1 });

		if (!admin) {
			let id = await AdminModel.insert({
				ADMIN_NAME: this._mgrAdmin.ADMIN_NAME,
				ADMIN_PHONE: bridgePhone,
				ADMIN_TYPE: this._adminPermissions.includes('*') ? 1 : 0,
				ADMIN_STATUS: 1,
			});
			admin = await AdminModel.getOne(id);
		}

		// 同步名称和权限，生成新 token
		let token = dataUtil.genRandomString(32);
		let tokenTime = timeUtil.time();

		await AdminModel.edit(admin._id, {
			ADMIN_NAME: this._mgrAdmin.ADMIN_NAME,
			ADMIN_TYPE: this._adminPermissions.includes('*') ? 1 : 0,
			ADMIN_TOKEN: token,
			ADMIN_TOKEN_TIME: tokenTime,
		});

		// 更新 MGR 管理员登录次数和时间
		let loginCnt = 0;
		let lastLogin = '';
		if (this._mgrAdminId && this._mgrAdminId !== 'bootstrap') {
			let mgrAdmin = await MgrAdminModel.getOne(this._mgrAdminId);
			if (mgrAdmin) {
				loginCnt = (mgrAdmin.ADMIN_LOGIN_CNT || 0) + 1;
				if (mgrAdmin.ADMIN_LOGIN_TIME) {
					lastLogin = timeUtil.timestamp2Time(mgrAdmin.ADMIN_LOGIN_TIME, 'Y-M-D h:m');
				}
				await MgrAdminModel.edit(this._mgrAdminId, {
					ADMIN_LOGIN_CNT: loginCnt,
					ADMIN_LOGIN_TIME: timeUtil.time(),
				});
			}
		}

		// 记录登录日志
		this.log(this._mgrAdmin.ADMIN_NAME + ' 登录了管理后台', LogModel.TYPE.SYS);

		return {
			token,
			name: this._mgrAdmin.ADMIN_NAME,
			type: this._adminPermissions.includes('*') ? 1 : 0,
			last: lastLogin,
			cnt: loginCnt,
		};
	}
}

module.exports = MgrController;
