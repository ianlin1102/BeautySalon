/**
 * Notes: 系统设置实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-11-05 19:20:00
 * Version : CCMiniCloud Framework Ver 2.0.1 ALL RIGHTS RESERVED BY 明章科技
 */


const BaseAlumniModel = require('./base_model.js');

class SetupModel extends BaseAlumniModel {

}

// 集合名
SetupModel.CL = "ax_setup";

SetupModel.DB_STRUCTURE = {
	_pid: 'string|true',
	SETUP_ID: 'string|true',

	SETUP_NAME: 'string|false', 

	SETUP_ABOUT: 'string|false|comment=关于我们',
	SETUP_ABOUT_PIC: 'array|false|default=[]|comment=关于我们的图片cloudId',

	SETUP_SERVICE_PIC: 'array|false|default=[]|comment=客服图片cloudId',
	SETUP_OFFICE_PIC: 'array|false|default=[]|comment=官微图片cloudId',

	SETUP_ADDRESS: 'string|false|comment=地址',
	SETUP_PHONE: 'string|false|comment=电话', 

	SETUP_ADD_TIME: 'int|true',
	SETUP_EDIT_TIME: 'int|true',
	SETUP_ADD_IP: 'string|false',
	SETUP_EDIT_IP: 'string|false',

	// 条款相关字段
	SETUP_USER_TERMS_SECTIONS: 'array|false|default=[]|comment=用户条款内容',
	SETUP_USER_TERMS_VERSION: 'int|false|default=0|comment=用户条款版本号',
	SETUP_USER_TERMS_UPDATE_TIME: 'int|false|comment=用户条款更新时间',
	SETUP_CARD_TERMS_SECTIONS: 'array|false|default=[]|comment=卡项条款内容',
	SETUP_CARD_TERMS_UPDATE_TIME: 'int|false|comment=卡项条款更新时间',
	SETUP_BOOKING_TERMS_SECTIONS: 'array|false|default=[]|comment=预约条款内容',
	SETUP_BOOKING_TERMS_UPDATE_TIME: 'int|false|comment=预约条款更新时间',

	// Logo
	SETUP_COMPANY_LOGO: 'string|false|default=|comment=公司Logo云存储URL',
};

// 字段前缀
SetupModel.FIELD_PREFIX = "SETUP_";



module.exports = SetupModel;