/**
 * Notes: 导师团队模块后台管理-控制器
 * Date: 2025-11-06
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminInstructorService = require('../../service/admin/admin_instructor_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const contentCheck = require('../../../framework/validate/content_check.js');
const LogModel = require('../../model/log_model.js');

class AdminInstructorController extends BaseAdminController {

	/** 导师排序 */
	async sortInstructor() {
		await this.isAdmin();

		let rules = {
			id: 'must|id',
			sort: 'must|int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminInstructorService();
		await service.sortInstructor(input.id, input.sort);
	}

	/** 导师状态修改 */
	async statusInstructor() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			status: 'must|int|in:0,1',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminInstructorService();
		await service.statusInstructor(input.id, input.status);
	}

	/** 导师列表 */
	async getInstructorList() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			whereEx: 'object|name=附加查询条件',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminInstructorService();
		let result = await service.getInstructorList(input);

		// 数据格式化
		let list = result.list;
		for (let k in list) {
			list[k].INSTRUCTOR_ADD_TIME = timeUtil.timestamp2Time(list[k].INSTRUCTOR_ADD_TIME, 'Y-M-D h:m');
			list[k].INSTRUCTOR_EDIT_TIME = timeUtil.timestamp2Time(list[k].INSTRUCTOR_EDIT_TIME, 'Y-M-D h:m');
		}
		result.list = list;

		return result;
	}

	/** 发布导师信息 */
	async insertInstructor() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			name: 'must|string|min:2|max:20|name=导师姓名',
			pic: 'must|string|name=导师头像URL',
			desc: 'string|max:100|name=简介',
			order: 'must|int|min:1|max:9999|name=排序号'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminInstructorService();
		let result = await service.insertInstructor(this._adminId, input);

		this.log('添加了导师《' + input.name + '》', LogModel.TYPE.NEWS);

		return result;
	}

	/** 获取导师信息用于编辑修改 */
	async getInstructorDetail() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminInstructorService();
		return await service.getInstructorDetail(input.id);
	}

	/** 编辑导师 */
	async editInstructor() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			name: 'must|string|min:2|max:20|name=导师姓名',
			pic: 'must|string|name=导师头像URL',
			desc: 'string|max:100|name=简介',
			order: 'must|int|min:1|max:9999|name=排序号'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 内容审核
		await contentCheck.checkTextMultiAdmin(input);

		let service = new AdminInstructorService();
		let result = service.editInstructor(input);

		this.log('修改了导师《' + input.name + '》', LogModel.TYPE.NEWS);

		return result;
	}

	/** 删除导师 */
	async delInstructor() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let name = await this.getNameBeforeLog('instructor', input.id);

		let service = new AdminInstructorService();
		await service.delInstructor(input.id);

		this.log('删除了导师《' + name + '》', LogModel.TYPE.NEWS);
	}
}

module.exports = AdminInstructorController;
