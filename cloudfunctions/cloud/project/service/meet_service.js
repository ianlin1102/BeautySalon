/**
 * Notes: 预约模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-12-10 07:48:00 
 */

const BaseService = require('./base_service.js');
const util = require('../../framework/utils/util.js');
const MeetModel = require('../model/meet_model.js');
const JoinModel = require('../model/join_model.js');
const DayModel = require('../model/day_model.js');
const LogUtil = require('../../framework/utils/log_util.js');
const timeUtil = require('../../framework/utils/time_util.js');
const dataUtil = require('../../framework/utils/data_util.js');
const config = require('../../config/config.js');
const PassportService = require('../service/passport_service.js');
const cloudBase = require('../../framework/cloud/cloud_base.js');
const UserModel = require('../model/user_model.js');

class MeetService extends BaseService {

	constructor() {
		super();
		this._log = new LogUtil(config.MEET_LOG_LEVEL);
	}

	/**
	 * 抛出异常
	 * @param {*} msg 
	 * @param {*} code 
	 */
	AppError(msg) {
		this._log.error(msg);
		super.AppError(msg);
	}

	_meetLog(meet, func = '', msg = '') {
		let str = '';
		str = `[MEET=${meet.MEET_TITLE}][${func}] ${msg}`;
		this._log.debug(str);
	}

	/** 统一获取Meet（某天) */
	async getMeetOneDay(meetId, day, where, fields = '*') {

		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return meet;

		meet.MEET_DAYS_SET = await this.getDaysSet(meetId, day, day);
		return meet;
	}

	/** 获取日期设置 */
	async getDaysSet(meetId, startDay, endDay = null) {
		let where = {
			DAY_MEET_ID: meetId
		}
		if (startDay && endDay && endDay == startDay)
			where.day = startDay;
		else if (startDay && endDay)
			where.day = ['between', startDay, endDay];
		else if (!startDay && endDay)
			where.day = ['<=', endDay];
		else if (startDay && !endDay)
			where.day = ['>=', startDay];

		let orderBy = {
			'day': 'asc'
		}
		let list = await DayModel.getAllBig(where, 'day,dayDesc,times', orderBy, 1000);

		for (let k in list) {
			delete list[k]._id;
		}

		return list;
	}

	// 按时段统计某时段报名情况
	async statJoinCnt(meetId, timeMark) {
		let whereJoin = {
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_MEET_ID: meetId
		};
		let ret = await JoinModel.groupCount(whereJoin, 'JOIN_STATUS');

		let stat = { //统计数据
			succCnt: ret['JOIN_STATUS_1'] || 0, //1=预约成功,
			cancelCnt: ret['JOIN_STATUS_10'] || 0, //10=已取消, 
			adminCancelCnt: ret['JOIN_STATUS_99'] || 0, //99=后台取消
		};

		let whereDay = {
			DAY_MEET_ID: meetId,
			day: this.getDayByTimeMark(timeMark)
		};
		let day = await DayModel.getOne(whereDay, 'times');
		if (!day) return;

		let times = day.times;
		for (let j in times) {
			if (times[j].mark === timeMark) {
				let data = {
					['times.' + j + '.stat']: stat
				}
				await DayModel.edit(whereDay, data);
				return;
			}
		}

	}


	// 预约前检测
	async beforeJoin(userId, meetId, timeMark) {
		await this.checkMeetRules(userId, meetId, timeMark);
	}

	// 预约逻辑
	async join(userId, meetId, timeMark, forms, cardId) {
		// 预约时段是否存在
		let meetWhere = {
			_id: meetId
		};
		let day = this.getDayByTimeMark(timeMark);
		let meet = await this.getMeetOneDay(meetId, day, meetWhere);

		if (!meet) {
			this.AppError('预约时段选择错误1，请重新选择');
		}

		let daySet = this.getDaySetByTimeMark(meet, timeMark);
		if (!daySet)
			this.AppError('预约时段选择错误2，请重新选择');

		let timeSet = this.getTimeSetByTimeMark(meet, timeMark);
		if (!timeSet)
			this.AppError('预约时段选择错误3，请重新选择');

		// 规则校验
		await this.checkMeetRules(userId, meetId, timeMark);


		let data = {};

		data.JOIN_USER_ID = userId;

		data.JOIN_MEET_ID = meetId;
		data.JOIN_MEET_TITLE = meet.MEET_TITLE;
		data.JOIN_MEET_DAY = daySet.day;
		data.JOIN_MEET_TIME_START = timeSet.start;
		data.JOIN_MEET_TIME_END = timeSet.end;
		data.JOIN_MEET_TIME_MARK = timeMark;

		data.JOIN_START_TIME = timeUtil.time2Timestamp(daySet.day + ' ' + timeSet.start + ':00');

		data.JOIN_FORMS = forms;

		// 卡项扣费处理
		if (cardId && meet.MEET_COST_SET && meet.MEET_COST_SET.isEnabled) {
			try {
				console.log('=== 开始扣费处理 ===');
				console.log('cardId:', cardId);
				console.log('userId:', userId);

				const UserCardModel = require('../model/user_card_model.js');
				const CardRecordModel = require('../model/card_record_model.js');

				// 获取用户卡项信息
				let userCard = await UserCardModel.getOne({
					_id: cardId,
					USER_CARD_USER_ID: userId,
					USER_CARD_STATUS: UserCardModel.STATUS.IN_USE
				});

				console.log('获取到的卡项:', userCard);

				if (!userCard) {
					this.AppError('卡项不存在或已失效');
				}

			let costSet = meet.MEET_COST_SET;
			let deductAmount = 0;
			let deductType = ''; // 'times' 或 'amount'
			let cardData = {};

			// 检查卡项类型和余额
			if (userCard.USER_CARD_TYPE === UserCardModel.TYPE.TIMES) {
				if (costSet.costType !== 'times' && costSet.costType !== 'both') {
					this.AppError('该预约不支持次数卡');
				}
				let remainTimes = userCard.USER_CARD_REMAIN_TIMES || 0;
				if (remainTimes < costSet.timesCost) {
					this.AppError('卡项次数不足');
				}
				deductAmount = costSet.timesCost;
				deductType = 'times';
				cardData.USER_CARD_REMAIN_TIMES = remainTimes - costSet.timesCost;
				cardData.USER_CARD_USED_TIMES = (userCard.USER_CARD_USED_TIMES || 0) + costSet.timesCost;
				// 如果次数用完，更新状态
				if (cardData.USER_CARD_REMAIN_TIMES <= 0) {
					cardData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
				}
			} else if (userCard.USER_CARD_TYPE === UserCardModel.TYPE.BALANCE) {
				if (costSet.costType !== 'balance' && costSet.costType !== 'both') {
					this.AppError('该预约不支持储值卡');
				}
				let remainAmount = userCard.USER_CARD_REMAIN_AMOUNT || 0;
				if (remainAmount < costSet.balanceCost) {
					this.AppError('卡项余额不足');
				}
				deductAmount = costSet.balanceCost;
				deductType = 'amount';
				cardData.USER_CARD_REMAIN_AMOUNT = remainAmount - costSet.balanceCost;
				cardData.USER_CARD_USED_AMOUNT = (userCard.USER_CARD_USED_AMOUNT || 0) + costSet.balanceCost;
				// 如果余额用完，更新状态
				if (cardData.USER_CARD_REMAIN_AMOUNT <= 0) {
					cardData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
				}
			}

			// 扣除卡项余额
			await UserCardModel.edit(cardId, cardData);

				// 记录使用记录到 card_record
				let beforeTimes = userCard.USER_CARD_REMAIN_TIMES || 0;
				let beforeAmount = userCard.USER_CARD_REMAIN_AMOUNT || 0;
				let afterTimes = cardData.USER_CARD_REMAIN_TIMES !== undefined ? cardData.USER_CARD_REMAIN_TIMES : beforeTimes;
				let afterAmount = cardData.USER_CARD_REMAIN_AMOUNT !== undefined ? cardData.USER_CARD_REMAIN_AMOUNT : beforeAmount;

				console.log('准备插入消费记录:', {
					cardId,
					userId,
					deductType,
					deductAmount,
					beforeTimes,
					afterTimes,
					beforeAmount,
					afterAmount
				});

				await CardRecordModel.insert({
					RECORD_USER_CARD_ID: cardId,
					RECORD_USER_ID: userId,
					RECORD_TYPE: CardRecordModel.TYPE.CONSUME,
					RECORD_CHANGE_TIMES: deductType === 'times' ? -deductAmount : 0,
					RECORD_CHANGE_AMOUNT: deductType === 'amount' ? -deductAmount : 0,
					RECORD_BEFORE_TIMES: beforeTimes,
					RECORD_AFTER_TIMES: afterTimes,
					RECORD_BEFORE_AMOUNT: beforeAmount,
					RECORD_AFTER_AMOUNT: afterAmount,
					RECORD_REASON: '预约消费 - ' + meet.MEET_TITLE,
					RECORD_RELATED_ID: ''
				});

				console.log('消费记录插入成功');

				// 记录扣费信息到预约记录
				data.JOIN_CARD_DEDUCT = {
					cardId: cardId,
					cardType: deductType,
					cardName: userCard.USER_CARD_CARD_NAME,
					deductAmount: deductAmount,
					deductTime: timeUtil.time(),
					refunded: false,
					refundTime: 0,
					refundReason: '',
					refundBy: ''
				};

				console.log('卡项扣费处理完成');
			} catch (err) {
				console.error('卡项扣费失败:', err);
				throw err; // 重新抛出错误
			}
		}

		data.JOIN_STATUS = JoinModel.STATUS.SUCC;
		data.JOIN_CODE = dataUtil.genRandomIntString(15);

		// 入库
		let joinId = await JoinModel.insert(data);

		// 若有手机号码 用户入库
		let mobile = '';
		let userName = '';
		for (let k in forms) {
			if (!mobile && forms[k].type == 'mobile') {
				mobile = forms[k].val;
				continue;
			} else if (!userName && forms[k].title == '姓名') {
				userName = forms[k].val;
				continue;
			}
		}

		// 统计
		this.statJoinCnt(meetId, timeMark);

		return {
			result: 'ok',
			joinId
		}
	}

	// 根据日期获取其所在天设置
	getDaySetByDay(meet, day) {
		for (let k in meet.MEET_DAYS_SET) {
			if (meet.MEET_DAYS_SET[k].day == day)
				return dataUtil.deepClone(meet.MEET_DAYS_SET[k]);
		}
		return null;
	}

	// 根据时段标识获取其所在天 
	getDayByTimeMark(timeMark) {
		return timeMark.substr(1, 4) + '-' + timeMark.substr(5, 2) + '-' + timeMark.substr(7, 2);
	}

	// 根据时段标识获取其所在天设置
	getDaySetByTimeMark(meet, timeMark) {
		let day = this.getDayByTimeMark(timeMark);

		for (let k in meet.MEET_DAYS_SET) {
			if (meet.MEET_DAYS_SET[k].day == day)
				return dataUtil.deepClone(meet.MEET_DAYS_SET[k]);
		}
		return null;
	}

	// 根据时段标识获取其所在时段设置
	getTimeSetByTimeMark(meet, timeMark) {
		let day = this.getDayByTimeMark(timeMark);

		for (let k in meet.MEET_DAYS_SET) {
			if (meet.MEET_DAYS_SET[k].day != day) continue;

			for (let j in meet.MEET_DAYS_SET[k].times) {
				if (meet.MEET_DAYS_SET[k].times[j].mark == timeMark)
					return dataUtil.deepClone(meet.MEET_DAYS_SET[k].times[j]);
			}
		}
		return null;
	}

	// 预约时段人数和状态控制校验
	async checkMeetTimeControll(meet, timeMark) {
		if (!meet) this.AppError('预约时段设置错误, 预约项目不存在');

		let daySet = this.getDaySetByTimeMark(meet, timeMark); // 当天设置
		let timeSet = this.getTimeSetByTimeMark(meet, timeMark); // 预约时段设置

		if (!daySet || !timeSet) this.AppError('预约时段设置错误day&time');

		let statusDesc = timeSet.status == 1 ? '开启' : '关闭';
		let limitDesc = '';
		if (timeSet.isLimit) {
			limitDesc = '人数上限MAX=' + timeSet.limit;
		} else
			limitDesc = '人数不限制NO';

		this._meetLog(meet, `------------------------------`);
		this._meetLog(meet, `#预约时段控制,预约日期=<${daySet.day}>`, `预约时段=[${timeSet.start}-${timeSet.end}],状态=${statusDesc}, ${limitDesc} 当前预约成功人数=${timeSet.stat.succCnt}`);

		if (timeSet.status == 0) this.AppError('该时段预约已经关闭，请选择其他');

		// 时段总人数限制
		if (timeSet.isLimit) {
			if (timeSet.stat.succCnt >= timeSet.limit) {
				this.AppError('该时段预约人员已满，请选择其他');
			}
		}
	}


	/** 报名规则校验 */
	async checkMeetRules(userId, meetId, timeMark) {
		// 预约时段是否存在
		let meetWhere = {
			_id: meetId
		};
		let day = this.getDayByTimeMark(timeMark);
		let meet = await this.getMeetOneDay(meetId, day, meetWhere);
		if (!meet) {
			this.AppError('预约时段选择错误，请重新选择');
		}

		// 预约时段人数和状态控制校验
		await this.checkMeetTimeControll(meet, timeMark);

		// 截止规则
		await this.checkMeetEndSet(meet, timeMark);

		// 针对用户的次数限制
		await this.checkMeetLimitSet(userId, meet, timeMark);

	}


	// 预约次数限制校验
	async checkMeetLimitSet(userId, meet, timeMark) {
		if (!meet) this.AppError('预约次数规则错误, 预约项目不存在');
		let meetId = meet._id;

		let daySet = this.getDaySetByTimeMark(meet, timeMark); // 当天设置
		let timeSet = this.getTimeSetByTimeMark(meet, timeMark); // 预约时段设置

		this._meetLog(meet, `------------------------------`);
		this._meetLog(meet, `#预约次数规则,预约日期=<${daySet.day}>`, `预约时段=[${timeSet.start}～${timeSet.end}]`);

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_USER_ID: userId,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		}
		let cnt = await JoinModel.count(where);
		this._meetLog(meet, `预约次数规则,mode=本时段可预约1次`, `当前已预约=${cnt}次`);
		if (cnt >= 1) {
			this.AppError(`您本时段已经预约，无须重复预约`);
		}
	}



	// 预约截止设置校验
	async checkMeetEndSet(meet, timeMark) {
		if (!meet) this.AppError('预约截止规则错误, 预约项目不存在');


		this._meetLog(meet, `------------------------------`);
		let daySet = this.getDaySetByTimeMark(meet, timeMark); // 当天设置
		let timeSet = this.getTimeSetByTimeMark(meet, timeMark); // 预约时段设置

		this._meetLog(meet, `#预约截止规则,预约日期=<${daySet.day}>`, `预约时段=[${timeSet.start}-${timeSet.end}]`);

		let nowTime = timeUtil.time('Y-M-D h:m:s');

		let startTime = daySet.day + ' ' + timeSet.start + ':00';
		this._meetLog(meet, `预约开始规则,mode=<时段过期判定>`, `预约开始时段=${startTime},当前时段=${nowTime}`);
		if (nowTime > startTime) {
			this.AppError('该时段已开始，无法预约，请选择其他');
		}

	}


	/**  预约详情 */
	async viewMeet(meetId) {

		let fields = '*';

		let where = {
			_id: meetId,
			MEET_STATUS: ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;


		let getDaysSet = [];
		meet.MEET_DAYS_SET = await this.getDaysSet(meetId, timeUtil.time('Y-M-D')); //今天及以后
		let daysSet = meet.MEET_DAYS_SET;

		let now = timeUtil.time('Y-M-D');
		for (let k in daysSet) {
			let dayNode = daysSet[k];

			if (dayNode.day < now) continue; // 排除过期

			let getTimes = [];

			for (let j in dayNode.times) {
				let timeNode = dayNode.times[j];

				// 排除状态关闭的时段
				if (timeNode.status != 1) continue;

				// 判断数量是否已满
				if (timeNode.isLimit && timeNode.stat.succCnt >= timeNode.limit)
					timeNode.error = '预约已满';

				// 截止规则
				if (!timeNode.error) {
					try {
						await this.checkMeetEndSet(meet, timeNode.mark);
					} catch (ex) {
						if (ex.name == 'AppError')
							timeNode.error = '预约结束';
						else
							throw ex;
					}
				}

				getTimes.push(timeNode);
			}
			dayNode.times = getTimes;

			getDaysSet.push(dayNode);
		}

		// 只返回需要的字段
		let ret = {};
		ret.MEET_DAYS_SET = getDaysSet;

		ret.MEET_IS_SHOW_LIMIT = meet.MEET_IS_SHOW_LIMIT;
		ret.MEET_TITLE = meet.MEET_TITLE;
		ret.MEET_CONTENT = meet.MEET_CONTENT;


		return ret;
	}

	/** 用户自助签到 */
	async userSelfCheckin(userId, timeMark) {
		let day = this.getDayByTimeMark(timeMark);

		let today = timeUtil.time('Y-M-D');
		if (day != today)
			this.AppError('仅在预约当天可以签到，当前签到码的日期是' + day);

		let whereSucc = {
			JOIN_MEET_DAY: day,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_USER_ID: userId,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		}
		let cntSucc = await JoinModel.count(whereSucc);

		let whereCheckin = {
			JOIN_MEET_DAY: day,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_USER_ID: userId,
			JOIN_IS_CHECKIN: 1,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		}
		let cntCheckin = await JoinModel.count(whereCheckin);

		let ret = '';
		if (cntSucc == 0) {
			ret = '您没有本次报名的记录，请在「个人中心」查看详情~';
		} else if (cntSucc == cntCheckin) {
			ret = '您已签到，无须重复签到，请在「个人中心」查看详情~';
		} else {
			let where = {
				JOIN_MEET_DAY: day,
				JOIN_MEET_TIME_MARK: timeMark,
				JOIN_USER_ID: userId,
				JOIN_IS_CHECKIN: 0,
				JOIN_STATUS: JoinModel.STATUS.SUCC
			}
			let data = {
				JOIN_IS_CHECKIN: 1
			}
			await JoinModel.edit(where, data);
			ret = '签到成功，请在「个人中心」查看详情~'
		}
		return {
			ret
		};

	}


	/**  预约前获取关键信息 */
	async detailForJoin(userId, meetId, timeMark) {

		let fields = 'MEET_DAYS_SET,MEET_FORM_SET,MEET_TITLE,MEET_CANCEL_SET,MEET_COST_SET';

		let where = {
			_id: meetId,
			MEET_STATUS: ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]
		}
		let day = this.getDayByTimeMark(timeMark);
		let meet = await this.getMeetOneDay(meetId, day, where, fields);
		if (!meet) return null;

		let dayDesc = timeUtil.fmtDateCHN(this.getDaySetByTimeMark(meet, timeMark).day);

		let timeSet = this.getTimeSetByTimeMark(meet, timeMark);
		let timeDesc = timeSet.start + '～' + timeSet.end;
		meet.dayDesc = dayDesc + ' ' + timeDesc;

		// 取出本人最近一次本时段填写表单
		let whereMy = {
			JOIN_USER_ID: userId,
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark
		}
		let orderByMy = {
			JOIN_ADD_TIME: 'desc'
		}
		let joinMy = await JoinModel.getOne(whereMy, 'JOIN_FORMS', orderByMy);

		// 取出本人最近一次本项目填写表单
		if (!joinMy) {
			whereMy = {
				JOIN_USER_ID: userId,
				JOIN_MEET_ID: meetId,
			}
			let orderByMy = {
				JOIN_ADD_TIME: 'desc'
			}
			joinMy = await JoinModel.getOne(whereMy, 'JOIN_FORMS', orderByMy);
		}

		// 取出本人最近一次的填写表单
		if (!joinMy) {
			whereMy = {
				JOIN_USER_ID: userId,
			}
			let orderByMy = {
				JOIN_ADD_TIME: 'desc'
			}
			joinMy = await JoinModel.getOne(whereMy, 'JOIN_FORMS', orderByMy);
		}

		let myForms = joinMy ? joinMy.JOIN_FORMS : [];
		meet.myForms = myForms;

		return meet;
	}

	/** 获取某天可用时段 */
	async getUsefulTimesByDaysSet(meetId, day) {
		let where = {
			DAY_MEET_ID: meetId,
			day
		}
		let daysSet = await DayModel.getAll(where, 'day,times');
		let usefulTimes = [];
		for (let k in daysSet) {
			if (daysSet[k].day != day)
				continue;

			let times = daysSet[k].times;
			for (let j in times) {
				if (times[j].status != 1) continue;
				usefulTimes.push(times[j]);
			}
			break;

		}
		return usefulTimes;
	}

	/** 按天获取预约项目 */
	async getMeetListByDay(day) {
		let where = {
			MEET_STATUS: MeetModel.STATUS.COMM,
		};

		let orderBy = {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};

		let fields = 'MEET_TITLE,MEET_DAYS_SET,MEET_STYLE_SET';

		let list = await MeetModel.getAll(where, fields, orderBy);

		let retList = [];

		for (let k in list) {
			let usefulTimes = await this.getUsefulTimesByDaysSet(list[k]._id, day);

			if (usefulTimes.length == 0) continue;

			let node = {};
			// 返回完整的时间段数组，供前端显示
			node.times = usefulTimes.map(t => ({
				start: t.start,
				end: t.end
			}));
			// 保留兼容性的 timeDesc
			node.timeDesc = usefulTimes.length > 1 ? usefulTimes.length + '个时段' : usefulTimes[0].start;
			node.title = list[k].MEET_TITLE;
			node.pic = list[k].MEET_STYLE_SET.pic;
			node._id = list[k]._id;
			retList.push(node);

		}
		return retList;
	}

	/** 获取从某天开始可预约的日期 */
	async getHasDaysFromDay(day) {
		let where = {
			day: ['>=', day],
		};

		let fields = 'times,day';
		let list = await DayModel.getAllBig(where, fields);

		let retList = [];
		for (let k in list) {
			for (let n in list[k].times) {
				if (list[k].times[n].status == 1) {
					retList.push(list[k].day);
					break;
				}
			}
		}
		return retList;
	}

	/** 取得预约分页列表 */
	async getMeetList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序 
		typeId, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_TITLE,MEET_STYLE_SET,MEET_DAYS';

		let where = {};
		if (typeId && typeId !== '0') where.MEET_TYPE_ID = typeId;
		console.log(typeId)
		where.MEET_STATUS = ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]; // 状态  

		if (util.isDefined(search) && search) {
			where.MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}
					if (sortVal == 'new') {
						orderBy = {
							'MEET_ADD_TIME': 'desc'
						};
					}

					break;
			}
		}
		let result = await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

		return result;
	}



	/** 取消我的预约 只有成功可以取消 */
	async cancelMyJoin(userId, joinId) {
		let where = {
			JOIN_USER_ID: userId,
			_id: joinId,
			JOIN_IS_CHECKIN: 0, // 签到不能取消
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		let join = await JoinModel.getOne(where);

		if (!join) {
			this.AppError('未找到可取消的预约记录');
		}

		// 取消规则判定
		let whereMeet = {
			_id: join.JOIN_MEET_ID,
			MEET_STATUS: ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]
		}
		let meet = await this.getMeetOneDay(join.JOIN_MEET_ID, join.JOIN_MEET_DAY, whereMeet);
		if (!meet) this.AppError('预约项目不存在或者已关闭');

		let daySet = this.getDaySetByTimeMark(meet, join.JOIN_MEET_TIME_MARK);
		let timeSet = this.getTimeSetByTimeMark(meet, join.JOIN_MEET_TIME_MARK);
		if (!timeSet) this.AppError('被取消的时段不存在');

		let startT = daySet.day + ' ' + timeSet.start + ':00';
		let startTime = timeUtil.time2Timestamp(startT);

		let now = timeUtil.time();

		if (now > startTime)
			this.AppError('该预约已经开始，无法取消');

		// 检查取消时间限制
		let cancelSet = meet.MEET_CANCEL_SET || {};
		if (cancelSet.isLimit) {
			if (cancelSet.days === -1) {
				// 不能取消
				this.AppError('该预约设定为不可取消');
			} else {
				// 计算取消限制时间
				let limitSeconds = 0;
				if (cancelSet.days) limitSeconds += cancelSet.days * 24 * 3600;
				if (cancelSet.hours) limitSeconds += cancelSet.hours * 3600;
				if (cancelSet.minutes) limitSeconds += cancelSet.minutes * 60;

				let limitTime = startTime - limitSeconds * 1000; // 转换为毫秒

				if (now >= limitTime) {
					// 超过取消限制时间
					let limitDesc = '';
					if (cancelSet.days > 0) limitDesc += cancelSet.days + '天';
					if (cancelSet.hours > 0) limitDesc += cancelSet.hours + '小时';
					if (cancelSet.minutes > 0) limitDesc += cancelSet.minutes + '分钟';
					this.AppError('该预约需要在开始前' + limitDesc + '取消，现已超过限制时间');
				}
			}
		}

		// 返还卡项
		await this._refundCard(join);

		let data = {
			JOIN_STATUS: JoinModel.STATUS.CANCEL,
			JOIN_REASON: '',
			JOIN_IS_CHECKIN: 0,
		}
		await JoinModel.edit(where, data);
		this.statJoinCnt(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);

	}

	/** 返还卡项（内部方法）*/
	async _refundCard(join, refundBy = 'user') {
		// 检查是否有卡项扣费记录
		if (!join.JOIN_CARD_DEDUCT || join.JOIN_CARD_DEDUCT.refunded) {
			return; // 没有扣费记录或已经返还过
		}

		const UserCardModel = require('../model/user_card_model.js');
		const CardRecordModel = require('../model/card_record_model.js');

		let deduct = join.JOIN_CARD_DEDUCT;
		let cardId = deduct.cardId;

		// 获取卡项
		let card = await UserCardModel.getOne({ _id: cardId });
		if (!card) {
			console.error('返还卡项失败：卡项不存在', cardId);
			return; // 卡项不存在，可能已被删除，静默失败
		}

		// 记录返还前的余额
		let beforeTimes = card.USER_CARD_REMAIN_TIMES;
		let beforeAmount = card.USER_CARD_REMAIN_AMOUNT;

		// 计算返还金额
		let refundData = {};
		if (deduct.cardType === 'times') {
			refundData.USER_CARD_REMAIN_TIMES = card.USER_CARD_REMAIN_TIMES + deduct.deductAmount;
			refundData.USER_CARD_USED_TIMES = Math.max(0, card.USER_CARD_USED_TIMES - deduct.deductAmount);
			// 如果返还后有余额，恢复为使用中状态
			if (refundData.USER_CARD_REMAIN_TIMES > 0 && card.USER_CARD_STATUS === UserCardModel.STATUS.USED_UP) {
				refundData.USER_CARD_STATUS = UserCardModel.STATUS.IN_USE;
			}
		} else if (deduct.cardType === 'amount') {
			refundData.USER_CARD_REMAIN_AMOUNT = card.USER_CARD_REMAIN_AMOUNT + deduct.deductAmount;
			refundData.USER_CARD_USED_AMOUNT = Math.max(0, card.USER_CARD_USED_AMOUNT - deduct.deductAmount);
			// 如果返还后有余额，恢复为使用中状态
			if (refundData.USER_CARD_REMAIN_AMOUNT > 0 && card.USER_CARD_STATUS === UserCardModel.STATUS.USED_UP) {
				refundData.USER_CARD_STATUS = UserCardModel.STATUS.IN_USE;
			}
		}

		// 更新卡项余额
		await UserCardModel.edit(cardId, refundData);

		// 创建返还记录（使用管理员调整类型）
		let afterTimes = refundData.USER_CARD_REMAIN_TIMES || beforeTimes;
		let afterAmount = refundData.USER_CARD_REMAIN_AMOUNT || beforeAmount;

		await CardRecordModel.insert({
			RECORD_USER_CARD_ID: cardId,
			RECORD_USER_ID: join.JOIN_USER_ID,
			RECORD_TYPE: CardRecordModel.TYPE.ADMIN_ADJUST, // 使用管理员调整类型表示退款
			RECORD_CHANGE_TIMES: deduct.cardType === 'times' ? deduct.deductAmount : 0, // 正数表示增加
			RECORD_CHANGE_AMOUNT: deduct.cardType === 'amount' ? deduct.deductAmount : 0, // 正数表示增加
			RECORD_BEFORE_TIMES: beforeTimes,
			RECORD_AFTER_TIMES: afterTimes,
			RECORD_BEFORE_AMOUNT: beforeAmount,
			RECORD_AFTER_AMOUNT: afterAmount,
			RECORD_REASON: '预约取消退还 - ' + (join.JOIN_MEET_TITLE || '预约'),
			RECORD_RELATED_ID: join._id
		});

		// 更新预约记录中的退款状态
		deduct.refunded = true;
		deduct.refundTime = timeUtil.time();
		deduct.refundReason = refundBy === 'admin' ? 'Admin取消预约' : '用户取消预约';
		deduct.refundBy = refundBy;

		await JoinModel.edit(join._id, {
			JOIN_CARD_DEDUCT: deduct
		});

		console.log('卡项返还成功:', {
			joinId: join._id,
			cardId: cardId,
			amount: deduct.deductAmount,
			type: deduct.cardType
		});
	}

	/** 清理已取消和已过期的预约 */
	async clearMyJoin(userId) {
		let now = timeUtil.time('Y-M-D H:i:s');

		// 查询已取消的记录（状态为10或99）
		let canceledWhere = {
			JOIN_USER_ID: userId,
			JOIN_STATUS: ['in', [JoinModel.STATUS.CANCEL, JoinModel.STATUS.ADMIN_CANCEL]]
		};

		// 查询已过期的记录（预约成功但时间已过）
		let expiredWhere = {
			JOIN_USER_ID: userId,
			JOIN_STATUS: JoinModel.STATUS.SUCC,
			JOIN_MEET_DAY: ['<', now]
		};

		// 删除已取消的记录
		let canceledCount = await JoinModel.count(canceledWhere);
		if (canceledCount > 0) {
			await JoinModel.del(canceledWhere);
		}

		// 删除已过期的记录
		let expiredCount = await JoinModel.count(expiredWhere);
		if (expiredCount > 0) {
			await JoinModel.del(expiredWhere);
		}

		return canceledCount + expiredCount;
	}

	/** 取得我的预约详情 */
	async getMyJoinDetail(userId, joinId) {

		let fields = 'JOIN_IS_CHECKIN,JOIN_REASON,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_STATUS,JOIN_ADD_TIME,JOIN_CODE,JOIN_FORMS';

		let where = {
			_id: joinId,
			JOIN_USER_ID: userId
		};
		let join = await JoinModel.getOne(where, fields);

		// 获取预约项目的取消设置
		if (join && join.JOIN_MEET_ID) {
			let meet = await MeetModel.getOne({ _id: join.JOIN_MEET_ID }, 'MEET_CANCEL_SET');
			if (meet) {
				join.meet = meet;
			}
		}

		return join;
	}

	/** 取得我的预约分页列表 */
	async getMyJoinList(userId, {
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序 
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			//	'JOIN_MEET_DAY': 'desc',
			//	'JOIN_MEET_TIME_START': 'desc',
			'JOIN_ADD_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_REASON,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_STATUS,JOIN_ADD_TIME';

		let where = {
			JOIN_USER_ID: userId
		};
		//where.MEET_STATUS = ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]; // 状态  

		if (util.isDefined(search) && search) {
			where.JOIN_MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType) {
			// 搜索菜单
			switch (sortType) {
				case 'timedesc': { //按时间倒序
					orderBy = {
						'JOIN_MEET_DAY': 'desc',
						'JOIN_MEET_TIME_START': 'desc',
						'JOIN_ADD_TIME': 'desc'
					};
					break;
				}
				case 'timeasc': { //按时间正序
					orderBy = {
						'JOIN_MEET_DAY': 'asc',
						'JOIN_MEET_TIME_START': 'asc',
						'JOIN_ADD_TIME': 'asc'
					};
					break;
				}
				case 'today': { //今天
					where.JOIN_MEET_DAY = timeUtil.time('Y-M-D');
					break;
				}
				case 'tomorrow': { //明日
					where.JOIN_MEET_DAY = timeUtil.time('Y-M-D', 86400);
					break;
				}
				case 'succ': { //预约成功
					where.JOIN_STATUS = JoinModel.STATUS.COMM;
					//where.JOIN_MEET_DAY = ['>=', timeUtil.time('Y-M-D')];
					//where.JOIN_MEET_TIME_START = ['>=', timeUtil.time('h:m')];
					break;
				}
				case 'cancel': { //已取消
					where.JOIN_STATUS = ['in', [JoinModel.STATUS.CANCEL, JoinModel.STATUS.ADMIN_CANCEL]];
					break;
				}
			}
		}
		let result = await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

		return result;
	}

	/** 取得我的某日预约列表 */
	async getMyJoinSomeday(userId, day) {

		let fields = 'JOIN_IS_CHECKIN,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_STATUS,JOIN_ADD_TIME';

		let where = {
			JOIN_USER_ID: userId,
			JOIN_MEET_DAY: day
		};
		//where.MEET_STATUS = ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.OVER]]; // 状态  

		let orderBy = {
			'JOIN_MEET_TIME_START': 'asc',
			'JOIN_ADD_TIME': 'desc'
		}

		return await JoinModel.getAll(where, fields, orderBy);


	}
}

module.exports = MeetService;