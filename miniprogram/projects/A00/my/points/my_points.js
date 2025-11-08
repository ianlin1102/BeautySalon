let behavior = require('../../../../behavior/my_join_bh.js');
let PassportBiz = require('../../../../biz/passport_biz.js');

Page({
    behaviors: [behavior],

    data: {
        pointsInfo: null,
        pointsHistory: [],
        page: 1,
        loading: false,
        hasMore: true
    },

    onLoad: function (options) {
        this.getPointsInfo();
        this.getPointsHistory();
    },

    // 获取积分信息
    async getPointsInfo() {
        try {
            let pointsInfo = await PassportBiz.getPointsInfo();
            this.setData({
                pointsInfo: pointsInfo
            });
        } catch (e) {
            console.error('获取积分信息失败:', e);
        }
    },

    // 获取积分历史
    async getPointsHistory(loadMore = false) {
        if (this.data.loading) return;
        
        this.setData({ loading: true });

        try {
            let page = loadMore ? this.data.page + 1 : 1;
            let result = await PassportBiz.getPointsHistory(page, 20);
            
            // 确保result和result.list存在
            if (!result || !result.list) {
                result = { list: [], total: 0 };
            }
            
            let newHistory = loadMore ? 
                [...this.data.pointsHistory, ...result.list] : 
                result.list;

            this.setData({
                pointsHistory: newHistory,
                page: page,
                hasMore: (result.list && result.list.length >= 20),
                loading: false
            });
        } catch (e) {
            this.setData({ loading: false });
            console.error('获取积分历史失败:', e);
        }
    },

    // 下拉刷新
    onPullDownRefresh() {
        // 清除缓存，强制重新加载
        PassportBiz.clearPointsCache();
        this.getPointsInfo();
        this.getPointsHistory();
        wx.stopPullDownRefresh();
    },

    // 上拉加载更多
    onReachBottom() {
        if (this.data.hasMore) {
            this.getPointsHistory(true);
        }
    },

    // 测试云函数时间
    async testServerTime() {
        try {
            wx.showLoading({
                title: '测试中...',
                mask: true
            });
            
            let result = await PassportBiz.testServerTime();
            wx.hideLoading();
            
            console.log('云函数返回的完整结果:', result);
            
            // 更安全地处理返回数据
            let timeInfo = null;
            if (result && result.data && result.data.timeInfo) {
                timeInfo = result.data.timeInfo;
            } else if (result && result.timeInfo) {
                timeInfo = result.timeInfo;
            } else if (result && result.data) {
                timeInfo = result.data;
            } else {
                timeInfo = result;
            }
            
            console.log('解析出的timeInfo:', timeInfo);
            
            // 安全地构建显示信息
            let displayInfo = `云函数服务器时间信息：

🕒 芝加哥本地时间: ${timeInfo?.localDateTime || '未知'}
🌍 时区设置: ${timeInfo?.timezone || '未知'}
📅 详细日期: ${timeInfo?.serverTime?.month}/${timeInfo?.serverTime?.day}/${timeInfo?.serverTime?.year}
⏰ 详细时间: ${timeInfo?.serverTime?.hour}:${String(timeInfo?.serverTime?.minute).padStart(2,'0')}:${String(timeInfo?.serverTime?.second).padStart(2,'0')}

调试信息:
- 环境变量TZ: ${timeInfo?.debugInfo?.processEnvTZ || '未设置'}
- 系统时区: ${timeInfo?.debugInfo?.systemTimezone || '未知'}
- UTC小时: ${timeInfo?.debugInfo?.utcHour || '未知'}
- 芝加哥小时: ${timeInfo?.debugInfo?.chicagoHour || '未知'}
- 时间戳: ${timeInfo?.timestamp || '未知'}`;

            // 如果需要看完整数据，取消下面的注释
            // displayInfo += `\n\n原始数据: ${JSON.stringify(result, null, 2)}`;

            wx.showModal({
                title: '服务器时间测试',
                content: displayInfo,
                showCancel: false,
                confirmText: '确定'
            });
            
        } catch (e) {
            wx.hideLoading();
            wx.showToast({
                title: '测试失败: ' + e.message,
                icon: 'none',
                duration: 3000
            });
            console.error('测试云函数时间失败:', e);
        }
    }
});