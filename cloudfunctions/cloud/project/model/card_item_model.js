/**
 * Notes: 卡项商品实体
 * Date: 2025-10-26
 */

const BaseModel = require('./base_model.js');

class CardItemModel extends BaseModel {

}

// 集合名
CardItemModel.CL = "ax_card_item";

CardItemModel.DB_STRUCTURE = {
	_pid: 'string|true',
	CARD_ID: 'string|true',
	CARD_ADMIN_ID: 'string|true',

	CARD_TYPE: 'int|true|default=1|comment=卡项类型 1=次数卡，2=余额卡',
	CARD_NAME: 'string|false|comment=卡项名称',
	CARD_DESC: 'string|false|comment=卡项描述',
	CARD_PRICE: 'float|true|default=0|comment=售价',

	// 次数卡专属字段
	CARD_TIMES: 'int|false|default=0|comment=包含次数（仅次数卡）',

	// 余额卡专属字段
	CARD_AMOUNT: 'float|false|default=0|comment=充值金额（仅余额卡）',

	// 有效期设置（天数，0表示永久有效）
	CARD_VALIDITY_DAYS: 'int|true|default=365|comment=有效期天数，0=永久有效',

	CARD_STATUS: 'int|true|default=1|comment=状态 0=下架 1=上架',
	CARD_ORDER: 'int|true|default=9999',
	CARD_HOME: 'int|true|default=9999|comment=推荐到首页',

	CARD_CONTENT: 'array|true|default=[]|comment=富文本详情内容',
	CARD_PIC: 'array|false|default=[]|comment=卡项图片',

	// 支付信息
	CARD_PAYMENT_ZELLE: 'string|false|comment=Zelle账号',
	CARD_PAYMENT_QR: 'string|false|comment=支付二维码图片',
	CARD_PAYMENT_INSTRUCTIONS: 'string|false|comment=支付说明',

	CARD_VIEW_CNT: 'int|true|default=0|comment=浏览次数',

	CARD_ADD_TIME: 'int|true',
	CARD_EDIT_TIME: 'int|true',
	CARD_ADD_IP: 'string|false',
	CARD_EDIT_IP: 'string|false',
};

// 字段前缀
CardItemModel.FIELD_PREFIX = "CARD_";

// 卡项类型常量
CardItemModel.TYPE = {
	TIMES: 1,     // 次数卡
	BALANCE: 2    // 余额卡
};

// 卡项状态常量
CardItemModel.STATUS = {
	OFFLINE: 0,   // 下架
	ONLINE: 1     // 上架
};

module.exports = CardItemModel;
