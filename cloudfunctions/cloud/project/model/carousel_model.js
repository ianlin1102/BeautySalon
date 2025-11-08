/**
 * Notes: 轮播图实体
 * Date: 2025-11-06
 */

const BaseModel = require('./base_model.js');

class CarouselModel extends BaseModel {

}

// 集合名
CarouselModel.CL = "ax_carousel";

CarouselModel.DB_STRUCTURE = {
	_pid: 'string|true',
	CAROUSEL_ID: 'string|true',
	CAROUSEL_ADMIN_ID: 'string|true',

	CAROUSEL_PIC: 'string|true|comment=轮播图片URL',
	CAROUSEL_URL: 'string|false|comment=点击跳转链接',
	CAROUSEL_ORDER: 'int|true|default=9999|comment=排序号',
	CAROUSEL_STATUS: 'int|true|default=1|comment=状态 0=禁用 1=启用',

	CAROUSEL_ADD_TIME: 'int|true',
	CAROUSEL_EDIT_TIME: 'int|true',
	CAROUSEL_ADD_IP: 'string|false',
	CAROUSEL_EDIT_IP: 'string|false',
};

// 字段前缀
CarouselModel.FIELD_PREFIX = "CAROUSEL_";

// 状态常量
CarouselModel.STATUS = {
	DISABLED: 0,   // 禁用
	ENABLED: 1     // 启用
};

module.exports = CarouselModel;
