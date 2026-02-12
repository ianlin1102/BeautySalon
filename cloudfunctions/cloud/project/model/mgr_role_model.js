/**
 * Notes: MGR角色实体
 * Date: 2026-02-11
 */

const BaseModel = require('./base_model.js');

class MgrRoleModel extends BaseModel {

}

// 集合名
MgrRoleModel.CL = "ax_mgr_role";

MgrRoleModel.DB_STRUCTURE = {
	_pid: 'string|true',
	ROLE_ID: 'string|true',

	ROLE_NAME: 'string|true|comment=角色名称',
	ROLE_PERMISSIONS: 'array|true|default=[]|comment=权限标识数组',
	ROLE_SORT: 'int|true|default=10|comment=排序',
	ROLE_STATUS: 'int|true|default=1|comment=状态 0=禁用 1=启用',

	ROLE_ADD_TIME: 'int|true',
	ROLE_EDIT_TIME: 'int|true',
	ROLE_ADD_IP: 'string|false',
	ROLE_EDIT_IP: 'string|false',
};

// 字段前缀
MgrRoleModel.FIELD_PREFIX = "ROLE_";

MgrRoleModel.STATUS = {
	DISABLED: 0,
	ENABLED: 1
};

module.exports = MgrRoleModel;
