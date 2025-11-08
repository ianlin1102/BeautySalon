/**
 * Notes: 关于我们模块后台管理-控制器
 * Date: 2025-11-06
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminAboutService = require('../../service/admin/admin_about_service.js');
const contentCheck = require('../../../framework/validate/content_check.js');
const LogModel = require('../../model/log_model.js');

class AdminAboutController extends BaseAdminController {

	/** 获取关于我们信息用于编辑 */
	async getAboutDetail() {
		await this.isAdmin();

		let service = new AdminAboutService();
		return await service.getAboutDetail();
	}

	/** 编辑关于我们 */
	async editAbout() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			title: 'string|max:50|name=标题',
			content: 'array|name=富文本内容',
			pic: 'array|name=图片'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminAboutService();
		let result = service.editAbout(this._adminId, input);

		this.log('修改了关于我们信息', LogModel.TYPE.NEWS);

		return result;
	}

	/**
	 * 更新富文本信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateAboutContent() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			content: 'array'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminAboutService();
		return await service.updateAboutContent(input);
	}

	/**
	 * 更新图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateAboutPic() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			imgList: 'array'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminAboutService();
		return await service.updateAboutPic(input);
	}
}

module.exports = AdminAboutController;
