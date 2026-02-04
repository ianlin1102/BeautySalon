/**
 * Notes: 设备信息收集工具
 * Date: 2026-02-03
 */

/**
 * 收集设备信息（用于条款同意记录）
 * @returns {object} 设备信息对象
 */
function getDeviceInfo() {
	let info = {
		platform: 'miniprogram',
		system: '',
		model: '',
		brand: '',
		screenWidth: 0,
		screenHeight: 0,
		language: '',
		networkType: '',
		userAgent: '',
	};

	try {
		let sysInfo = wx.getSystemInfoSync();
		info.system = sysInfo.system || '';
		info.model = sysInfo.model || '';
		info.brand = sysInfo.brand || '';
		info.screenWidth = sysInfo.screenWidth || 0;
		info.screenHeight = sysInfo.screenHeight || 0;
		info.language = sysInfo.language || '';
	} catch (e) {
		console.log('获取系统信息失败:', e);
	}

	// 异步获取网络类型
	wx.getNetworkType({
		success: (res) => {
			info.networkType = res.networkType || '';
		}
	});

	return info;
}

module.exports = {
	getDeviceInfo
};
