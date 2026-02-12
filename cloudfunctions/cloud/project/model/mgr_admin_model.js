/**
 * Notes: MGR管理员实体
 * Date: 2026-02-11
 */

const BaseModel = require('./base_model.js');

class MgrAdminModel extends BaseModel {

}

// 集合名
MgrAdminModel.CL = "ax_mgr_admin";

MgrAdminModel.DB_STRUCTURE = {
	_pid: 'string|true',
	ADMIN_ID: 'string|true',

	ADMIN_NAME: 'string|true|comment=管理员姓名',
	ADMIN_ROLE_ID: 'string|true|comment=关联角色ID',
	ADMIN_OPENID: 'string|false|comment=绑定微信OpenID',
	ADMIN_STATUS: 'int|true|default=1|comment=状态 0=禁用 1=启用',

	ADMIN_LOGIN_CNT: 'int|true|default=0|comment=登录次数',
	ADMIN_LOGIN_TIME: 'int|true|default=0|comment=最后登录时间',

	ADMIN_ADD_TIME: 'int|true',
	ADMIN_EDIT_TIME: 'int|true',
	ADMIN_ADD_IP: 'string|false',
	ADMIN_EDIT_IP: 'string|false',
};

// 字段前缀
MgrAdminModel.FIELD_PREFIX = "ADMIN_";

MgrAdminModel.STATUS = {
	DISABLED: 0,
	ENABLED: 1
};

module.exports = MgrAdminModel;
