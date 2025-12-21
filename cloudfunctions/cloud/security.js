/**
 * 云函数安全验证模块
 * 提供 API Key、IP 白名单、频率限制等安全功能
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 获取客户端 IP 地址
 */
function getClientIP(event) {
  return event.headers['x-real-ip'] ||
         event.headers['x-forwarded-for']?.split(',')[0] ||
         event.requestContext?.sourceIp ||
         'unknown'
}

/**
 * 验证 API Key
 * @param {string} apiKey - 请求携带的 API Key
 * @returns {boolean}
 */
function verifyApiKey(apiKey) {
  // 从环境变量读取有效的 API Keys（逗号分隔）
  const validKeys = process.env.VALID_API_KEYS?.split(',') || []

  // 开发环境：如果没有配置，则允许所有请求（方便测试）
  if (validKeys.length === 0) {
    console.warn('警告：未配置 VALID_API_KEYS，所有请求将被允许')
    return true
  }

  return validKeys.includes(apiKey)
}

/**
 * IP 白名单验证
 * @param {string} ip - 客户端 IP
 * @returns {boolean}
 */
function verifyIPWhitelist(ip) {
  // 如果未启用 IP 白名单，直接通过
  if (process.env.ENABLE_IP_WHITELIST !== 'true') {
    return true
  }

  const whitelist = process.env.IP_WHITELIST?.split(',') || []

  // 如果启用了但没配置，拒绝所有请求
  if (whitelist.length === 0) {
    console.error('错误：启用了 IP 白名单但未配置 IP_WHITELIST')
    return false
  }

  return whitelist.includes(ip)
}

/**
 * 请求频率限制
 * @param {string} identifier - 标识符（IP 或 API Key）
 * @param {number} limit - 限制次数，默认 60 次/分钟
 * @returns {Promise<boolean>}
 */
async function checkRateLimit(identifier, limit = 60) {
  try {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    // 查询过去一分钟的请求次数
    const { total } = await db.collection('api_access_log')
      .where({
        identifier: identifier,
        timestamp: db.command.gte(oneMinuteAgo)
      })
      .count()

    if (total >= limit) {
      console.warn(`频率限制：${identifier} 超过限制 ${limit}/分钟`)
      return false
    }

    return true
  } catch (error) {
    console.error('频率限制检查失败:', error)
    // 出错时放行，避免影响正常用户
    return true
  }
}

/**
 * 记录访问日志
 * @param {object} logData - 日志数据
 */
async function logAccess(logData) {
  try {
    await db.collection('api_access_log').add({
      data: {
        ...logData,
        timestamp: Date.now(),
        _createTime: new Date()
      }
    })
  } catch (error) {
    console.error('记录访问日志失败:', error)
    // 记录失败不影响业务
  }
}

/**
 * 完整的安全验证流程
 * @param {object} event - 云函数事件对象
 * @returns {object} { passed: boolean, code: number, msg: string, clientIP: string }
 */
async function securityCheck(event) {
  const clientIP = getClientIP(event)
  const apiKey = event.headers?.['x-api-key'] || event.apiKey

  // 1. API Key 验证
  if (!verifyApiKey(apiKey)) {
    return {
      passed: false,
      code: 401,
      msg: '无效的 API Key',
      clientIP
    }
  }

  // 2. IP 白名单验证
  if (!verifyIPWhitelist(clientIP)) {
    return {
      passed: false,
      code: 403,
      msg: `IP ${clientIP} 未授权访问`,
      clientIP
    }
  }

  // 3. 频率限制（使用 IP 作为标识）
  const rateLimit = parseInt(process.env.RATE_LIMIT) || 60
  if (!await checkRateLimit(clientIP, rateLimit)) {
    return {
      passed: false,
      code: 429,
      msg: '请求过于频繁，请稍后再试',
      clientIP
    }
  }

  // 4. 记录访问日志（异步，不等待）
  logAccess({
    identifier: clientIP,
    ip: clientIP,
    apiKey: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
    route: event.route || 'unknown',
    userAgent: event.headers?.['user-agent'] || 'unknown'
  }).catch(err => console.error('日志记录失败:', err))

  return {
    passed: true,
    code: 0,
    msg: '验证通过',
    clientIP
  }
}

/**
 * 生成错误响应
 */
function errorResponse(code, msg) {
  return {
    code,
    msg,
    data: null
  }
}

module.exports = {
  getClientIP,
  verifyApiKey,
  verifyIPWhitelist,
  checkRateLimit,
  logAccess,
  securityCheck,
  errorResponse
}
