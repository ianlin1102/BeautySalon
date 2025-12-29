/**
 * HTTP 请求认证中间件
 * 处理来自 Web 端的 HTTP 请求认证
 */

const jwt = require('jsonwebtoken')
const config = require('../../config/config.js')

// JWT 密钥（应该从环境变量或配置文件读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * 验证 HTTP 请求的 JWT Token
 * @param {Object} event - 云函数事件对象
 * @returns {Object} 认证结果 { success: boolean, adminId?: string, error?: string }
 */
function verifyHttpAuth(event) {
  try {
    // 1. 检查是否为 HTTP 请求
    if (!event.headers) {
      return { success: false, error: 'Not HTTP request' }
    }

    // 2. 从 headers 中获取 token
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      return { success: false, error: 'Missing authorization header' }
    }

    // 3. 提取 Bearer token
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return { success: false, error: 'Invalid token format' }
    }

    // 4. 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET)

    // 5. 检查 token 是否过期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return { success: false, error: 'Token expired' }
    }

    // 6. 返回认证信息
    return {
      success: true,
      adminId: decoded.adminId,
      adminName: decoded.adminName,
      adminType: decoded.adminType
    }
  } catch (error) {
    console.error('JWT 验证失败:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 生成 JWT Token（用于登录接口）
 * @param {Object} admin - 管理员信息
 * @returns {string} JWT token
 */
function generateToken(admin) {
  const payload = {
    adminId: admin._id,
    adminName: admin.ADMIN_NAME,
    adminType: admin.ADMIN_TYPE,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天过期
  }

  return jwt.sign(payload, JWT_SECRET)
}

/**
 * 检查路由是否需要认证
 * @param {string} route - 路由名称
 * @returns {boolean}
 */
function requiresAuth(route) {
  // 不需要认证的路由白名单
  const publicRoutes = [
    'admin/login',
    'passport/register',  // 用户注册
    'home/setup_all',
    'card/list',
    'card/home_list',
    'card/view',
    'instructor/list',
    'instructor/detail',
    'checkin/rank_list',
    'debug/check_checkin',
    'debug/check_user',
    'debug/test_groupcount'
  ]

  return !publicRoutes.includes(route)
}

module.exports = {
  verifyHttpAuth,
  generateToken,
  requiresAuth
}
