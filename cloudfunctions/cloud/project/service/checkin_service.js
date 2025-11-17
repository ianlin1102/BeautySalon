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
const config = require('../../config/config.js');

class CheckinService extends BaseService {

	constructor() {
		super();
	}

	/**
	 * 获取核销排行榜
	 * @param {string} type - 榜单类型：'all'=总榜, 'month'=月榜(最近30天)
	 * @param {number} limit - 返回数量限制，默认10
	 * @returns {object} 排行榜数据
	 */
	async getRankList(type = 'all', limit = 10) {
		// 1. 检查缓存
		const cacheKey = type === 'all' ? 'CHECKIN_RANK_ALL' : 'CHECKIN_RANK_MONTH';
		const cacheTime = type === 'all' ? 60 * 60 * 24 : 60 * 60; // 总榜24小时，月榜1小时

		if (config.IS_CACHE) {
			let cachedData = await cacheUtil.get(cacheKey, null);
			if (cachedData) {
				return cachedData;
			}
		}

		// 2. 从数据库统计
		let rankData = await this._calculateRank(type, limit);

		// 3. 保存到缓存
		if (config.IS_CACHE) {
			await cacheUtil.set(cacheKey, rankData, cacheTime);
		}

		return rankData;
	}

	/**
	 * 计算排行榜（内部方法）
	 * @param {string} type
	 * @param {number} limit
	 */
	async _calculateRank(type, limit) {
		// 1. 构建查询条件
		let where = {
			JOIN_IS_CHECKIN: 1,      // 已签到
			JOIN_STATUS: JoinModel.STATUS.SUCC  // 预约成功状态
		};

		// 2. 月榜添加时间过滤（最近30天）
		if (type === 'month') {
			const thirtyDaysAgo = timeUtil.time('Y-M-D h:m:s', timeUtil.time() - 30 * 24 * 60 * 60 * 1000);
			where.JOIN_ADD_TIME = {
				$gte: thirtyDaysAgo
			};
		}

		// 3. 按用户ID分组统计核销次数
		let groupResult = await JoinModel.groupCount(where, 'JOIN_USER_ID');

		// 4. 检查groupResult是否为null
		if (!groupResult) {
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

		// 5. 按核销次数降序排序
		rankArray.sort((a, b) => b.checkinCount - a.checkinCount);

		// 6. 限制数量（前10名或所有非0）
		let limitedArray = rankArray.slice(0, Math.min(limit, rankArray.length));

		// 7. 获取用户详细信息
		let rankList = await this._fillUserInfo(limitedArray);

		// 8. 添加排名
		for (let i = 0; i < rankList.length; i++) {
			rankList[i].rank = i + 1;
		}

		// 9. 返回数据
		return {
			type: type,
			updateTime: timeUtil.time(),
			list: rankList,
			total: rankList.length
		};
	}

	/**
	 * 填充用户信息（内部方法）
	 * @param {array} rankArray - [{userId, checkinCount}]
	 */
	async _fillUserInfo(rankArray) {
		let result = [];

		for (let item of rankArray) {
			// 查询用户信息 - 先尝试USER_MINI_OPENID（微信openid）
			let user = await UserModel.getOne(
				{ USER_MINI_OPENID: item.userId },
				'USER_NAME,USER_ID,USER_MINI_OPENID'
			);

			// 如果没找到，再尝试USER_ID
			if (!user) {
				user = await UserModel.getOne(
					{ USER_ID: item.userId },
					'USER_NAME,USER_ID,USER_MINI_OPENID'
				);
			}

			if (user) {
				result.push({
					userId: item.userId,
					userName: user.USER_NAME || '未设置姓名',
					checkinCount: item.checkinCount,
					rank: 0 // 在外层添加
				});
			}
		}

		return result;
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
