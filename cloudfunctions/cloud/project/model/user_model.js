/**
 * Notes: 用户实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-10-14 19:20:00 
 */


const BaseModel = require('./base_model.js');
class UserModel extends BaseModel {}

// 集合名
UserModel.CL = "ax_user";

UserModel.DB_STRUCTURE = {
	_pid: 'string|true',
	USER_ID: 'string|true',

	USER_MINI_OPENID: 'string|false|comment=小程序openid',
	USER_STATUS: 'int|true|default=1|comment=状态 0=待审核,1=正常',

	USER_ACCOUNT: 'string|false|comment=用户账号',
	USER_PASSWORD: 'string|false|comment=用户密码',
	USER_PASSWORD_HASH: 'string|false|comment=密码哈希(PBKDF2)',
	USER_TOKEN: 'string|false|comment=登录token',
	USER_TOKEN_TIME: 'int|false|comment=token生成时间',

	USER_NAME: 'string|false|comment=用户姓名',
	USER_MOBILE: 'string|false|comment=联系电话',
	USER_AVATAR: 'string|false|comment=用户头像',

	USER_WORK: 'string|false|comment=所在单位',
	USER_CITY: 'string|false|comment=所在城市',
	USER_TRADE: 'string|false|comment=职业领域',


	USER_LOGIN_CNT: 'int|true|default=0|comment=登陆次数',
	USER_LOGIN_TIME: 'int|false|comment=最近登录时间',


	USER_ADD_TIME: 'int|true',
	USER_ADD_IP: 'string|false',

	USER_EDIT_TIME: 'int|true',
	USER_EDIT_IP: 'string|false',

	USER_SOURCE: 'string|false|comment=用户来源(wechat/web/google)',
	USER_GOOGLE_ID: 'string|false|comment=Google账户ID',
	USER_GOOGLE_EMAIL: 'string|false|comment=Google邮箱',
	USER_GOOGLE_LINKED_AT: 'int|false|comment=Google关联时间',
	USER_AUTH_METHODS: 'array|false|comment=认证方式[password,google,wechat]',
	USER_CREATED_VIA: 'string|false|comment=注册来源(register/google/wechat)',
	USER_LAST_LOGIN: 'int|false|comment=最后登录时间',
}

// 字段前缀
UserModel.FIELD_PREFIX = "USER_";

/**
 * 状态 0=待审核,1=正常 
 */
UserModel.STATUS = {
	UNUSE: 0,
	COMM: 1
};

UserModel.STATUS_DESC = {
	UNUSE: '待审核',
	COMM: '正常'
};


module.exports = UserModel;