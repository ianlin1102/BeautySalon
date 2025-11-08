/**
 * Notes: 关于我们实体
 * Date: 2025-11-06
 */

const BaseModel = require('./base_model.js');

class AboutModel extends BaseModel {

}

// 集合名
AboutModel.CL = "ax_about";

AboutModel.DB_STRUCTURE = {
	_pid: 'string|true',
	ABOUT_ID: 'string|true',
	ABOUT_ADMIN_ID: 'string|true',

	ABOUT_TITLE: 'string|false|comment=标题',
	ABOUT_CONTENT: 'array|true|default=[]|comment=富文本内容',
	ABOUT_PIC: 'array|false|default=[]|comment=图片',

	ABOUT_ADD_TIME: 'int|true',
	ABOUT_EDIT_TIME: 'int|true',
	ABOUT_ADD_IP: 'string|false',
	ABOUT_EDIT_IP: 'string|false',
};

// 字段前缀
AboutModel.FIELD_PREFIX = "ABOUT_";

module.exports = AboutModel;
