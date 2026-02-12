/**
 * Notes: MGR管理后台业务逻辑
 * Date: 2026-02-11
 */

const cacheHelper = require('../helper/cache_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');

const CACHE_MGR = 'MGR_INFO';

const MgrBiz = {

	/** 检查当前用户是否为管理员，成功则缓存信息 */
	async checkMgrAccess() {
		try {
			let res = await cloudHelper.callCloudData('mgr/my_info', {}, { hint: false });
			if (res) {
				cacheHelper.set(CACHE_MGR, res, 3600);
				return res;
			}
		} catch (e) {
			// 非管理员，静默失败
		}
		return null;
	},

	/** 获取缓存的管理员信息 */
	getMgrCache() {
		return cacheHelper.get(CACHE_MGR);
	},

	/** 清除管理员缓存 */
	clearMgrCache() {
		cacheHelper.remove(CACHE_MGR);
	},

	/** 检查是否拥有指定权限 */
	hasPermission(perm) {
		let info = cacheHelper.get(CACHE_MGR);
		if (!info) return false;
		let perms = info.permissions || [];
		return perms.includes('*') || perms.includes(perm);
	},

	/** 获取所有权限列表 */
	getPermissions() {
		let info = cacheHelper.get(CACHE_MGR);
		if (!info) return [];
		return info.permissions || [];
	},

	/**
	 * 页面守卫 - 在 onLoad 中调用
	 * @param {Object} that - 页面实例
	 * @param {string} requiredPerm - 需要的权限标识（可选）
	 * @returns {boolean} 是否有权限
	 */
	async isMgr(that, requiredPerm) {
		let info = cacheHelper.get(CACHE_MGR);
		if (!info) {
			info = await MgrBiz.checkMgrAccess();
		}

		if (!info) {
			wx.showToast({ title: '无管理权限', icon: 'none' });
			setTimeout(() => { wx.navigateBack(); }, 1500);
			return false;
		}

		if (requiredPerm) {
			let perms = info.permissions || [];
			if (!perms.includes('*') && !perms.includes(requiredPerm)) {
				wx.showToast({ title: '无操作权限', icon: 'none' });
				setTimeout(() => { wx.navigateBack(); }, 1500);
				return false;
			}
		}

		return true;
	}
};

module.exports = MgrBiz;
