/**
 * 积分控制器
 */
const BaseController = require('./base_controller.js');
const PointsService = require('../service/points_service.js');

class PointsController extends BaseController {

    // 测试积分系统
    async test() {
        const now = new Date();
        const timestamp = Date.now();
        
        // 使用JavaScript转换获取芝加哥时间（推荐方式）
        const chicagoTimeString = now.toLocaleString("en-US", {
            timeZone: "America/Chicago",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 解析芝加哥时间字符串
        const [datePart, timePart] = chicagoTimeString.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        
        return {
            message: '积分系统测试成功',
            userId: this._userId,
            // 时间相关信息
            timeInfo: {
                timestamp: timestamp,
                // JavaScript转换的芝加哥时间显示
                localDateTime: `${month}/${day}/${year} ${hour}:${minute}:${second}`,
                isoString: now.toISOString(),
                utcString: now.toUTCString(),
                timezone: 'America/Chicago (JS转换)',
                timezoneOffset: now.getTimezoneOffset(),
                // 芝加哥时间的详细信息
                serverTime: {
                    year: parseInt(year),
                    month: parseInt(month),
                    day: parseInt(day),
                    hour: parseInt(hour),
                    minute: parseInt(minute),
                    second: parseInt(second),
                    millisecond: now.getMilliseconds()
                },
                // 额外的调试信息
                debugInfo: {
                    processEnvTZ: process.env.TZ,
                    systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    utcHour: now.getUTCHours(),
                    chicagoHour: parseInt(hour),
                    rawChicagoString: chicagoTimeString,
                    utcTimestamp: now.getTime(),
                    // 服务器原生时间信息
                    serverNativeTime: {
                        year: now.getFullYear(),
                        month: now.getMonth() + 1,
                        day: now.getDate(),
                        hour: now.getHours(),
                        minute: now.getMinutes(),
                        second: now.getSeconds()
                    },
                    timeMethod: 'JavaScript时区转换计算',
                    isServerNativeTime: false,
                    allEnvVars: Object.keys(process.env).filter(key => key.includes('TZ') || key.includes('TIME')),
                    allEnvVarsCount: Object.keys(process.env).length,
                    nodeVersion: process.version,
                    // 尝试手动设置TZ环境变量
                    manualTZTest: (() => {
                        const originalTZ = process.env.TZ;
                        process.env.TZ = 'America/Chicago';
                        const testDate = new Date();
                        const result = {
                            beforeSet: originalTZ,
                            afterSet: process.env.TZ,
                            testTime: testDate.toString(),
                            testHour: testDate.getHours()
                        };
                        // 恢复原设置
                        if (originalTZ) {
                            process.env.TZ = originalTZ;
                        } else {
                            delete process.env.TZ;
                        }
                        return result;
                    })(),
                    // 关键测试：验证是否真正的系统级时区改变
                    systemLevelTest: (() => {
                        const testDate1 = new Date();
                        const testDate2 = new Date('2025-01-01T12:00:00Z'); // 固定UTC时间
                        const testDate3 = new Date(2025, 0, 1, 12, 0, 0); // 本地时间构造
                        
                        return {
                            // 直接new Date()的结果
                            directNewDate: {
                                toString: testDate1.toString(),
                                getHours: testDate1.getHours(),
                                getTimezoneOffset: testDate1.getTimezoneOffset()
                            },
                            // UTC时间转换测试
                            utcTimeTest: {
                                utcInput: '2025-01-01T12:00:00Z',
                                localOutput: testDate2.toString(),
                                getHours: testDate2.getHours(),
                                shouldBe: '如果是芝加哥时区应该是6或7点'
                            },
                            // 本地时间构造测试
                            localConstructorTest: {
                                input: 'new Date(2025, 0, 1, 12, 0, 0)',
                                output: testDate3.toString(),
                                isoString: testDate3.toISOString(),
                                explanation: '如果系统时区是芝加哥，ISO时间应该+5或+6小时'
                            },
                            // 时间戳测试
                            timestampTest: {
                                now: Date.now(),
                                dateNow: new Date().getTime(),
                                difference: Date.now() - new Date().getTime(),
                                explanation: '差值应该为0，时间戳不受时区影响'
                            }
                        };
                    })()
                }
            }
        };
    }

    // 获取我的积分信息
    async getMyPointsInfo() {
        let service = new PointsService();
        let pointsInfo = await service.getUserPointsInfo(this._userId);
        
        return pointsInfo;
    }

    // 获取我的积分历史
    async getMyPointsHistory() {
        let rules = {
            page: 'must|int|default=1',
            size: 'int|default=20|max=50'
        };
        
        let input = this.validateData(rules);
        let service = new PointsService();
        let result = await service.getUserPointsHistory(this._userId, input.page, input.size);
        
        return result;
    }

    // 初始化积分系统（创建数据库集合）
    async initPointsSystem() {
        const cloud = require('../../framework/cloud/cloud_base.js').getCloud();
        const UserPointsModel = require('../model/user_points_model.js');
        
        try {
            // 检查集合是否存在，如果不存在则创建
            const db = cloud.database();
            
            // 尝试创建集合，如果已存在会忽略
            try {
                await db.createCollection('ax_user_points');
                console.log('创建 ax_user_points 集合成功');
            } catch (e) {
                console.log('ax_user_points 集合可能已存在或创建失败:', e.message);
            }
            
            // 创建钻石等级测试数据 (总计1200+分)
            const now = Date.now();
            const testRecords = [
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_BOOKING,
                //     POINTS_AMOUNT: 150,
                //     POINTS_DESCRIPTION: '预约钻石VIP服务',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 7 * 24 * 60 * 60 * 1000 // 7天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_CHECKIN,
                //     POINTS_AMOUNT: 200,
                //     POINTS_DESCRIPTION: '连续30天签到大奖',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 6 * 24 * 60 * 60 * 1000 // 6天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_REVIEW,
                //     POINTS_AMOUNT: 80,
                //     POINTS_DESCRIPTION: '详细评价奖励',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 5 * 24 * 60 * 60 * 1000 // 5天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_SHARE,
                //     POINTS_AMOUNT: 120,
                //     POINTS_DESCRIPTION: '推荐5位好友奖励',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 4 * 24 * 60 * 60 * 1000 // 4天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_BOOKING,
                //     POINTS_AMOUNT: 180,
                //     POINTS_DESCRIPTION: '预约高端护理套餐',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 3 * 24 * 60 * 60 * 1000 // 3天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_CHECKIN,
                //     POINTS_AMOUNT: 100,
                //     POINTS_DESCRIPTION: '节日签到特别奖励',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 2 * 24 * 60 * 60 * 1000 // 2天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.ADMIN_ADJUST,
                //     POINTS_AMOUNT: 350,
                //     POINTS_DESCRIPTION: ' 测试修改 ',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now - 1 * 24 * 60 * 60 * 1000 // 1天前
                // },
                // {
                //     POINTS_USER_ID: this._userId,
                //     POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_BOOKING,
                //     POINTS_AMOUNT: 50,
                //     POINTS_DESCRIPTION: '今日预约奖励',
                //     POINTS_RELATED_ID: null,
                //     POINTS_ADD_TIME: now // 刚刚
                // }
                {
                    POINTS_USER_ID: this._userId,
                    POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.ADMIN_ADJUST,
                    POINTS_AMOUNT: 200,
                    POINTS_DESCRIPTION: ' 测试修改 ',
                    POINTS_RELATED_ID: null,
                    POINTS_ADD_TIME: now - 1 * 24 * 60 * 60 * 1000 // 1天前
                }
            ];
            
            // 先清除当前用户的旧数据
            try {
                await UserPointsModel.del({
                    POINTS_USER_ID: this._userId
                });
                console.log('清除旧积分数据成功');
            } catch (e) {
                console.log('清除旧积分数据失败或无数据:', e.message);
            }
            
            // 插入新的测试数据
            for (let record of testRecords) {
                console.log('准备插入记录:', record);
                let insertResult = await UserPointsModel.insert(record);
                console.log('插入结果:', insertResult);
            }
            
            return {
                message: '积分系统初始化成功',
                records: testRecords.length,
                userId: this._userId,
                timestamp: Date.now()
            };
            
        } catch (e) {
            console.error('积分系统初始化失败:', e);
            return {
                message: '积分系统初始化失败: ' + e.message,
                error: e.message,
                userId: this._userId
            };
        }
    }

    // 创建测试数据（保留原方法，但使用正确的字段名）
    async createTestData() {
        const UserPointsModel = require('../model/user_points_model.js');
        
        // 创建一些测试积分记录（使用正确的字段名）
        const testRecords = [
            {
                POINTS_USER_ID: this._userId,
                POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_BOOKING,
                POINTS_AMOUNT: 10,
                POINTS_DESCRIPTION: '预约获得积分',
                POINTS_RELATED_ID: null
            },
            {
                POINTS_USER_ID: this._userId,
                POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_CHECKIN,
                POINTS_AMOUNT: 20,
                POINTS_DESCRIPTION: '签到获得积分',
                POINTS_RELATED_ID: null
            },
            {
                POINTS_USER_ID: this._userId,
                POINTS_ACTION_TYPE: UserPointsModel.ACTION_TYPE.EARN_REVIEW,
                POINTS_AMOUNT: 15,
                POINTS_DESCRIPTION: '评价获得积分',
                POINTS_RELATED_ID: null
            }
        ];
        
        try {
            for (let record of testRecords) {
                await UserPointsModel.insert(record);
            }
            
            return {
                message: '测试数据创建成功',
                records: testRecords.length,
                userId: this._userId
            };
        } catch (e) {
            console.error('创建测试数据失败:', e);
            throw e;
        }
    }
}

module.exports = PointsController;