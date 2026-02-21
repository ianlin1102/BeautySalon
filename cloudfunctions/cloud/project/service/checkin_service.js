/**
 * Notes: 核销排行榜业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-01-13 10:00:00
 */

const BaseService = require('./base_service.js');
const JoinModel = require('../model/join_model.js');
const UserModel = require('../model/user_model.js');
const timeUtil = require('../../framework/utils/time_util.js');
const cacheUtil = require('../../framework/utils/cache_util.js');
const cloudUtil = require('../../framework/cloud/cloud_util.js');
const config = require('../../config/config.js');

class CheckinService extends BaseService {

	constructor() {
		super();
	}

	/**
	 * 获取核销排行榜
	 * @param {string} type - 榜单类型：'all'=总榜(近6个月), 'month'=月榜(最近30天)
	 * @param {number} limit - 返回数量限制，默认10
	 * @returns {object} 排行榜数据
	 */
	async getRankList(type = 'all', limit = 10) {
		try {
			console.log('【排行榜】getRankList 被调用, type:', type, 'limit:', limit);

			// 1. 检查缓存
			const cacheKey = type === 'all' ? 'CHECKIN_RANK_ALL' : 'CHECKIN_RANK_MONTH';
			const cacheTime = type === 'all' ? 60 * 60 * 24 : 60 * 60; // 总榜24小时，月榜1小时

			if (config.IS_CACHE) {
				let cachedData = await cacheUtil.get(cacheKey, null);
				if (cachedData) {
					console.log('【排行榜】返回缓存数据');
					return cachedData;
				}
			}

			console.log('【排行榜】缓存未命中，开始计算');

			// 2. 从数据库统计
			let rankData = await this._calculateRank(type, limit);

			console.log('【排行榜】计算完成，结果数量:', rankData.list ? rankData.list.length : 0);

			// 3. 保存到缓存
			if (config.IS_CACHE) {
				await cacheUtil.set(cacheKey, rankData, cacheTime);
			}

			return rankData;
		} catch (error) {
			console.error('【排行榜】getRankList 异常:', error.message);
			console.error('【排行榜】错误堆栈:', error.stack);
			// 返回空数据而不是抛出异常
			return {
				type: type,
				updateTime: require('../../framework/utils/time_util.js').time(),
				list: [],
				total: 0
			};
		}
	}

	/**
	 * 计算排行榜（内部方法）
	 * @param {string} type
	 * @param {number} limit
	 */
	async _calculateRank(type, limit) {
		try {
			console.log('【排行榜】开始计算排行榜, type:', type, 'limit:', limit);

			// 1. 构建查询条件
			let where = {
				JOIN_IS_CHECKIN: 1,      // 已签到
				JOIN_STATUS: JoinModel.STATUS.SUCC  // 预约成功状态
			};

			// 2. 时间过滤（JOIN_ADD_TIME 存储为毫秒时间戳，用数字比较）
			if (type === 'month') {
				// 月榜：最近30天
				const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
				where.JOIN_ADD_TIME = {
					$gte: thirtyDaysAgo
				};
			} else if (type === 'all') {
				// 总榜：最近6个月
				const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
				where.JOIN_ADD_TIME = {
					$gte: sixMonthsAgo
				};
			}

			console.log('【排行榜】查询条件:', JSON.stringify(where));

			// 3. 按用户ID分组统计核销次数
			let groupResult = await JoinModel.groupCount(where, 'JOIN_USER_ID');

			console.log('【排行榜】groupCount 结果:', groupResult ? JSON.stringify(Object.keys(groupResult)) : 'null');

			// 4. 检查groupResult是否为null或空
			if (!groupResult || Object.keys(groupResult).length === 0) {
				console.log('【排行榜】无签到数据，返回空列表');
				return {
					type: type,
					updateTime: timeUtil.time(),
					list: [],
					total: 0
				};
			}

			// 5. 转换为数组格式并排序
			let rankArray = [];
			for (let key in groupResult) {
				// key格式: 'JOIN_USER_ID_xxxx'
				let userId = key.replace('JOIN_USER_ID_', '');
				let count = groupResult[key];

				// 只统计核销次数大于0的用户
				if (count > 0) {
					rankArray.push({
						userId: userId,
						checkinCount: count
					});
				}
			}

			// 6. 按核销次数降序排序
			rankArray.sort((a, b) => b.checkinCount - a.checkinCount);

			// 7. 限制数量（前10名或所有非0）
			let limitedArray = rankArray.slice(0, Math.min(limit, rankArray.length));

			// 8. 获取用户详细信息
			let rankList = await this._fillUserInfo(limitedArray);

			// 9. 添加排名
			for (let i = 0; i < rankList.length; i++) {
				rankList[i].rank = i + 1;
			}

			// 10. 返回数据
			return {
				type: type,
				updateTime: timeUtil.time(),
				list: rankList,
				total: rankList.length
			};
		} catch (error) {
			console.error('【排行榜】查询异常:', error.message);
			console.error('【排行榜】错误堆栈:', error.stack);
			return {
				type: type,
				updateTime: timeUtil.time(),
				list: [],
				total: 0
			};
		}
	}

	/**
	 * 填充用户信息（内部方法）
	 * @param {array} rankArray - [{userId, checkinCount}]
	 */
	async _fillUserInfo(rankArray) {
		let result = [];

		console.log('【排行榜】开始填充用户信息，待处理数量:', rankArray.length);

		for (let item of rankArray) {
			try {
				// 查询用户信息 - 先尝试USER_MINI_OPENID（微信openid）
				let user = await UserModel.getOne(
					{ USER_MINI_OPENID: item.userId },
					'USER_NAME,USER_ID,USER_MINI_OPENID,USER_AVATAR'
				);

				// 如果没找到，再尝试USER_ID
				if (!user) {
					user = await UserModel.getOne(
						{ USER_ID: item.userId },
						'USER_NAME,USER_ID,USER_MINI_OPENID,USER_AVATAR'
					);
				}

				if (user) {
					// 转换 cloud:// 头像为临时 HTTPS URL
					let avatar = user.USER_AVATAR || '';
					if (avatar && avatar.startsWith('cloud://')) {
						try {
							let tempUrl = await cloudUtil.getTempFileURLOne(avatar);
							if (tempUrl) avatar = tempUrl;
						} catch (e) { }
					}
					result.push({
						userId: item.userId,
						userName: user.USER_NAME || '未设置姓名',
						userAvatar: avatar,
						checkinCount: item.checkinCount,
						rank: 0 // 在外层添加
					});
				} else {
					console.warn('【排行榜】未找到用户信息, userId:', item.userId);
				}
			} catch (error) {
				console.error('【排行榜】查询用户信息失败, userId:', item.userId, 'error:', error.message);
			}
		}

		console.log('【排行榜】用户信息填充完成，成功数量:', result.length);
		return result;
	}

	/**
	 * 获取用户签到统计
	 * @param {string} userId - 用户ID
	 * @returns {object} { monthCount, totalCount }
	 */
	async getUserCheckinStats(userId) {
		try {
			// 30天签到次数（JOIN_ADD_TIME 存储为毫秒时间戳，用数字比较）
			const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
			let where30 = {
				JOIN_USER_ID: userId,
				JOIN_IS_CHECKIN: 1,
				JOIN_STATUS: JoinModel.STATUS.SUCC,
				JOIN_ADD_TIME: { $gte: thirtyDaysAgo }
			};
			let count30 = await JoinModel.count(where30);

			// 6个月（总榜范围）签到次数
			const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
			let whereAll = {
				JOIN_USER_ID: userId,
				JOIN_IS_CHECKIN: 1,
				JOIN_STATUS: JoinModel.STATUS.SUCC,
				JOIN_ADD_TIME: { $gte: sixMonthsAgo }
			};
			let countAll = await JoinModel.count(whereAll);

			// 获取用户信息（用于"我的排名"行显示）
			let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME,USER_AVATAR');
			if (!user) user = await UserModel.getOne({ USER_ID: userId }, 'USER_NAME,USER_AVATAR');

			// 转换 cloud:// 头像为临时 HTTPS URL
			let avatar = user ? (user.USER_AVATAR || '') : '';
			if (avatar && avatar.startsWith('cloud://')) {
				try {
					let tempUrl = await cloudUtil.getTempFileURLOne(avatar);
					if (tempUrl) avatar = tempUrl;
				} catch (e) { }
			}

			return {
				monthCount: count30,
				totalCount: countAll,
				userName: user ? (user.USER_NAME || '') : '',
				userAvatar: avatar
			};
		} catch (error) {
			console.error('【排行榜】getUserCheckinStats 异常:', error.message);
			return { monthCount: 0, totalCount: 0, userName: '', userAvatar: '' };
		}
	}

	/**
	 * 清除排行榜缓存（供管理员或定时任务调用）
	 */
	async clearRankCache() {
		await cacheUtil.remove('CHECKIN_RANK_ALL');
		await cacheUtil.remove('CHECKIN_RANK_MONTH');
		return true;
	}

	/**
	 * 刷新排行榜缓存（供定时任务调用）
	 */
	async refreshRankCache() {
		// 清除旧缓存
		await this.clearRankCache();

		// 重新计算并缓存
		await this.getRankList('all', 10);
		await this.getRankList('month', 10);

		return true;
	}
}

module.exports = CheckinService;
