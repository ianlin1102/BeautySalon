/**
 * Notes: 导师团队后台管理
 * Date: 2025-11-06
 */

const BaseAdminService = require('./base_admin_service.js');
const util = require('../../../framework/utils/util.js');
const InstructorModel = require('../../model/instructor_model.js');

class AdminInstructorService extends BaseAdminService {

	/** 添加导师 */
	async insertInstructor(adminId, {
		name,
		pic, // 头像URL
		desc = '', // 简介
		order
	}) {
		// 数据准备
		let data = {
			INSTRUCTOR_ADMIN_ID: adminId,
			INSTRUCTOR_NAME: name,
			INSTRUCTOR_PIC: pic,
			INSTRUCTOR_DESC: desc,
			INSTRUCTOR_ORDER: order,
			INSTRUCTOR_STATUS: InstructorModel.STATUS.ENABLED
		};

		// 插入记录
		let id = await InstructorModel.insert(data);

		return { id };
	}

	/** 删除导师数据 */
	async delInstructor(id) {
		// 删除导师记录
		await InstructorModel.del(id);
	}

	/** 获取导师信息 */
	async getInstructorDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		};
		let instructor = await InstructorModel.getOne(where, fields);
		if (!instructor) return null;

		return instructor;
	}

	/** 更新导师数据 */
	async editInstructor({
		id,
		name,
		pic,
		desc = '',
		order
	}) {
		// 更新数据
		let data = {
			INSTRUCTOR_NAME: name,
			INSTRUCTOR_PIC: pic,
			INSTRUCTOR_DESC: desc,
			INSTRUCTOR_ORDER: order
		};

		await InstructorModel.edit(id, data);
	}

	/** 取得导师分页列表 */
	async getInstructorList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单值
		orderBy, // 排序
		whereEx, // 附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			'INSTRUCTOR_ORDER': 'asc',
			'INSTRUCTOR_ADD_TIME': 'desc'
		};
		let fields = 'INSTRUCTOR_NAME,INSTRUCTOR_PIC,INSTRUCTOR_DESC,INSTRUCTOR_ORDER,INSTRUCTOR_STATUS,INSTRUCTOR_ADD_TIME,INSTRUCTOR_EDIT_TIME';

		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				INSTRUCTOR_NAME: ['like', search]
			}];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按状态
					where.INSTRUCTOR_STATUS = Number(sortVal);
					break;
			}
		}

		return await InstructorModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 修改导师状态 */
	async statusInstructor(id, status) {
		await InstructorModel.edit(id, {
			INSTRUCTOR_STATUS: status
		});
	}

	/** 导师排序设定 */
	async sortInstructor(id, sort) {
		await InstructorModel.edit(id, {
			INSTRUCTOR_ORDER: sort
		});
	}
}

module.exports = AdminInstructorService;
