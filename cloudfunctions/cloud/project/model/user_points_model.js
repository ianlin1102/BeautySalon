/**
 * 用户积分模型
 */
const BaseModel = require('./base_model.js');

class UserPointsModel extends BaseModel {

}

// 集合名
UserPointsModel.CL = 'ax_user_points';
UserPointsModel.FIELD_PREFIX = 'POINTS_';
UserPointsModel.ADD_TIME = true;
UserPointsModel.UPDATE_TIME = true;

// 数据结构定义
UserPointsModel.DB_STRUCTURE = {
    _pid: 'string|true',
    POINTS_ID: 'string|true',
    POINTS_USER_ID: 'string|true|comment=用户ID',
    POINTS_ACTION_TYPE: 'int|true|comment=积分操作类型',
    POINTS_AMOUNT: 'int|true|comment=积分数量',
    POINTS_DESCRIPTION: 'string|true|comment=积分描述',
    POINTS_RELATED_ID: 'string|false|comment=关联ID',
    
    POINTS_ADD_TIME: 'int|true',
    POINTS_EDIT_TIME: 'int|true',
    POINTS_ADD_IP: 'string|false',
    POINTS_EDIT_IP: 'string|false'
};

// 积分操作类型
UserPointsModel.ACTION_TYPE = {
        EARN_BOOKING: 1,      // 预约获得积分
        EARN_CHECKIN: 2,      // 签到获得积分
        EARN_REVIEW: 3,       // 评价获得积分
        EARN_SHARE: 4,        // 分享获得积分
        CONSUME_DISCOUNT: 5,  // 积分抵扣消费
        ADMIN_ADJUST: 6       // 管理员调整
    };

// 获取操作类型描述
UserPointsModel.getActionDesc = function(actionType) {
        const actionMap = {
            1: '预约服务',
            2: '签到获得',
            3: '服务评价',
            4: '分享推荐',
            5: '积分抵扣',
            6: '管理员调整'
        };
        return actionMap[actionType] || '未知操作';
    };

// 获取用户总积分
UserPointsModel.getUserTotalPoints = async function(userId) {
        let result = await this.sum({
            POINTS_USER_ID: userId
        }, 'POINTS_AMOUNT');
        
        return result || 0;
    };

// 获取用户积分记录
UserPointsModel.getUserPointsHistory = async function(userId, page = 1, size = 20) {
        let where = {
            POINTS_USER_ID: userId
        };
        
        let orderBy = {
            POINTS_ADD_TIME: 'desc'
        };
        
        return await this.getList(where, '*', orderBy, page, size, true, 0);
    };

module.exports = UserPointsModel;