/**
 * 统一日志工具
 * 同时输出到 Console（用于调试）和云函数日志服务（用于生产环境）
 */

const cloudBase = require('../cloud/cloud_base.js');

class Logger {
  constructor() {
    this.cloud = null;
    this.cloudLogger = null;
    this.initLogger();
  }

  /**
   * 初始化云函数日志服务
   */
  initLogger() {
    try {
      this.cloud = cloudBase.getCloud();
      this.cloudLogger = this.cloud.logger();
    } catch (err) {
      console.error('初始化云函数日志服务失败:', err);
      this.cloudLogger = null;
    }
  }

  /**
   * 生成带时间戳的日志前缀
   */
  getPrefix(level) {
    const timestamp = new Date().toISOString();
    const emoji = {
      'INFO': 'ℹ️',
      'WARN': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🐛',
      'SUCCESS': '✅',
      'START': '🚀',
      'HTTP': '🌐',
      'MINI': '📱'
    }[level] || '📝';

    return `[${timestamp}] ${emoji}`;
  }

  /**
   * 格式化数据用于输出
   */
  formatData(data) {
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return String(data);
      }
    }
    return data;
  }

  /**
   * 通用日志输出方法
   * @param {string} level - 日志级别: INFO, WARN, ERROR, DEBUG, SUCCESS, START, HTTP, MINI
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   * @param {object} options - 选项 { consoleOnly: false, cloudOnly: false }
   */
  log(level, message, data = null, options = {}) {
    const prefix = this.getPrefix(level);
    const fullMessage = `${prefix} ${message}`;

    // 1. Console 输出（用于实时调试）
    if (!options.cloudOnly) {
      // 根据级别使用不同的 console 方法
      switch (level) {
        case 'ERROR':
          console.error(fullMessage);
          if (data) console.error('详细信息:', this.formatData(data));
          break;
        case 'WARN':
          console.warn(fullMessage);
          if (data) console.warn('详细信息:', this.formatData(data));
          break;
        case 'DEBUG':
          console.log(fullMessage);
          if (data) console.log('详细信息:', this.formatData(data));
          break;
        default:
          console.log(fullMessage);
          if (data) console.log('详细信息:', this.formatData(data));
      }
    }

    // 2. 云函数日志服务（用于持久化和生产环境）
    if (!options.consoleOnly && this.cloudLogger) {
      try {
        const logData = {
          level,
          message,
          timestamp: new Date().toISOString(),
          ...(data && { data })
        };

        switch (level) {
          case 'ERROR':
            this.cloudLogger.error(logData);
            break;
          case 'WARN':
            this.cloudLogger.warn(logData);
            break;
          default:
            this.cloudLogger.info(logData);
        }
      } catch (err) {
        console.error('写入云函数日志失败:', err);
      }
    }

    return fullMessage;
  }

  /**
   * 信息日志
   */
  info(message, data = null) {
    return this.log('INFO', message, data);
  }

  /**
   * 警告日志
   */
  warn(message, data = null) {
    return this.log('WARN', message, data);
  }

  /**
   * 错误日志
   */
  error(message, data = null) {
    return this.log('ERROR', message, data);
  }

  /**
   * 调试日志
   */
  debug(message, data = null) {
    return this.log('DEBUG', message, data);
  }

  /**
   * 成功日志
   */
  success(message, data = null) {
    return this.log('SUCCESS', message, data);
  }

  /**
   * 启动日志
   */
  start(message, data = null) {
    return this.log('START', message, data);
  }

  /**
   * HTTP 请求日志
   */
  http(message, data = null) {
    return this.log('HTTP', message, data);
  }

  /**
   * 小程序请求日志
   */
  mini(message, data = null) {
    return this.log('MINI', message, data);
  }

  /**
   * 分隔线（只在 console 显示）
   */
  separator(char = '▤', count = 50) {
    const line = char.repeat(count);
    console.log(line);
    return line;
  }

  /**
   * 请求开始标记
   */
  requestStart(requestType, data = null) {
    this.separator('🚀', 50);
    const message = `云函数请求开始 - ${requestType}`;
    return this.log('START', message, data);
  }

  /**
   * 请求结束标记
   */
  requestEnd(requestType, data = null) {
    const message = `云函数请求结束 - ${requestType}`;
    this.log('SUCCESS', message, data);
    this.separator('✅', 50);
    return message;
  }

  /**
   * 路由日志
   */
  route(route, controller, action, data = null) {
    const message = `路由: ${route} → ${controller}@${action}`;
    return this.log('INFO', message, data);
  }

  /**
   * 强制错误日志（同时输出多次确保可见）
   */
  forceError(message, data = null) {
    // 输出 3 次确保在任何日志级别都能看到
    console.log('❌❌❌ ' + message + ' ❌❌❌');
    console.log('详细信息:', this.formatData(data));

    if (this.cloudLogger) {
      this.cloudLogger.error({
        level: 'FORCE_ERROR',
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data })
      });
    }

    return message;
  }

  /**
   * 强制信息日志（同时输出多次确保可见）
   */
  forceInfo(message, data = null) {
    console.log('🔔🔔🔔 ' + message + ' 🔔🔔🔔');
    console.log('详细信息:', this.formatData(data));

    if (this.cloudLogger) {
      this.cloudLogger.info({
        level: 'FORCE_INFO',
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data })
      });
    }

    return message;
  }
}

// 导出单例
const logger = new Logger();
module.exports = logger;
