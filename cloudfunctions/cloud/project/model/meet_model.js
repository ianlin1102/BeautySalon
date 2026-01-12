/**
 * Notes: 预约实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-12-07 19:20:00
 * Version : CCMiniCloud Framework Ver 2.0.1 ALL RIGHTS RESERVED BY 明章科技
 */


const BaseModel = require('./base_model.js');

class MeetModel extends BaseModel {

}

// 集合名
MeetModel.CL = "ax_meet";

MeetModel.DB_STRUCTURE = {
	_pid: 'string|true',
	MEET_ID: 'string|true',
	MEET_ADMIN_ID: 'string|true|comment=添加的管理员',
	MEET_TITLE: 'string|true|comment=标题',

	MEET_CONTENT: 'array|true|default=[]|comment=详细介绍',
	/* img=cloudID, text=文本
	[{type:'text/img',val:''}]
	*/

	// MEET_DAYS_SET: //**** 映射到day表
	MEET_DAYS: 'array|true|default=[]|comment=最近一次修改保存的可用日期',
  
	MEET_TYPE_ID: 'string|true|comment=分类编号',
	MEET_TYPE_NAME: 'string|true|comment=分类冗余',

	MEET_INSTRUCTOR_ID: 'string|true|comment=导师ID',
	MEET_INSTRUCTOR_NAME: 'string|true|comment=导师姓名(冗余)',
	MEET_INSTRUCTOR_PIC: 'string|false|comment=导师头像(冗余)',

	MEET_COURSE_INFO: 'string|false|comment=课程信息',

	MEET_IS_SHOW_LIMIT: 'int|true|default=1|comment=是否显示可预约人数',

	MEET_STYLE_SET: 'object|true|default={}|comment=样式设置',
	/*{ 
		desc: 'string|false|comment=简介',
		pic:' string|false|default=[]|comment=封面图cloudId]'
	}
	*/

	MEET_FORM_SET: 'array|true|default=[]|comment=表单字段设置',

	MEET_CANCEL_SET: 'object|true|default={}|comment=取消限制设置',
	/* {
		isLimit: false,  // 是否限制取消
		days: 0,         // 天数 (0-7, 如果为-1表示不能取消)
		hours: 0,        // 小时 (0-23)
		minutes: 0       // 分钟 (0, 15, 30, 45)
	}
	*/

	MEET_COST_SET: 'object|true|default={}|comment=消费设置',
	/* {
		isEnabled: false,      // 是否启用付费
		costType: 'free',      // 'free'=免费, 'times'=次数卡, 'balance'=储值卡, 'both'=两者皆可
		timesCost: 0,          // 需要消耗的次数（当costType为times或both时）
		balanceCost: 0,        // 需要消耗的金额（当costType为balance或both时）
		allowAutoSelect: true  // 是否允许系统自动选择合适的卡
	}
	*/

	MEET_STATUS: 'int|true|default=1|comment=状态 0=未启用,1=使用中,9=停止预约,10=已关闭',
	MEET_ORDER: 'int|true|default=9999',

	MEET_ADD_TIME: 'int|true',
	MEET_EDIT_TIME: 'int|true',
	MEET_ADD_IP: 'string|false',
	MEET_EDIT_IP: 'string|false',
};

// 字段前缀
MeetModel.FIELD_PREFIX = "MEET_";

/**
 * 状态 0=未启用,1=使用中,9=停止预约,10=已关闭 
 */
MeetModel.STATUS = {
	UNUSE: 0,
	COMM: 1,
	OVER: 9,
	CLOSE: 10
};

MeetModel.STATUS_DESC = {
	UNUSE: '未启用',
	COMM: '使用中',
	OVER: '停止预约(可见)',
	CLOSE: '已关闭(不可见)'
};



module.exports = MeetModel;