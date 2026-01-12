/**
 * Notes: 后台登录与首页模块
 * Date: 2025-03-15 19:20:00 
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminHomeService = require('../../service/admin/admin_home_service.js');

class AdminHomeController extends BaseAdminController {


	// 管理首页 (公开路由，无需管理员认证，只返回统计数据)
	async adminHome() {
		// 不需要 isAdmin() 检查，因为只是读取统计数据
		let service = new AdminHomeService();
		return await service.adminHome();
	}

	// 清除缓存  
	async clearCache() {
		let service = new AdminHomeService();
		await service.clearCache();
	}

	// 管理员登录  
	async adminLogin() {

		// 数据校验
		let rules = {
			name: 'required|string|min:5|max:30|name=管理员名',
			pwd: 'required|string|min:5|max:30|name=密码',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminHomeService();
		return await service.adminLogin(input.name, input.pwd);
	}

}

module.exports = AdminHomeController;