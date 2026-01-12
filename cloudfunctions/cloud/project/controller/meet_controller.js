/**
 * Notes: 预约模块控制器
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-12-10 04:00:00 
 */

const BaseController = require('./base_controller.js');
const MeetService = require('../service/meet_service.js');
const timeUtil = require('../../framework/utils/time_util.js');
const JoinModel = require('../model/join_model.js');
const cacheUtil = require('../../framework/utils/cache_util.js');
const config = require('../../config/config.js');
const cloudUtil = require('../../framework/cloud/cloud_util.js');

const CACHE_CALENDAR_INDEX = 'cache_calendar_index';
const CACHE_CALENDAR_HAS_DAY = 'cache_calendar_has_day';
const CACHE_CALENDAR_WEEK_INDEX = 'cache_calendar_week_index';
const CACHE_CALENDAR_HAS_WEEK = 'cache_calendar_has_week';

class MeetController extends BaseController {

	/**
	 * 转换列表中的导师图片 cloud:// URL 为临时 HTTPS URL
	 */
	async _convertInstructorPics(list) {
		if (!list || !Array.isArray(list)) return list;

		for (let item of list) {
			if (item.instructorPic && item.instructorPic.startsWith('cloud://')) {
				try {
					const tempUrl = await cloudUtil.getTempFileURLOne(item.instructorPic);
					if (tempUrl) item.instructorPic = tempUrl;
				} catch (err) {
					console.error('转换导师图片URL失败:', err);
				}
			}
		}
		return list;
	}

	// 把列表转换为显示模式
	transMeetList(list) {
		let ret = [];
		for (let k in list) {
			let node = {};
			node.type = 'meet';
			node._id = list[k]._id;
			node.title = list[k].MEET_TITLE;
			node.desc = list[k].MEET_STYLE_SET.desc;
			node.ext = list[k].openRule;
			node.pic = list[k].MEET_STYLE_SET.pic;
			ret.push(node);
		}
		return ret;
	}


	/** 按天获取预约项目 */
	async getMeetListByDay() {

		// 数据校验
		let rules = {
			day: 'must|date|name=日期',
		};

		// 取得数据
		let input = this.validateData(rules);

		let cacheKey = CACHE_CALENDAR_INDEX + '_' + input.day;
		let list = await cacheUtil.get(cacheKey);
		if (!list) {
			let service = new MeetService();
			list = await service.getMeetListByDay(input.day);
			cacheUtil.set(cacheKey, list, config.CACHE_CALENDAR_TIME);
		}

		// 转换导师图片 URL（临时 URL 会过期，不能缓存）
		list = await this._convertInstructorPics(list);
		return list;

	}

	/** 获取从某天开始可预约的日期 */
	async getHasDaysFromDay() {

		// 数据校验
		let rules = {
			day: 'must|date|name=日期',
		};

		// 取得数据
		let input = this.validateData(rules);


		let cacheKey = CACHE_CALENDAR_HAS_DAY + '_' + input.day;
		let list = await cacheUtil.get(cacheKey);
		if (list) {
			return list;
		} else {
			let service = new MeetService();
			let list = await service.getHasDaysFromDay(input.day);
			cacheUtil.set(cacheKey, list, config.CACHE_CALENDAR_TIME);
			return list;
		}

	}

	/** 按周范围获取预约项目 */
	async getMeetListByWeek() {

		// 数据校验
		let rules = {
			startDate: 'must|date|name=开始日期',
			endDate: 'must|date|name=结束日期',
		};

		// 取得数据
		let input = this.validateData(rules);

		let cacheKey = CACHE_CALENDAR_WEEK_INDEX + '_' + input.startDate + '_' + input.endDate;
		let list = await cacheUtil.get(cacheKey);
		if (!list) {
			let service = new MeetService();
			list = await service.getMeetListByWeek(input.startDate, input.endDate);
			cacheUtil.set(cacheKey, list, config.CACHE_CALENDAR_TIME);
		}

		// 转换导师图片 URL（临时 URL 会过期，不能缓存）
		list = await this._convertInstructorPics(list);
		return list;

	}

	/** 获取从某天开始可预约的周范围 */
	async getHasWeeksFromDay() {

		// 数据校验
		let rules = {
			day: 'must|date|name=日期',
			monthCount: 'int|default=3|name=月数',
		};

		// 取得数据
		let input = this.validateData(rules);

		let cacheKey = CACHE_CALENDAR_HAS_WEEK + '_' + input.day + '_' + input.monthCount;
		let list = await cacheUtil.get(cacheKey);
		if (list) {
			return list;
		} else {
			let service = new MeetService();
			let list = await service.getHasWeeksFromDay(input.day, input.monthCount);
			cacheUtil.set(cacheKey, list, config.CACHE_CALENDAR_TIME);
			return list;
		}

	}

	/** 预约列表 */
	async getMeetList() {

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			typeId: 'string',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let result = await service.getMeetList(input);

		// 数据格式化
		let list = result.list;

		for (let k in list) {
			list[k].openRule = this._getLeaveDay(list[k].MEET_DAYS) + '天可预约';
		}

		result.list = this.transMeetList(list);

		return result;

	}

	/** 我的预约列表 */
	async getMyJoinList() {

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let result = await service.getMyJoinList(this._userId, input);

		// 数据格式化
		let list = result.list;

		// 批量获取 meet 的取消设置
		let meetIds = [...new Set(list.map(item => item.JOIN_MEET_ID))];
		let meetCancelSets = {};
		if (meetIds.length > 0) {
			let MeetModel = require('../model/meet_model.js');
			let meets = await MeetModel.getAll({ _id: ['in', meetIds] }, 'MEET_CANCEL_SET');
			for (let meet of meets) {
				meetCancelSets[meet._id] = meet.MEET_CANCEL_SET || {};
			}
		}

		let now = timeUtil.time('Y-M-D h:m');
		let nowTimestamp = timeUtil.time('timestamp');

		for (let k in list) {
			if (now > (list[k].JOIN_MEET_DAY + ' ' + list[k].JOIN_MEET_TIME_END))
				list[k].isTimeout = 1;
			else
				list[k].isTimeout = 0;

			// 检查是否允许取消
			list[k].canCancel = true;
			if ((list[k].JOIN_STATUS == 1 || list[k].JOIN_STATUS == 0) && list[k].JOIN_IS_CHECKIN == 0) {
				let cancelSet = meetCancelSets[list[k].JOIN_MEET_ID] || {};
				if (cancelSet.isLimit) {
					if (cancelSet.days === -1) {
						list[k].canCancel = false;
					} else {
						// 计算限制时间
						let startTime = timeUtil.time2Timestamp(list[k].JOIN_MEET_DAY + ' ' + list[k].JOIN_MEET_TIME_START + ':00');
						let limitSeconds = 0;
						if (cancelSet.days) limitSeconds += cancelSet.days * 24 * 3600;
						if (cancelSet.hours) limitSeconds += cancelSet.hours * 3600;
						if (cancelSet.minutes) limitSeconds += cancelSet.minutes * 60;
						let limitTime = startTime - limitSeconds * 1000;

						if (nowTimestamp >= limitTime) {
							list[k].canCancel = false;
						}
					}
				}
			}

			list[k].JOIN_MEET_DAY = timeUtil.fmtDateCHN(list[k].JOIN_MEET_DAY) + ' (' + timeUtil.week(list[k].JOIN_MEET_DAY) + ')';

			list[k].JOIN_ADD_TIME = timeUtil.timestamp2Time(list[k].JOIN_ADD_TIME, 'Y-M-D h:m');
		}

		result.list = list;

		return result;

	}

	/** 我的某日预约列表 */
	async getMyJoinSomeday() {
		// 数据校验
		let rules = {
			day: 'must|date|name=日期',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let list = await service.getMyJoinSomeday(this._userId, input.day);

		// 数据格式化  
		for (let k in list) {

		}

		return list;

	}

	/** 我的预约详情 */
	async getMyJoinDetail() {
		// 数据校验
		let rules = {
			joinId: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let join = await service.getMyJoinDetail(this._userId, input.joinId);
		if (join) {
			join.JOIN_STATUS_DESC = JoinModel.getDesc('STATUS', join.JOIN_STATUS);
			join.JOIN_ADD_TIME = timeUtil.timestamp2Time(join.JOIN_ADD_TIME);
		}
		return join;

	}

	/** 用户预约取消 */
	async cancelMyJoin() {

		// 数据校验
		let rules = {
			joinId: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		return await service.cancelMyJoin(this._userId, input.joinId);
	}

	/** 清理已取消和已过期的预约 */
	async clearMyJoin() {
		let service = new MeetService();
		let count = await service.clearMyJoin(this._userId);
		return { count };
	}

	/** 用户自助签到 */
	async userSelfCheckin() {

		// 数据校验
		let rules = {
			timeMark: 'must|string',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		return await service.userSelfCheckin(this._userId, input.timeMark);
	}


	/**  预约前获取关键信息 */
	async detailForJoin() {
		// 数据校验
		let rules = {
			meetId: 'must|meetId',
			timeMark: 'must|string',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let meet = await service.detailForJoin(this._userId, input.meetId, input.timeMark);

		if (meet) {
			// 显示转换  
		}

		return meet;
	}

	/** 浏览预约信息 */
	async viewMeet() {
		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let meet = await service.viewMeet(input.id);

		if (meet) {
			// 显示转换  
		}

		return meet;
	}

	/** 预约前检测 */
	async beforeJoin() {
		// 数据校验
		let rules = {
			meetId: 'must|id',
			timeMark: 'must|string',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		return await service.beforeJoin(this._userId, input.meetId, input.timeMark);
	}

	/** 预约提交 */
	async join() {
		// 数据校验
		// forms 改为可选，因为某些课程可能不需要额外表单信息
		let rules = {
			meetId: 'must|id',
			timeMark: 'must|string',
			forms: 'array|default=[]',  // 允许为空数组
			cardId: 'string', // 卡项ID（可选）
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MeetService();
		let admin = null;
		return await service.join(this._userId, input.meetId, input.timeMark, input.forms, input.cardId);
	}


	// 计算可约天数
	_getLeaveDay(days) {
		let now = timeUtil.time('Y-M-D');
		let count = 0;
		for (let k in days) {
			if (days[k] >= now) count++;
		}
		return count;
	}

}

module.exports = MeetController;