/**
 * 管理员积分控制器
 */
const AdminController = require('./base_admin_controller.js');
const PointsService = require('../../service/points_service.js');

class AdminPointsController extends AdminController {

    // 调整用户积分
    async adjustUserPoints() {
        let rules = {
            userId: 'must|id',
            amount: 'must|int',
            reason: 'must|string|min:2|max:100|name=调整原因'
        };
        
        let input = this.validateData(rules);
        let service = new PointsService();
        
        let result = await service.adminAdjustPoints(
            input.userId,
            input.amount,
            input.reason,
            this._userId
        );
        
        return result;
    }

    // 获取用户积分信息（管理员查看）
    async getUserPointsInfo() {
        let rules = {
            userId: 'must|id'
        };
        
        let input = this.validateData(rules);
        let service = new PointsService();
        let result = await service.getUserPointsInfo(input.userId);
        
        return result;
    }
}

module.exports = AdminPointsController;