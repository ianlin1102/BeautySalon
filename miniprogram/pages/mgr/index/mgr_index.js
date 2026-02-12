const MgrBiz = require('../../../biz/mgr_biz.js');
const AdminBiz = require('../../../biz/admin_biz.js');
const cloudHelper = require('../../../helper/cloud_helper.js');
const pageHelper = require('../../../helper/page_helper.js');

const MENU_ITEMS = [
	{ label: '课程管理', icon: 'icon-activityfill', color: '#00f2ff', perm: 'meet', url: '/pages/admin/meet/list/admin_meet_list' },
	{ label: '预约管理', icon: 'icon-form', color: '#bd00ff', perm: 'meet', url: '/pages/admin/info/admin_info_list' },
	{ label: '用户管理', icon: 'icon-peoplefill', color: '#00ff88', perm: 'user', url: '/pages/admin/user/list/admin_user_list' },
	{ label: '次卡管理', icon: 'icon-cart', color: '#ff00de', perm: 'card', url: '/pages/admin/card/list/admin_card_list' },
	{ label: '管理员', icon: 'icon-rankfill', color: '#ff6b6b', perm: 'admin:manage', url: '/pages/mgr/admin/list/mgr_admin_list' },
	{ label: '操作日志', icon: 'icon-footprint', color: '#ffaa00', perm: 'log:view', url: '/pages/admin/mgr/log/admin_log_list' },
];

Page({
	data: {
		menuItems: [],
		adminName: '',
	},

	onLoad: async function () {
		let ok = await MgrBiz.isMgr(this);
		if (!ok) return;

		let info = MgrBiz.getMgrCache();
		let perms = info.permissions || [];

		// 桥接旧 admin 认证：生成旧系统 token 以便访问旧 admin 页面
		try {
			let adminToken = await cloudHelper.callCloudData('mgr/bridge_admin_token', {});
			if (adminToken) {
				AdminBiz.adminLogin(adminToken);
			}
		} catch (e) {
			console.log('桥接旧 admin token 失败:', e);
		}

		// 超级管理员直接跳转到旧管理后台主页
		if (perms.includes('*')) {
			wx.redirectTo({
				url: '/pages/admin/index/home/admin_home',
			});
			return;
		}

		// 非超管：显示受限菜单
		let visible = MENU_ITEMS.filter(m => {
			return perms.includes(m.perm);
		});

		this.setData({
			menuItems: visible,
			adminName: info.admin ? info.admin.name : 'Admin',
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindLogout: function () {
		MgrBiz.clearMgrCache();
		AdminBiz.clearAdminToken();
		wx.navigateBack();
	}
});
