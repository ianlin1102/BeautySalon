/**
 * Notes: 时间相关函数
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-09-05 04:00:00 
 */

const util = require('./helper.js');


/** 日期简化，去掉多余的前缀0 */
function simpleDate(date) {
	let arr = date.split('-');
	if (arr.length < 3) return date;
	let month = arr[1];
	if (month.indexOf('0') == 0)
		month = month.replace('0', '');

	let day = arr[2];
	if (day.indexOf('0') == 0)
		day = day.replace('0', '');

	return arr[0] + '-' + month + '-' + day;
}

/** 时间格式化为年月日点分 */
function fmtDateCHN(date, fmt = 'Y-M-D') {
	if (!date) return '';
	if (fmt == 'hh:mm' && date.includes(':')) {
		if (date.includes(' ')) date = date.split(' ')[1];
		let arr = date.split(':');
		return Number(arr[0]) + '点' + arr[1] + '分';
	} else if (fmt == 'Y-M-D hh:mm') {
		let arr = date.split(' ');
		if (arr.length != 2) return date;
		return fmtDateCHN(arr[0], 'Y-M-D') + fmtDateCHN(arr[1], 'hh:mm');
	} else if (fmt == 'M-D hh:mm') {
		let arr = date.split(' ');
		if (arr.length != 2) return date;
		return fmtDateCHN(arr[0], 'M-D') + ' ' + fmtDateCHN(arr[1], 'hh:mm');
	} else {
		if (date.includes(' ')) date = date.split(' ')[0];

	let arr = date.split('-');
	if (fmt == 'Y-M') //年月
			return arr[0] + '年' + Number(arr[1]) + '月';
	else if (fmt == 'M-D') //月日
			return arr[1] + '月' + Number(arr[2]) + '日';
	else if (fmt == 'Y') //年
		return arr[0] + '年';
	else
			return arr[0] + '年' +Number(arr[1]) + '月' + Number(arr[2]) + '日';
	}


}

/**
 * 毫秒时间戳转时间格式
 * @param {*} unixtime  毫秒
 * @param {*} format  Y-M-D h:m:s
 * @param {*} diff  时区差异 毫秒
 */
function timestamp2Time(unixtime, format = 'Y-M-D h:m:s', diff = 0) {
	let formateArr = ['Y', 'M', 'D', 'h', 'm', 's'];
	let returnArr = [];
	let date = new Date(unixtime + diff);
	returnArr.push(date.getFullYear());
	returnArr.push(formatNumber(date.getMonth() + 1));
	returnArr.push(formatNumber(date.getDate()));
	returnArr.push(formatNumber(date.getHours()));
	returnArr.push(formatNumber(date.getMinutes()));
	returnArr.push(formatNumber(date.getSeconds()));
	for (let i in returnArr) {
		format = format.replace(formateArr[i], returnArr[i]);
	}
	return format;
}


function timestame2Ago(dateTimeStamp, fmt = 'Y-M-D', diff = 0) { //dateTimeStamp是一个时间毫秒，注意时间戳是秒的形式，在这个毫秒的基础上除以1000，就是十位数的时间戳。13位数的都是时间毫秒。
	let minute = 1000 * 60; //把分，时，天，周，半个月，一个月用毫秒表示
	let hour = minute * 60;
	let day = hour * 24;
	let week = day * 7;
	let month = day * 30;
	let now = new Date().getTime(); //获取当前时间毫秒

	let diffValue = now - dateTimeStamp; //时间差

	if (diffValue < 0) {
		return;
	}
	let minC = diffValue / minute; //计算时间差的分，时，天，周，月
	let hourC = diffValue / hour;
	let dayC = diffValue / day;

	let result = '';

	let weekC = diffValue / week;
	let monthC = diffValue / month;
	if (monthC >= 1 && monthC <= 3) {
		result = ' ' + parseInt(monthC) + '月前'
	} else if (weekC >= 1 && weekC <= 3) {
		result = ' ' + parseInt(weekC) + '周前'
	} else if (dayC >= 1 && dayC <= 6) {
		result = ' ' + parseInt(dayC) + '天前'
	} else if (hourC >= 1 && hourC <= 23) {
		result = ' ' + parseInt(hourC) + '小时前'
	} else if (minC >= 1 && minC <= 59) {
		result = ' ' + parseInt(minC) + '分钟前'
	} else if (diffValue >= 0 && diffValue <= minute) {
		result = '刚刚'
	} else {
		result = timestamp2Time(dateTimeStamp, fmt, diff);

	}
	return result;
}

function formatNumber(n) {
	n = n.toString()
	return n[1] ? n : '0' + n
}


/**
 * 时间转时间戳 
 * @param {*} date  支持 Y-M-D h:m:s / Y-M-D
 */
function time2Timestamp(date) {
	if (date.length < 10) {
		let arr = date.split('-');
		if (arr[1].length == 1) arr[1] = '0' + arr[1];
		if (arr[2].length == 1) arr[2] = '0' + arr[2];
		date = arr[0] + '-' + arr[1] + '-' + arr[2];
	}
	if (date.length == 10) date = date + ' 00:00:00';
	let d = new Date(date.replace(/-/g, '/'));
	return d.getTime();
}

/**
 *  获取当前时间戳/时间Y-M-D h:m:s
 * @param {*} 时间格式 Y-M-D h:m:s
 * @param {int} 时间步长 (秒)
 */
function time(fmt, step = 0) {
	let t = 0;
	if (util.isDefined(fmt)) {
		let t = new Date().getTime() + step * 1000;
		return timestamp2Time(t, fmt);
	}
	return new Date().getTime() + t * 1000;
}

// 获取某天0点
function getDayFirstTimestamp(timestamp) {
	if (!timestamp) timestamp = time();
	return time2Timestamp(timestamp2Time(timestamp, 'Y-M-D'));
}

/**
 * 根据出生日期计算年龄周岁 传参格式为1996-06-08
 * @param {*} birth 
 */
function getAge(birth, isMonth = false) {
	var returnAge = '';
	var mouthAge = '';
	var arr = birth.split('-');
	var birthYear = arr[0];
	var birthMonth = arr[1];
	var birthDay = arr[2];
	var d = new Date();
	var nowYear = d.getFullYear();
	var nowMonth = d.getMonth() + 1;
	var nowDay = d.getDate();
	if (nowYear == birthYear) {
		// returnAge = 0; //同年 则为0岁
		var monthDiff = nowMonth - birthMonth; //月之差 
		if (monthDiff < 0) {} else {
			mouthAge = monthDiff + '个月';
		}
	} else {
		var ageDiff = nowYear - birthYear; //年之差
		if (ageDiff > 0) {
			if (nowMonth == birthMonth) {
				var dayDiff = nowDay - birthDay; //日之差 
				if (dayDiff < 0) {
					returnAge = ageDiff - 1 + '岁';
				} else {
					returnAge = ageDiff + '岁';
				}
			} else {
				var monthDiff = nowMonth - birthMonth; //月之差 
				if (monthDiff < 0) {
					returnAge = ageDiff - 1 + '岁';
				} else {
					mouthAge = monthDiff + '个月';
					returnAge = ageDiff + '岁';
				}
			}
		} else {
			returnAge = -1; //返回-1 表示出生日期输入错误 晚于今天
		}
	}
	if (isMonth)
		return returnAge + mouthAge; //返回周岁年龄+月份
	else
		return returnAge;
}

/**
 * 日期计算周几
 * @param {*} day  日期为输入日期，格式为 2013-03-10
 */
function week(day) {
	let arys1 = new Array();
	arys1 = day.split('-');
	let ssdate = new Date(arys1[0], parseInt(arys1[1] - 1), arys1[2]);
	let week1 = String(ssdate.getDay()).replace("0", "日").replace("1", "一").replace("2", "二").replace("3", "三").replace("4", "四").replace("5", "五").replace("6", "六") //就是你要的星期几
	return "周" + week1; //就是你要的星期几 
}

/** 获取某天所在某月第一天时间戳 */
function getMonthFirstTimestamp(timestamp) {
	let inDate = new Date(timestamp);
	let year = inDate.getFullYear();
	let month = inDate.getMonth();
	return new Date(year, month, 1).getTime();
}

/** 获取某天所在某月最后一天时间戳 */
function getMonthLastTimestamp(timestamp) {
	let inDate = new Date(timestamp);
	let year = inDate.getFullYear();
	let month = inDate.getMonth();
	return new Date(year, month + 1, 1).getTime() - 1;
}

// 取得分钟时间戳
function getNowMinTimestamp() {
	let min = time('Y-M-D h:m') + ':00';
	let timestamp = time2Timestamp(min);
	return {
		min,
		timestamp
	}
}


// 获取当前日期所在周一 输入和返回格式=yyyy-mm-dd
function getFirstOfWeek(date) {
	let now = new Date(date);
	let nowTime = now.getTime();
	let day = now.getDay();
	if (day == 0) day = 7;
	let oneDayTime = 24 * 60 * 60 * 1000;
	let mondayTime = nowTime - (day - 1) * oneDayTime;
	return timestamp2Time(mondayTime, 'Y-M-D');
}

// 获取当前日期所在周一 输入和返回格式=yyyy-mm-dd
function getLastOfWeek(date) {
	let now = new Date(date);
	let nowTime = now.getTime();
	let day = now.getDay();
	if (day == 0) day = 7;
	let oneDayTime = 24 * 60 * 60 * 1000;
	let sundayTime = nowTime + (7 - day) * oneDayTime;
	return timestamp2Time(sundayTime, 'Y-M-D');
}

// 获取当前日期所在月第一天 输入和返回格式=yyyy-mm-dd
function getFirstOfMonth(date) {
	let arr = date.split('-');
	return arr[0] + '-' + arr[1] + '-01';
}

// 获取当前日期所在月最后一天 输入和返回格式=yyyy-mm-dd
function getLastOfMonth(date) {
	let now = new Date(date);
	let y = now.getFullYear();
	let m = now.getMonth();
	let lastDay = new Date(y, m + 1, 0).getTime();
	return timestamp2Time(lastDay, 'Y-M-D');
}

/**
 * 取倒计时（天时分秒） 支持时间戳或者Y-M-D/Y-M-D h:m:s
 * @param {*} datetimeTo 
 * @param {*} flag 1=正 -1=负
 */
function getTimeLeft(datetimeTo, flag = 1) {
	let time1 = datetimeTo;

	if (String(datetimeTo).includes('-')) {
		datetimeTo = String(datetimeTo);
		if (!datetimeTo.includes(':'))
			datetimeTo += ' 00:00:00';
		time1 = new Date(datetimeTo).getTime();
	}

	let time2 = new Date().getTime();
	let mss = time1 - time2;

	// 将时间差（毫秒）格式为：天时分秒
	let days = parseInt(mss / (1000 * 60 * 60 * 24));
	let hours = parseInt((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	let minutes = parseInt((mss % (1000 * 60 * 60)) / (1000 * 60));
	let seconds = parseInt((mss % (1000 * 60)) / 1000);

	if (mss < 0 && mss < -86400 * 1000) {
		(days != 0) ? days = -flag * days + "天": days = '';
		return days + "前";
	} else if (mss < 0) {
		return "今天";
	} else {
		(days != 0) ? days = flag * days + "天": days = '';
		(hours != 0) ? hours = flag * hours + "时": hours = '';
		(minutes != 0) ? minutes = flag * minutes + "分": minutes = '';
		return days + hours + minutes + flag * seconds + "秒"
	}

}

/**
 * 美国时区定义
 * 注意：这些偏移量会根据夏令时(DST)调整
 */
const US_TIMEZONES = {
	// 东部时区 (纽约, 亚特兰大, 迈阿密)
	'Eastern': {
		name: '美东时区',
		abbr: 'ET',
		standard: -5,  // EST (UTC-5)
		daylight: -4   // EDT (UTC-4)
	},
	// 中部时区 (芝加哥, 休斯顿, 达拉斯)
	'Central': {
		name: '美中时区',
		abbr: 'CT',
		standard: -6,  // CST (UTC-6)
		daylight: -5   // CDT (UTC-5)
	},
	// 山地时区 (丹佛, 凤凰城)
	'Mountain': {
		name: '美山时区',
		abbr: 'MT',
		standard: -7,  // MST (UTC-7)
		daylight: -6   // MDT (UTC-6)
	},
	// 太平洋时区 (洛杉矶, 西雅图, 旧金山)
	'Pacific': {
		name: '美西时区',
		abbr: 'PT',
		standard: -8,  // PST (UTC-8)
		daylight: -7   // PDT (UTC-7)
	}
};

/**
 * 判断某个日期是否处于夏令时
 * 美国夏令时：3月第二个星期日 至 11月第一个星期日
 * @param {Date} date - 日期对象
 * @returns {boolean} - 是否处于夏令时
 */
function isDST(date) {
	const year = date.getFullYear();

	// 3月第二个星期日 2:00 AM
	const dstStart = new Date(year, 2, 1); // 3月1日
	dstStart.setDate(1 + (7 - dstStart.getDay()) % 7 + 7); // 第二个星期日
	dstStart.setHours(2, 0, 0, 0);

	// 11月第一个星期日 2:00 AM
	const dstEnd = new Date(year, 10, 1); // 11月1日
	dstEnd.setDate(1 + (7 - dstEnd.getDay()) % 7); // 第一个星期日
	dstEnd.setHours(2, 0, 0, 0);

	return date >= dstStart && date < dstEnd;
}

/**
 * 获取时区偏移量(小时)
 * @param {string} timezone - 时区名称 ('Eastern', 'Central', 'Mountain', 'Pacific')
 * @param {Date} date - 日期对象，用于判断是否夏令时
 * @returns {number} - 相对于UTC的小时偏移量
 */
function getTimezoneOffset(timezone, date = new Date()) {
	const tz = US_TIMEZONES[timezone];
	if (!tz) return 0;

	return isDST(date) ? tz.daylight : tz.standard;
}

/**
 * 将时间戳转换到指定时区的时间字符串
 * @param {number} timestamp - 毫秒时间戳
 * @param {string} timezone - 时区名称 ('Eastern', 'Central', 'Mountain', 'Pacific')
 * @param {string} format - 时间格式，默认 'Y-M-D h:m:s'
 * @returns {string} - 格式化后的时间字符串
 */
function convertToTimezone(timestamp, timezone, format = 'Y-M-D h:m:s') {
	const date = new Date(timestamp);
	const offset = getTimezoneOffset(timezone, date);
	const offsetMs = offset * 60 * 60 * 1000; // 转换为毫秒

	return timestamp2Time(timestamp, format, offsetMs);
}

/**
 * 获取当前时间在指定时区的显示
 * @param {string} timezone - 时区名称 ('Eastern', 'Central', 'Mountain', 'Pacific')
 * @param {string} format - 时间格式，默认 'Y-M-D h:m:s'
 * @returns {string} - 格式化后的时间字符串
 */
function getCurrentTimeInTimezone(timezone, format = 'Y-M-D h:m:s') {
	return convertToTimezone(new Date().getTime(), timezone, format);
}

/**
 * 在不同时区之间转换时间
 * @param {string} timeStr - 时间字符串 (Y-M-D h:m:s 或 Y-M-D)
 * @param {string} fromTimezone - 源时区
 * @param {string} toTimezone - 目标时区
 * @param {string} format - 返回格式，默认 'Y-M-D h:m:s'
 * @returns {string} - 转换后的时间字符串
 */
function convertBetweenTimezones(timeStr, fromTimezone, toTimezone, format = 'Y-M-D h:m:s') {
	// 将时间字符串转为时间戳
	const timestamp = time2Timestamp(timeStr);
	const date = new Date(timestamp);

	// 获取源时区和目标时区的偏移量
	const fromOffset = getTimezoneOffset(fromTimezone, date);
	const toOffset = getTimezoneOffset(toTimezone, date);

	// 计算时区差异（小时）
	const hoursDiff = toOffset - fromOffset;
	const msDiff = hoursDiff * 60 * 60 * 1000;

	// 调整时间戳
	const adjustedTimestamp = timestamp + msDiff;

	return timestamp2Time(adjustedTimestamp, format);
}

/**
 * 获取所有时区的当前时间
 * @param {string} format - 时间格式，默认 'h:m:s'
 * @returns {Object} - 包含所有时区时间的对象
 */
function getAllTimezonesTime(format = 'h:m:s') {
	const now = new Date().getTime();
	const result = {};

	for (let tz in US_TIMEZONES) {
		const tzInfo = US_TIMEZONES[tz];
		result[tz] = {
			name: tzInfo.name,
			abbr: tzInfo.abbr,
			time: convertToTimezone(now, tz, format),
			isDST: isDST(new Date()),
			offset: getTimezoneOffset(tz)
		};
	}

	return result;
}

/**
 * 格式化时区显示（包含时区缩写）
 * @param {string} timeStr - 时间字符串
 * @param {string} timezone - 时区名称
 * @returns {string} - 带时区标识的时间字符串，如 "14:30 ET"
 */
function formatWithTimezone(timeStr, timezone) {
	const tzInfo = US_TIMEZONES[timezone];
	if (!tzInfo) return timeStr;

	return `${timeStr} ${tzInfo.abbr}`;
}


module.exports = {
	fmtDateCHN,
	simpleDate,

	getTimeLeft,

	getNowMinTimestamp,

	getMonthFirstTimestamp,
	getMonthLastTimestamp,

	getDayFirstTimestamp,

	timestamp2Time,
	timestame2Ago,
	time2Timestamp,
	time,
	getAge,
	week, //星期

	getFirstOfWeek,
	getLastOfWeek,
	getFirstOfMonth,
	getLastOfMonth,

	// 时区转换相关
	isDST,
	getTimezoneOffset,
	convertToTimezone,
	getCurrentTimeInTimezone,
	convertBetweenTimezones,
	getAllTimezonesTime,
	formatWithTimezone
}