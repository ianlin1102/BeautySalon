/**
 * 积分等级配置模型
 */
const BaseModel = require('./base_model.js');

class PointsLevelModel extends BaseModel {
  
    static CL = 'ax_points_level';
    static FIELD_PREFIX = 'LEVEL_';
    static ADD_TIME = true;
    static UPDATE_TIME = true;

    // 默认等级配置
    static DEFAULT_LEVELS = [
        { level: 1, name: '新手会员', minPoints: 0, maxPoints: 99, color: '#95a5a6' },
        { level: 2, name: '铜牌会员', minPoints: 100, maxPoints: 299, color: '#CD7F32' },
        { level: 3, name: '银牌会员', minPoints: 300, maxPoints: 599, color: '#C0C0C0' },
        { level: 4, name: '金牌会员', minPoints: 600, maxPoints: 999, color: '#FFD700' },
        { level: 5, name: '钻石会员', minPoints: 1000, maxPoints: 9999, color: '#1e90ff' }
    ];

    // 根据积分获取等级信息
    static getLevelByPoints(points) {
        for (let level of this.DEFAULT_LEVELS) {
            if (points >= level.minPoints && points <= level.maxPoints) {
                return level; //返回的是数字等级
            }
        }
        return this.DEFAULT_LEVELS[this.DEFAULT_LEVELS.length - 1]; // 返回最高等级
    }

    // 计算距离下一等级所需积分
    static getNextLevelInfo(points) {
        let currentLevel = this.getLevelByPoints(points); //只是  Index
        let nextLevelIndex = this.DEFAULT_LEVELS.findIndex(l => l.level === currentLevel.level) + 1; // 同样也只是 Index
        
        // 检查是否已经是最高等级
        if (nextLevelIndex >= this.DEFAULT_LEVELS.length || currentLevel.level === this.DEFAULT_LEVELS[this.DEFAULT_LEVELS.length - 1].level) {
            return { // 返回的对象是给上一级的使用，也就是 Rendering 使用的. 
                nextLevel: null,
                needPoints: 0,
                progressPercent: 100
            };
        }
        
        let nextLevel = this.DEFAULT_LEVELS[nextLevelIndex];
        // 修复进度条计算逻辑：应该是当前等级内的进度，而不是到达当前等级上限的进度
        let currentLevelRange = currentLevel.maxPoints - currentLevel.minPoints + 1; // +1 因为包含边界值
        let currentProgress = points - currentLevel.minPoints;
        let progressPercent = Math.floor((currentProgress / currentLevelRange) * 100);
        
        return {
            nextLevel: nextLevel,
            needPoints: nextLevel.minPoints - points,
            progressPercent: Math.min(progressPercent, 100) // 确保不超过100%
        };
    }
}

module.exports = PointsLevelModel;