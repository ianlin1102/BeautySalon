/**
 * Notes: 卡项后台管理模块业务逻辑
 * Date: 2025-10-26
 */

const cloudHelper = require('../helper/cloud_helper.js');
const dataHelper = require('../helper/data_helper.js');
const pageHelper = require('../helper/page_helper.js');
const setting = require('../setting/setting.js');

class AdminCardBiz {

	// 提取简介
	static getDesc(desc, content) {
		if (desc) return dataHelper.fmtText(desc, 100);
		if (!Array.isArray(content)) return desc;

		for (let k in content) {
			if (content[k].type == 'text') return dataHelper.fmtText(content[k].val, 100);
		}
		return desc;
	}

	/**
	 * 图片上传
	 * @param {string} cardId
	 * @param {Array} imgList  图片数组
	 */
	static async updateCardPic(cardId, imgList) {
		// 图片上传到云空间
		imgList = await cloudHelper.transTempPics(imgList, 'card/', cardId);

		// 更新本记录的图片信息
		let params = {
			cardId: cardId,
			imgList: imgList
		};

		try {
			// 更新数据 从promise 里直接同步返回
			let res = await cloudHelper.callCloudSumbit('admin/card_update_pic', params);
			return res.data.urls;
		} catch (err) {
			console.error(err);
		}
	}

	/**
	 * 富文本中的图片上传
	 * @param {string} cardId
	 * @param {Array} content  富文本数组
	 */
	static async updateCardContentPic(cardId, content, that) {
		let imgList = [];
		for (let k in content) {
			if (content[k].type == 'img') {
				imgList.push(content[k].val);
			}
		}

		// 图片上传到云空间
		imgList = await cloudHelper.transTempPics(imgList, 'card/', cardId);

		// 更新图片地址
		let imgIdx = 0;
		for (let k in content) {
			if (content[k].type == 'img') {
				content[k].val = imgList[imgIdx];
				imgIdx++;
			}
		}

		// 更新本记录的图片信息
		let params = {
			cardId,
			content
		};

		try {
			// 更新数据 从promise 里直接同步返回
			await cloudHelper.callCloudSumbit('admin/card_update_content', params);
			that.setData({
				formContent: content
			});
		} catch (e) {
			console.error(e);
			return false;
		}

		return true;
	}

	/** 取得分类 */
	static async getCateList() {
		let skin = pageHelper.getSkin();
		let cateList = dataHelper.getSelectOptions(skin.CARD_CATE);

		let arr = [];
		for (let k in cateList) {
			arr.push({
				label: cateList[k].label,
				type: 'type',
				val: cateList[k].val, //for options
				value: cateList[k].val, //for list
			});
		}
		return arr;
	}

	/** 表单初始化相关数据 */
	static async initFormData(id = '') {
		let typeOptions = await AdminCardBiz.getCateList();

		return {
			id,

			contentDesc: '',

			// 类型
			typeOptions,

			// 图片数据
			imgList: [],

			// 表单数据
			formType: 1, //类型 默认次数卡
			formName: '',
			formDesc: '',
			formPrice: 0,
			formTimes: 0,
			formAmount: 0,
			formValidityDays: '', // 有效期，默认为空表示永久有效
			formOrder: 9999,
			formPaymentZelle: '',
			formPaymentQr: '',
			formPaymentInstructions: '',
			formContent: [],
		};
	}

	/** 通过唯一识别码搜索卡项 */
	static async searchByUniqueId(uniqueId) {
		if (!uniqueId || uniqueId.trim() === '') {
			return null;
		}

		let params = {
			uniqueId: uniqueId.trim().toUpperCase()
		};

		try {
			let result = await cloudHelper.callCloudSumbit('admin/user_card_search_by_id', params);
			return result.data;
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	/** 通过手机号搜索用户卡项 */
	static async searchByPhone(phone, countryCode = '+1') {
		if (!phone || phone.trim() === '') {
			return null;
		}

		let params = {
			phone: phone.trim(),
			countryCode: countryCode
		};

		try {
			let result = await cloudHelper.callCloudSumbit('admin/user_card_search', params);
			return result.data;
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	/** 调整用户卡项（扣减或增加） */
	static async adjustUserCard({
		userCardId,
		changeTimes = 0,
		changeAmount = 0,
		reason,
		relatedId = ''
	}) {
		if (!userCardId || !reason) {
			throw new Error('参数不完整');
		}

		if (changeTimes === 0 && changeAmount === 0) {
			throw new Error('变动数值不能为0');
		}

		let params = {
			userCardId,
			changeTimes,
			changeAmount,
			reason,
			relatedId
		};

		try {
			let result = await cloudHelper.callCloudSumbit('admin/user_card_adjust', params);
			return result.data;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}

	/** 获取用户卡项使用记录 */
	static async getUserCardRecords(userId, userCardId = '', page = 1, size = 20) {
		if (!userId) {
			throw new Error('用户ID不能为空');
		}

		let params = {
			userId,
			userCardId,
			page,
			size
		};

		try {
			let result = await cloudHelper.callCloudData('admin/user_card_records', params);
			return result;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
}

/** 表单校验 */
AdminCardBiz.CHECK_FORM = {
	type: 'formType|must|int|in:1,2|name=卡项类型',
	name: 'formName|must|string|min:2|max:50|name=卡项名称',
	desc: 'formDesc|string|name=卡项描述',  // 移除必填和长度限制
	price: 'formPrice|must|float|min:0|name=售价',
	times: 'formTimes|int|min:0|name=包含次数',
	amount: 'formAmount|float|min:0|name=充值金额',
	validityDays: 'formValidityDays|int|min:0|name=有效期',  // 添加有效期字段
	order: 'formOrder|must|int|min:1|max:9999|name=排序号',
	paymentZelle: 'formPaymentZelle|string|name=Zelle账号',  // 添加支付信息字段
	paymentQr: 'formPaymentQr|string|name=支付二维码',
	paymentInstructions: 'formPaymentInstructions|string|name=支付说明',
};

module.exports = AdminCardBiz;
