/**
 * Notes: 导师团队实体
 * Date: 2025-11-06
 */

const BaseModel = require('./base_model.js');

class InstructorModel extends BaseModel {

}

// 集合名
InstructorModel.CL = "ax_instructor";

InstructorModel.DB_STRUCTURE = {
	_pid: 'string|true',
	INSTRUCTOR_ID: 'string|true',
	INSTRUCTOR_ADMIN_ID: 'string|true',

	INSTRUCTOR_NAME: 'string|true|comment=导师姓名',
	INSTRUCTOR_PIC: 'string|true|comment=导师头像URL',
	INSTRUCTOR_DESC: 'string|false|comment=简介',
	INSTRUCTOR_ORDER: 'int|true|default=9999|comment=排序号',
	INSTRUCTOR_STATUS: 'int|true|default=1|comment=状态 0=禁用 1=启用',

	INSTRUCTOR_ADD_TIME: 'int|true',
	INSTRUCTOR_EDIT_TIME: 'int|true',
	INSTRUCTOR_ADD_IP: 'string|false',
	INSTRUCTOR_EDIT_IP: 'string|false',
};

// 字段前缀
InstructorModel.FIELD_PREFIX = "INSTRUCTOR_";

// 状态常量
InstructorModel.STATUS = {
	DISABLED: 0,   // 禁用
	ENABLED: 1     // 启用
};

module.exports = InstructorModel;
