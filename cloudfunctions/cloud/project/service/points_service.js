/**
 * 积分服务
 */
const BaseService = require('./base_service.js');
const UserPointsModel = require('../model/user_points_model.js');
const PointsLevelModel = require('../model/points_level_model.js');
const timeUtil = require('../../framework/utils/time_util.js');
const TimezoneUtil = require('../../framework/utils/timezone_util.js');

class PointsService extends BaseService {

    // 获取用户积分信息
    async getUserPointsInfo(userId) {
        console.log('开始获取用户积分信息，userId:', userId);
        
        // 获取总积分
        let totalPoints = await UserPointsModel.getUserTotalPoints(userId);
        console.log('查询到的总积分:', totalPoints);
        
        // 获取等级信息
        let currentLevel = PointsLevelModel.getLevelByPoints(totalPoints);
        let nextLevelInfo = PointsLevelModel.getNextLevelInfo(totalPoints);
        
        // 获取最近积分记录
        let recentHistory = await UserPointsModel.getUserPointsHistory(userId, 1, 5);
        console.log('查询到的积分记录:', recentHistory);
        
        let result = {
            totalPoints: totalPoints,
            currentLevel: currentLevel,
            nextLevel: nextLevelInfo.nextLevel,
            needPoints: nextLevelInfo.needPoints,
            progressPercent: nextLevelInfo.progressPercent,
            recentHistory: recentHistory.list || []
        };
        
        console.log('最终返回的积分信息:', result);
        return result;
    }

    // 获取用户积分历史记录
    async getUserPointsHistory(userId, page = 1, size = 20) {
        let result = await UserPointsModel.getUserPointsHistory(userId, page, size);
        
        // 格式化记录
        if (result.list) {
            for (let record of result.list) {
                record.actionDesc = UserPointsModel.getActionDesc(record.POINTS_ACTION_TYPE);
                record.addTimeDesc = timeUtil.timestamp2Time(record.POINTS_ADD_TIME, 'Y-M-D h:m');
                record.amountDesc = record.POINTS_AMOUNT > 0 ? `+${record.POINTS_AMOUNT}` : record.POINTS_AMOUNT;
            }
        }
        
        return result;
    }

    // 给用户添加积分
    async addPointsToUser(userId, amount, actionType, description = '', relatedId = '') {
        if (amount === 0) return false;
        
        // 使用时区工具获取芝加哥时间（用于显示）
        const chicagoTime = TimezoneUtil.getChicagoTime();
        const systemTime = new Date(); // 系统时间（用于数据库）
        
        console.log(`积分记录 - 系统时间: ${systemTime.toString()}, 芝加哥显示时间: ${chicagoTime.formatted}`);
        
        let pointsData = {
            POINTS_USER_ID: userId,
            POINTS_AMOUNT: amount,
            POINTS_ACTION_TYPE: actionType,
            POINTS_DESCRIPTION: description,
            POINTS_RELATED_ID: relatedId
            // 移除DEBUG_TIME_INFO，使用标准时间戳
        };
        
        let result = await UserPointsModel.insert(pointsData);
        
        // 记录日志（显示芝加哥时间）
        console.log(`用户 ${userId} ${amount > 0 ? '获得' : '消费'} ${Math.abs(amount)} 积分，原因：${description}，芝加哥时间：${chicagoTime.formatted}`);
        
        return result;
    }

    // 预约成功获得积分
    async earnPointsForBooking(userId, meetId) {
        let points = 10; // 预约成功获得10积分
        return await this.addPointsToUser(
            userId, 
            points, 
            UserPointsModel.ACTION_TYPE.EARN_BOOKING, 
            '预约服务获得积分', 
            meetId
        );
    }

    // 签到获得积分
    async earnPointsForCheckin(userId, joinId) {
        let points = 20; // 签到获得20积分
        return await this.addPointsToUser(
            userId, 
            points, 
            UserPointsModel.ACTION_TYPE.EARN_CHECKIN, 
            '服务签到获得积分', 
            joinId
        );
    }

    // 管理员调整积分
    async adminAdjustPoints(userId, amount, reason, adminId) {
        return await this.addPointsToUser(
            userId, 
            amount, 
            UserPointsModel.ACTION_TYPE.ADMIN_ADJUST, 
            `管理员调整：${reason}`, 
            adminId
        );
    }
}

module.exports = PointsService;