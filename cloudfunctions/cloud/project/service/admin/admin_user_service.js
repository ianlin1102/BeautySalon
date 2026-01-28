/**
 * Notes: 用户管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2025-01-22y 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');

const util = require('../../../framework/utils/util.js');

const UserModel = require('../../model/user_model.js');
const JoinModel = require('../../model/join_model.js');

class AdminUserService extends BaseAdminService {


	/** 获得某个用户信息 */
	async getUser({
		userId,
		fields = '*'
	}) {
		// 先尝试 USER_MINI_OPENID（微信用户）
		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, fields);
		if (user) return user;

		// 再尝试 USER_ID（Web 用户）
		user = await UserModel.getOne({ USER_ID: userId }, fields);
		if (user) return user;

		// 再尝试 USER_GOOGLE_ID（Google 用户）
		user = await UserModel.getOne({ USER_GOOGLE_ID: userId }, fields);
		if (user) return user;

		// 最后尝试 _id
		user = await UserModel.getOne({ _id: userId }, fields);
		return user;
	}

	/** 取得用户分页列表 */
	async getUserList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		oldTotal = 0
	}) {

		orderBy = orderBy || {
			USER_ADD_TIME: 'desc'
		};
		let fields = '*';


		let where = {};

		// 基础条件：支持所有用户类型
		// - 微信用户：有 _pid 和 USER_MINI_OPENID
		// - Web 用户：有 USER_ACCOUNT（可能没有 _pid）
		// - Google 用户：有 USER_GOOGLE_ID（未来支持）
		// 不再强制要求 _pid，这样可以显示所有用户
		where.and = {};

		if (util.isDefined(search) && search) {
			// 搜索条件
			where.or = [{
					USER_NAME: ['like', search]
				},
				{
					USER_MOBILE: ['like', search]
				},
				{
					USER_MEMO: ['like', search]
				},
				{
					USER_ACCOUNT: ['like', search]  // 也搜索账号名
				},
				{
					USER_GOOGLE_EMAIL: ['like', search]  // 搜索 Google 邮箱
				},
			];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					where.and.USER_STATUS = Number(sortVal);
					break;
				case 'companyDef':
					// 单位性质
					where.and.USER_COMPANY_DEF = (sortVal);
					break;

				case 'sort':
					// 排序
					if (sortVal == 'newdesc') { //最新
						orderBy = {
							'USER_ADD_TIME': 'desc'
						};
					}
					if (sortVal == 'newasc') {
						orderBy = {
							'USER_ADD_TIME': 'asc'
						};
					}
			}
		}
		let result = await UserModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);


		// 为导出增加一个参数condition
		result.condition = encodeURIComponent(JSON.stringify(where));

		return result;
	}


	/**删除用户 */
	async delUser(id) {
		this.AppError('此功能暂不开放，如有需要请加作者微信：cclinux0730');
	}

}

module.exports = AdminUserService;