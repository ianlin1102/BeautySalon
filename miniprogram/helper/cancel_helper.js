/**
 * Notes: 预约取消相关辅助函数
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-01-04
 */

const timeHelper = require('./time_helper.js');

/**
 * 检查是否允许取消预约
 * @param {Object} cancelSet - 取消限制设置 { isLimit, days, hours, minutes }
 * @param {String} meetDay - 预约日期 YYYY-MM-DD
 * @param {String} meetTimeStart - 预约开始时间 HH:mm
 * @returns {Object} { canCancel: boolean, reason: string }
 */
function checkCanCancel(cancelSet, meetDay, meetTimeStart) {
	if (!cancelSet || !cancelSet.isLimit) {
		return { canCancel: true, reason: '' };
	}

	// 检查是否设置为不能取消
	if (cancelSet.days === -1) {
		return {
			canCancel: false,
			reason: '该预约不允许取消'
		};
	}

	// 计算限制时间
	let now = timeHelper.time('timestamp');
	let startTime = timeHelper.time2Timestamp(meetDay + ' ' + meetTimeStart + ':00');

	// 计算取消限制时间(毫秒)
	let limitSeconds = 0;
	if (cancelSet.days) limitSeconds += cancelSet.days * 24 * 3600;
	if (cancelSet.hours) limitSeconds += cancelSet.hours * 3600;
	if (cancelSet.minutes) limitSeconds += cancelSet.minutes * 60;

	let limitTime = startTime - limitSeconds * 1000;

	if (now >= limitTime) {
		let limitDesc = '';
		if (cancelSet.days > 0) limitDesc += cancelSet.days + '天';
		if (cancelSet.hours > 0) limitDesc += cancelSet.hours + '小时';
		if (cancelSet.minutes > 0) limitDesc += cancelSet.minutes + '分钟';

		return {
			canCancel: false,
			reason: '需在开始前' + limitDesc + '取消，现已超过限制时间'
		};
	}

	return { canCancel: true, reason: '' };
}

/**
 * 获取取消规则的描述文本
 * @param {Object} cancelSet - 取消限制设置 { isLimit, days, hours, minutes }
 * @returns {String} 取消规则描述
 */
function getCancelRuleDesc(cancelSet) {
	if (!cancelSet || !cancelSet.isLimit) {
		return '预约成功后可随时取消';
	}

	// 完全不允许取消
	if (cancelSet.days === -1) {
		return '若预约成功则不可取消预约！';
	}

	// 有时间限制
	let limitDesc = '';
	if (cancelSet.days > 0) limitDesc += cancelSet.days + '天';
	if (cancelSet.hours > 0) limitDesc += cancelSet.hours + '小时';
	if (cancelSet.minutes > 0) limitDesc += cancelSet.minutes + '分钟';

	return '预约成功后，需在预约时间开始前' + limitDesc + '取消，否则无法取消预约';
}

module.exports = {
	checkCanCancel,
	getCancelRuleDesc
}
