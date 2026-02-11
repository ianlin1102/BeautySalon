/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY www.code3721.com
 * Date: 2025-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const MeetService = require('../meet_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');

const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const DayModel = require('../../model/day_model.js');
const UserModel = require('../../model/user_model.js');
const UserCardModel = require('../../model/user_card_model.js');
const CardRecordModel = require('../../model/card_record_model.js');
const config = require('../../../config/config.js');

class AdminMeetService extends BaseAdminService {

	/** 预约数据列表 */
	async getDayList(meetId, start, end) {
		let where = {
			DAY_MEET_ID: meetId,
			day: ['between', start, end]
		}
		let orderBy = {
			day: 'asc'
		}
		return await DayModel.getAllBig(where, 'day,times,dayDesc', orderBy);
	}

	// 按项目统计人数
	async statJoinCntByMeet(meetId) {
		let today = timeUtil.time('Y-M-D');
		let where = {
			day: ['>=', today],
			DAY_MEET_ID: meetId
		}

		let meetService = new MeetService();
		let list = await DayModel.getAllBig(where, 'DAY_MEET_ID,times', {}, 1000);
		for (let k in list) {
			let meetId = list[k].DAY_MEET_ID;
			let times = list[k].times;

			for (let j in times) {
				let timeMark = times[j].mark;
				meetService.statJoinCnt(meetId, timeMark);
			}
		}
	}

	/** 自助签到码 */
	async genSelfCheckinQr(page, timeMark) {
		// 生成二维码参数
		let scene = timeMark;
		let qrData = {
			scene,
			page,
			width: 280
		};
		
		// 返回二维码数据（实际项目中应该调用微信云开发接口）
		return qrData;
	}

	/** 管理员按钮核销 */
	async checkinJoin(joinId, flag) {
		let data = {
			JOIN_IS_CHECKIN: flag
		};
		
		await JoinModel.edit(joinId, data);
	}

	/** 管理员扫码核销 */
	async scanJoin(meetId, code) {
		// 查找报名记录
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_CODE: code,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		
		let join = await JoinModel.getOne(where);
		if (!join) {
			this.AppError('报名记录不存在或已取消');
		}
		
		// 更新签到状态
		await this.checkinJoin(join._id, 1);
		
		return join;
	}

	/**
	 * 判断本日是否有预约记录
	 * @param {*} daySet daysSet的节点
	 */
	checkHasJoinCnt(times) {
		if (!times) return false;
		for (let k in times) {
			if (times[k].stat.succCnt) return true;
		}
		return false;
	}

	// 判断含有预约的日期
	getCanModifyDaysSet(daysSet) {
		let now = timeUtil.time('Y-M-D');

		for (let k in daysSet) {
			if (daysSet[k].day < now) continue;
			daysSet[k].hasJoin = this.checkHasJoinCnt(daysSet[k].times);
		}

		return daysSet;
	}

	/** 取消某个时间段的所有预约记录 */
	async cancelJoinByTimeMark(admin, meetId, timeMark, reason) {
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};

		// 先获取所有要取消的预约，用于返还卡项
		let joins = await JoinModel.getAll(where);

		let data = {
			JOIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL,
			JOIN_EDIT_ADMIN_ID: admin.ADMIN_ID,
			JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
			JOIN_EDIT_ADMIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL
		};

		if (reason) {
			data.JOIN_REASON = reason;
		}

		// 批量返还卡项（在更新状态之前）
		let meetService = new MeetService();
		for (let join of joins) {
			try {
				await meetService._refundCard(join, 'admin');
			} catch (err) {
				console.error('返还卡项失败:', join._id, err);
				// 继续处理其他预约，不中断整个流程
			}
		}

		await JoinModel.edit(where, data);

		// 更新统计数据
		meetService.statJoinCnt(meetId, timeMark);
	}


	/**添加 */
	async insertMeet(adminId, {
		title,
		order,
		typeId,
		typeName,
		instructorId,
		instructorName,
		instructorPic,
		daysSet,
		isShowLimit,
		cancelSet,
		costSet,
		formSet,
		courseInfo,
	}) {
		// 数据准备
		let data = {
			MEET_TITLE: title,
			MEET_ORDER: order,
			MEET_TYPE_ID: typeId,
			MEET_TYPE_NAME: typeName,
			MEET_INSTRUCTOR_ID: instructorId,
			MEET_INSTRUCTOR_NAME: instructorName,
			MEET_INSTRUCTOR_PIC: instructorPic || '',
			MEET_COURSE_INFO: courseInfo || '',
			MEET_IS_SHOW_LIMIT: isShowLimit,
			MEET_CANCEL_SET: cancelSet || { isLimit: false, days: 0, hours: 0, minutes: 0 },
			MEET_COST_SET: costSet || { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true },
			MEET_FORM_SET: formSet,
			MEET_ADMIN_ID: adminId,
			MEET_STATUS: 1,
			MEET_CONTENT: [],
			MEET_STYLE_SET: {pic: '', desc: ''},
			MEET_DAYS: []
		}

		// 插入记录
		let id = await MeetModel.insert(data);

		// 插入日期设置
		let nowDay = timeUtil.time('Y-M-D');
		await this._editDays(id, nowDay, daysSet);

		return { id };
	}

	/**删除数据 */
	async delMeet(id) {
		// 删除相关的预约记录
		await JoinModel.del({ JOIN_MEET_ID: id });
		
		// 删除相关的日期记录
		await DayModel.del({ DAY_MEET_ID: id });
		
		// 删除预约项目
		await MeetModel.del(id);
	}

	/**获取信息 */
	async getMeetDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;

		let meetService = new MeetService();
		meet.MEET_DAYS_SET = await meetService.getDaysSet(id, timeUtil.time('Y-M-D')); //今天及以后

		// 确保关键字段有默认值
		if (!Array.isArray(meet.MEET_FORM_SET)) {
			console.warn('MEET_FORM_SET 不是数组，meetId:', id);
			meet.MEET_FORM_SET = [];
		}
		if (!meet.MEET_CANCEL_SET) {
			meet.MEET_CANCEL_SET = { isLimit: false, days: 0, hours: 0, minutes: 0 };
		}
		if (!meet.MEET_COST_SET) {
			meet.MEET_COST_SET = { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true };
		}

		return meet;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetContent({
		meetId,
		content // 富文本数组
	}) {
		await MeetModel.edit(meetId, {
			MEET_CONTENT: content
		});
		
		// 返回内容中的图片URL
		let urls = [];
		if (content) {
			for (let item of content) {
				if (item.type === 'img' && item.val) {
					urls.push(item.val);
				}
			}
		}
		return urls;
	}

	/**
	 * 更新封面内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetStyleSet({
		meetId,
		styleSet
	}) {
		await MeetModel.edit(meetId, {
			MEET_STYLE_SET: styleSet
		});
		
		// 返回封面图片URL
		let urls = [];
		if (styleSet && styleSet.pic) {
			urls.push(styleSet.pic);
		}
		return urls;
	}

	/** 更新日期设置 */
	async _editDays(meetId, nowDay, daysSetData) {
		// 删除今天及以后的日期记录
		await DayModel.del({
			DAY_MEET_ID: meetId,
			day: ['>=', nowDay]
		});
		
		// 处理日期设置
		let days = [];
		if (daysSetData && Array.isArray(daysSetData)) {
			for (let daySet of daysSetData) {
				// 正确的数据结构：{day: 'YYYY-MM-DD', desc: '', times: [...]}
				if (daySet.day && daySet.day >= nowDay) {
					days.push(daySet.day);
					
					// 创建日期记录
					let dayData = {
						DAY_MEET_ID: meetId,
						day: daySet.day,
						times: daySet.times || [],
						dayDesc: daySet.desc || daySet.dayDesc || ''
					};
					await DayModel.insert(dayData);
				}
			}
		}
		
		// 更新预约的可用日期
		await MeetModel.edit(meetId, { MEET_DAYS: days });
	}

	/**更新数据 */
	async editMeet({
		id,
		title,
		typeId,
		typeName,
		instructorId,
		instructorName,
		instructorPic,
		order,
		daysSet,
		isShowLimit,
		cancelSet,
		costSet,
		formSet,
		courseInfo,
	}) {
		// 更新数据
		let data = {
			MEET_TITLE: title,
			MEET_ORDER: order,
			MEET_TYPE_ID: typeId,
			MEET_TYPE_NAME: typeName,
			MEET_INSTRUCTOR_ID: instructorId,
			MEET_INSTRUCTOR_NAME: instructorName,
			MEET_INSTRUCTOR_PIC: instructorPic || '',
			MEET_COURSE_INFO: courseInfo || '',
			MEET_IS_SHOW_LIMIT: isShowLimit,
			MEET_CANCEL_SET: cancelSet || { isLimit: false, days: 0, hours: 0, minutes: 0 },
			MEET_COST_SET: costSet || { isEnabled: false, costType: 'free', timesCost: 1, balanceCost: 0, allowAutoSelect: true },
			MEET_FORM_SET: formSet
		}

		await MeetModel.edit(id, data);

		// 更新日期设置
		let nowDay = timeUtil.time('Y-M-D');
		await this._editDays(id, nowDay, daysSet);
	}

	/** 清理三个月前的预约记录（懒删除） */
	async cleanupOldJoins() {
		const now = new Date();
		now.setMonth(now.getMonth() - 3);
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const cutoffDate = `${year}-${month}-${day}`;

		// 云数据库 where.remove 每次最多删20条，循环删除
		let totalRemoved = 0;
		let removed;
		do {
			removed = await JoinModel.del({
				JOIN_MEET_DAY: ['<', cutoffDate]
			});
			totalRemoved += removed;
		} while (removed > 0);

		if (totalRemoved > 0) {
			console.log(`[cleanupOldJoins] 清理了 ${totalRemoved} 条三个月前的预约记录 (cutoff: ${cutoffDate})`);
		}
	}

	/**预约名单分页列表 */
	async getJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		meetId,
		mark,
		status,
		isCheckin,
		expired, // 过期筛选：1=已过期, 0=未过期
		userId, // 按用户筛选
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		// 懒删除：清理三个月前的记录
		await this.cleanupOldJoins();

		orderBy = orderBy || {
			'JOIN_EDIT_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_CODE,JOIN_ID,JOIN_REASON,JOIN_USER_ID,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_EDIT_TIME,JOIN_CHECKIN_TIME,JOIN_USER_NAME,JOIN_USER_MOBILE,JOIN_SOURCE,JOIN_CARD_DEDUCT,JOIN_INSTRUCTOR_NAME';

		let where = {};
		if (meetId) where.JOIN_MEET_ID = meetId;
		if (mark) where.JOIN_MEET_TIME_MARK = mark;
		if (userId) where.JOIN_USER_ID = userId;

		if (util.isDefined(search) && search) {
			where['JOIN_FORMS.val'] = {
				$regex: '.*' + search,
				$options: 'i'
			};
		}

		// 状态筛选
		if (util.isDefined(status)) {
			let s = Number(status);
			if (s == 1099) //取消的2种
				where.JOIN_STATUS = ['in', [10, 99]]
			else
				where.JOIN_STATUS = s;
		}

		// 签到筛选
		if (util.isDefined(isCheckin)) {
			// 签到筛选通常隐含只看成功的预约？或者看需求。
			// 这里假设看全部状态下的签到情况，或者前端已经组合了 status=1
			if (Number(isCheckin) == 1) {
				where.JOIN_IS_CHECKIN = 1;
			} else {
				where.JOIN_IS_CHECKIN = 0;
			}
		}

		// 过期筛选
		if (util.isDefined(expired)) {
			let today = timeUtil.time('Y-M-D');
			if (Number(expired) == 1) {
				// 已过期：预约日期小于今天
				where.JOIN_MEET_DAY = ['<', today];
			} else if (Number(expired) == 0) {
				// 未过期：预约日期大于等于今天
				where.JOIN_MEET_DAY = ['>=', today];
			}
		}

		// sortType 逻辑：前端筛选菜单通过 sortType/sortVal 传参
		if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'status':
					if (!util.isDefined(status)) {
						let s = Number(sortVal);
						if (s == 1099)
							where.JOIN_STATUS = ['in', [10, 99]]
						else
							where.JOIN_STATUS = s;
					}
					break;
				case 'isCheckin':
				case 'checkin':
					if (!util.isDefined(isCheckin)) {
						where.JOIN_STATUS = JoinModel.STATUS.SUCC;
						if (sortVal == 1) {
							where.JOIN_IS_CHECKIN = 1;
						} else {
							where.JOIN_IS_CHECKIN = 0;
						}
					}
					break;
				case 'expired':
					if (!util.isDefined(expired)) {
						let today = timeUtil.time('Y-M-D');
						if (Number(sortVal) == 1) {
							where.JOIN_MEET_DAY = ['<', today];
						} else if (Number(sortVal) == 0) {
							where.JOIN_MEET_DAY = ['>=', today];
						}
					}
					break;
			}
		}

		return await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**预约项目分页列表 */
	async getMeetList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_TYPE,MEET_TYPE_NAME,MEET_TITLE,MEET_STATUS,MEET_DAYS,MEET_ADD_TIME,MEET_EDIT_TIME,MEET_ORDER';

		let where = {};
		let today = timeUtil.time('Y-M-D');

		if (util.isDefined(search) && search) {
			where.MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.MEET_STATUS = Number(sortVal);
					break;
				case 'typeId':
					// 按类型
					where.MEET_TYPE_ID = sortVal;
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}
					break;
				case 'expired':
					// 过期筛选在 controller 层基于 leaveDay 处理
					// 因为 MEET_DAYS 是数组，简单比较运算符无法正确筛选
					// 这里标记需要过期筛选，controller 会处理
					break;
			}
		}

		return await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除 */
	async delJoin(joinId) {
		await JoinModel.del(joinId);
		
		// 更新统计数据
		let join = await JoinModel.getOne({ _id: joinId });
		if (join) {
			let meetService = new MeetService();
			meetService.statJoinCnt(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
		}
	}

	/**修改报名状态 
	 * 特殊约定 99=>正常取消 
	 */
	async statusJoin(admin, joinId, status, reason = '') {
		// 如果是取消操作，先获取预约信息用于返还卡项
		let join = null;
		if (status === JoinModel.STATUS.ADMIN_CANCEL) {
			join = await JoinModel.getOne({ _id: joinId });
			if (join) {
				// 返还卡项
				let meetService = new MeetService();
				try {
					await meetService._refundCard(join, 'admin');
				} catch (err) {
					console.error('返还卡项失败:', joinId, err);
					// 即使返还失败也继续取消操作
				}
			}
		}

		let data = {
			JOIN_STATUS: status,
			JOIN_EDIT_ADMIN_ID: admin.ADMIN_ID,
			JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
			JOIN_EDIT_ADMIN_STATUS: status
		};

		if (reason) {
			data.JOIN_REASON = reason;
		}

		await JoinModel.edit(joinId, data);

		// 更新统计数据
		if (!join) {
			join = await JoinModel.getOne({ _id: joinId });
		}
		if (join) {
			let meetService = new MeetService();
			meetService.statJoinCnt(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
		}
	}

	/** 获取预约详情（全量字段） */
	async getJoinDetail(joinId) {
		let join = await JoinModel.getOne({ _id: joinId });
		if (!join) return null;
		return join;
	}

	/**修改项目状态 */
	async statusMeet(id, status) {
		await MeetModel.edit(id, {
			MEET_STATUS: status
		});
	}

	/**置顶排序设定 */
	async sortMeet(id, sort) {
		await MeetModel.edit(id, {
			MEET_ORDER: sort
		});
	}

	/** 补录预约（管理员为用户补录过去的预约并扣卡） */
	async backfillJoin(meetId, timeMark, userId, cardId, adminId, adminName) {
		// 1. 获取课程信息
		let meet = await MeetModel.getOne({ _id: meetId });
		if (!meet) this.AppError('课程不存在');

		// 2. 解析时段信息
		let meetService = new MeetService();
		let day = meetService.getDayByTimeMark(timeMark);

		// 加载 MEET_DAYS_SET（从 DayModel）以获取时段详情
		try {
			meet.MEET_DAYS_SET = await meetService.getDaysSet(meetId, day, day);
		} catch (e) {
			meet.MEET_DAYS_SET = [];
		}
		let daySet = meetService.getDaySetByTimeMark(meet, timeMark);
		let timeSet = daySet ? meetService.getTimeSetByTimeMark(meet, timeMark) : null;

		// 如果时段信息获取不到（历史数据可能已不在 DayModel），用 timeMark 解析的日期
		let timeStart = timeSet ? timeSet.start : '00:00';
		let timeEnd = timeSet ? timeSet.end : '00:00';

		// 3. 获取用户信息
		let user = await UserModel.getOne({ _id: userId });
		if (!user) {
			// 尝试用 USER_MINI_OPENID 查找
			user = await UserModel.getOne({ USER_MINI_OPENID: userId });
		}
		if (!user) this.AppError('用户不存在');

		let effectiveUserId = user.USER_MINI_OPENID || user.USER_ID || user._id;

		// 4. 构建预约记录
		let data = {
			JOIN_USER_ID: effectiveUserId,
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TITLE: meet.MEET_TITLE || '',
			JOIN_MEET_DAY: day,
			JOIN_MEET_TIME_START: timeStart,
			JOIN_MEET_TIME_END: timeEnd,
			JOIN_MEET_TIME_MARK: timeMark,

			JOIN_INSTRUCTOR_ID: meet.MEET_INSTRUCTOR_ID || '',
			JOIN_INSTRUCTOR_NAME: meet.MEET_INSTRUCTOR_NAME || '',

			JOIN_START_TIME: timeUtil.time2Timestamp(day + ' ' + timeStart + ':00'),

			JOIN_FORMS: [],
			JOIN_SOURCE: 'backfill',

			JOIN_USER_NAME: user.USER_NAME || '',
			JOIN_USER_MOBILE: user.USER_MOBILE || '',

			JOIN_STATUS: JoinModel.STATUS.SUCC,
			JOIN_CODE: dataUtil.genRandomIntString(15),

			JOIN_EDIT_ADMIN_ID: adminId,
			JOIN_EDIT_ADMIN_NAME: adminName,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
		};

		// 5. 卡项扣费处理（如果指定了 cardId）
		if (cardId) {
			let userCard = await UserCardModel.getOne({
				_id: cardId,
				USER_CARD_USER_ID: effectiveUserId,
				USER_CARD_STATUS: UserCardModel.STATUS.IN_USE
			});

			if (!userCard) this.AppError('卡项不存在或已失效');

			if (UserCardModel.isExpired(userCard.USER_CARD_EXPIRE_TIME)) {
				this.AppError('该卡项已过期');
			}

			let costSet = meet.MEET_COST_SET || {};
			let deductAmount = 0;
			let deductType = '';
			let cardData = {};

			if (userCard.USER_CARD_TYPE === UserCardModel.TYPE.TIMES) {
				deductAmount = (costSet.timesCost) ? costSet.timesCost : 1;
				deductType = 'times';
				let remainTimes = userCard.USER_CARD_REMAIN_TIMES || 0;
				if (remainTimes < deductAmount) this.AppError('卡项次数不足');
				cardData.USER_CARD_REMAIN_TIMES = remainTimes - deductAmount;
				cardData.USER_CARD_USED_TIMES = (userCard.USER_CARD_USED_TIMES || 0) + deductAmount;
				if (cardData.USER_CARD_REMAIN_TIMES <= 0) {
					cardData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
				}
			} else if (userCard.USER_CARD_TYPE === UserCardModel.TYPE.BALANCE) {
				deductAmount = (costSet.balanceCost) ? costSet.balanceCost : 0;
				deductType = 'amount';
				let remainAmount = userCard.USER_CARD_REMAIN_AMOUNT || 0;
				if (deductAmount > 0 && remainAmount < deductAmount) this.AppError('卡项余额不足');
				cardData.USER_CARD_REMAIN_AMOUNT = remainAmount - deductAmount;
				cardData.USER_CARD_USED_AMOUNT = (userCard.USER_CARD_USED_AMOUNT || 0) + deductAmount;
				if (cardData.USER_CARD_REMAIN_AMOUNT <= 0) {
					cardData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
				}
			}

			// 扣卡
			await UserCardModel.edit(cardId, cardData);

			// 消费记录
			let beforeTimes = userCard.USER_CARD_REMAIN_TIMES || 0;
			let beforeAmount = userCard.USER_CARD_REMAIN_AMOUNT || 0;
			let afterTimes = cardData.USER_CARD_REMAIN_TIMES !== undefined ? cardData.USER_CARD_REMAIN_TIMES : beforeTimes;
			let afterAmount = cardData.USER_CARD_REMAIN_AMOUNT !== undefined ? cardData.USER_CARD_REMAIN_AMOUNT : beforeAmount;

			await CardRecordModel.insert({
				RECORD_USER_CARD_ID: cardId,
				RECORD_USER_ID: effectiveUserId,
				RECORD_TYPE: CardRecordModel.TYPE.CONSUME,
				RECORD_CHANGE_TIMES: deductType === 'times' ? -deductAmount : 0,
				RECORD_CHANGE_AMOUNT: deductType === 'amount' ? -deductAmount : 0,
				RECORD_BEFORE_TIMES: beforeTimes,
				RECORD_AFTER_TIMES: afterTimes,
				RECORD_BEFORE_AMOUNT: beforeAmount,
				RECORD_AFTER_AMOUNT: afterAmount,
				RECORD_REASON: '补录消费 - ' + meet.MEET_TITLE,
				RECORD_RELATED_ID: ''
			});

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
		}

		// 6. 插入预约记录
		let joinId = await JoinModel.insert(data);

		// 7. 更新时段统计（如果时段还在 MEET_DAYS_SET 中）
		if (timeSet) {
			await meetService.statJoinCnt(meetId, timeMark);
		}

		return { joinId };
	}
}

module.exports = AdminMeetService;