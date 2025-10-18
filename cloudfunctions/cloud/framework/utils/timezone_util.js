/**
 * 时区转换工具类
 * 提供JavaScript时区转换功能，不依赖系统环境变量
 */

class TimezoneUtil {
    
    /**
     * 获取指定时区的当前时间
     * @param {string} timezone - 时区名称，如 'America/Chicago'
     * @returns {Object} 时间信息对象
     */
    static getCurrentTime(timezone = 'America/Chicago') {
        const now = new Date();
        
        // 获取指定时区的时间字符串
        const localTimeString = now.toLocaleString("en-US", {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 解析时间字符串
        const [datePart, timePart] = localTimeString.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        
        return {
            // 格式化显示
            formatted: `${month}/${day}/${year} ${hour}:${minute}:${second}`,
            formattedDate: `${month}/${day}/${year}`,
            formattedTime: `${hour}:${minute}:${second}`,
            
            // 详细信息
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            second: parseInt(second),
            
            // 原始信息
            timestamp: now.getTime(),
            isoString: now.toISOString(),
            timezone: timezone,
            rawString: localTimeString
        };
    }
    
    /**
     * 获取芝加哥时间（快捷方法）
     */
    static getChicagoTime() {
        return this.getCurrentTime('America/Chicago');
    }
    
    /**
     * 获取纽约时间（快捷方法）
     */
    static getNewYorkTime() {
        return this.getCurrentTime('America/New_York');
    }
    
    /**
     * 获取中国时间（快捷方法）
     */
    static getChinaTime() {
        return this.getCurrentTime('Asia/Shanghai');
    }
    
    /**
     * 格式化时间戳到指定时区
     * @param {number} timestamp - 时间戳
     * @param {string} timezone - 时区
     * @returns {Object} 格式化后的时间
     */
    static formatTimestamp(timestamp, timezone = 'America/Chicago') {
        const date = new Date(timestamp);
        return this.getCurrentTime(timezone);
    }
    
    /**
     * 比较多个时区的当前时间
     * @param {Array} timezones - 时区数组
     * @returns {Object} 各时区时间对比
     */
    static compareTimezones(timezones = ['America/Chicago', 'Asia/Shanghai', 'UTC']) {
        const comparison = {};
        const now = new Date();
        
        timezones.forEach(tz => {
            comparison[tz] = this.getCurrentTime(tz);
        });
        
        return {
            utcTime: now.toISOString(),
            localTime: now.toString(),
            timezones: comparison
        };
    }
}

module.exports = TimezoneUtil;