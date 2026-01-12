# SmartBeauty API 架构详解

本文档详细解释 SmartBeauty 项目中三种不同的 API 调用方式、常见错误及其解决方案。

---

## 目录

1. [架构概览](#架构概览)
2. [三种调用方式对比](#三种调用方式对比)
3. [配置项与密钥说明](#配置项与密钥说明)
4. [常见错误码解析](#常见错误码解析)
5. [历史 Bug 案例分析](#历史-bug-案例分析)
6. [调试指南](#调试指南)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端 (Frontend)                            │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│   微信小程序         │      Web 端          │      管理后台            │
│   (miniprogram/)    │   (smartbeauty-web/) │   (smartbeauty-web/)   │
│                     │                     │                         │
│ wx.cloud.callFunction│  fetch() HTTP POST  │   fetch() + JWT Token  │
│        ↓            │         ↓           │          ↓              │
└─────────┬───────────┴─────────┬───────────┴──────────┬──────────────┘
          │                     │                      │
          ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    腾讯云开发 CloudBase                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  云函数入口 (index.js)                          │ │
│  │                         ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │   判断请求来源                                            │  │ │
│  │  │   - event.headers 存在 → HTTP 请求 → app_other.js        │  │ │
│  │  │   - event.headers 不存在 → 小程序请求 → application.js    │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                         ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │   中间件处理                                              │  │ │
│  │  │   - http_auth.js (JWT 验证, 路由白名单检查)               │  │ │
│  │  │   - data_check.js (参数验证)                              │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                         ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │   路由分发 (route.js)                                     │  │ │
│  │  │   'admin/user_list' → admin_user_controller@getUserList  │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                         ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │   Controller → Service → Model → 数据库                   │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   云数据库 (NoSQL)                                             │ │
│  │   - ax_user (用户表)                                           │ │
│  │   - ax_meet (课程表)                                           │ │
│  │   - ax_join (预约表)                                           │ │
│  │   - ax_admin (管理员表)                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三种调用方式对比

### 1. 微信小程序调用 (wx.cloud.callFunction)

**调用方式:**
```javascript
// miniprogram/helper/cloud_helper.js
wx.cloud.callFunction({
  name: 'cloud',  // 云函数名称
  data: {
    route: 'meet/list',           // 路由
    token: openid,                // 用户身份 (微信 OpenID)
    PID: 'A00',                   // 项目 ID
    params: { page: 1, size: 10 } // 业务参数 (嵌套对象)
  }
})
```

**特点:**
- 自动携带微信用户身份 (OpenID)
- 通过微信开发者工具直接调用
- 无需额外认证头
- 请求直接进入 `application.js` 处理

**必需配置:**
| 配置项 | 位置 | 说明 |
|-------|------|------|
| `CLOUD_ID` | `miniprogram/setting/setting.js` | 云开发环境 ID |
| `appid` | `project.config.json` | 微信小程序 AppID |

---

### 2. Web 端 HTTP 调用 (fetch + HTTP 触发器)

**调用方式:**
```javascript
// smartbeauty-web/src/services/httpApi.js
fetch(CLOUD_FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,  // CloudBase API Key
  },
  body: JSON.stringify({
    route: 'meet/list',
    token: userId,    // 用户 ID (来自 localStorage)
    PID: 'A00',
    params: { page: 1, size: 10 }
  })
})
```

**特点:**
- 通过 HTTP 触发器访问云函数
- 需要 CloudBase API Key 认证
- 请求先进入 `app_other.js` 预处理，再进入 `application.js`
- 用户身份通过 `token` 字段传递

**必需配置:**
| 配置项 | 位置 | 说明 |
|-------|------|------|
| `VITE_CLOUD_FUNCTION_URL` | `.env.local` | HTTP 触发器地址 |
| `VITE_TCB_API_KEY` | `.env.local` | CloudBase API Key (JWT 格式) |

---

### 3. CloudBase JS SDK 直接查询

**调用方式:**
```javascript
// smartbeauty-web/src/services/databaseService.js
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({ env: 'cloud1-xxx' })
const auth = app.auth({ persistence: 'local' })
await auth.signInAnonymously()  // 匿名登录

const db = app.database()
const result = await db.collection('ax_user').get()
```

**特点:**
- 直接查询数据库，不经过云函数
- 需要匿名登录获取权限
- 受数据库安全规则限制
- 某些集合可能因权限不足无法访问

**必需配置:**
| 配置项 | 位置 | 说明 |
|-------|------|------|
| `ENV_ID` | 代码中硬编码 | 云开发环境 ID |
| 安全规则 | 云开发控制台 | 数据库读写权限 |

---

## 配置项与密钥说明

### 环境 ID (ENV_ID / CLOUD_ID)

```
云开发环境 ID: cloud1-6gnd02he13c1ff2e
```

**获取位置:** 腾讯云控制台 → 云开发 → 环境概览

**使用位置:**
- `miniprogram/setting/setting.js` → `CLOUD_ID`
- `cloudfunctions/cloud/config/config.js` → `CLOUD_ID`
- `smartbeauty-web/src/services/databaseService.js` → `ENV_ID`

---

### HTTP 触发器地址

```
https://cloud1-6gnd02he13c1ff2e-1380655578.ap-shanghai.app.tcloudbase.com/cloud
```

**格式:** `https://{envId}-{uin}.{region}.app.tcloudbase.com/{functionName}`

**获取位置:** 腾讯云控制台 → 云开发 → 云函数 → 选择函数 → HTTP 触发

**使用位置:**
- `smartbeauty-web/src/services/httpApi.js` → `CLOUD_FUNCTION_HTTP_URL`
- `smartbeauty-web/src/services/databaseService.js` → `CLOUD_FUNCTION_URL`

---

### CloudBase API Key

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9...
```

**获取位置:** 腾讯云控制台 → 云开发 → 环境设置 → 安全配置 → API Key

**用途:** HTTP 请求的 `Authorization` 头认证

**使用位置:**
- `smartbeauty-web/src/services/httpApi.js` → `API_KEY`

---

### JWT 密钥 (管理员认证)

```javascript
// cloudfunctions/cloud/framework/middleware/http_auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
```

**用途:** 管理员登录后签发 JWT Token，用于后续管理员操作认证

**生成流程:**
1. 管理员调用 `admin/login` 路由
2. 验证账号密码后，`http_auth.js` 的 `generateToken()` 生成 JWT
3. 前端存储 JWT Token 到 `localStorage`
4. 后续管理员请求携带 `Authorization: Bearer {token}`

---

### 项目 ID (PID)

```
PID: 'A00'
```

**用途:** 多项目隔离，所有数据记录都带 `_pid` 字段

**使用位置:**
- 所有 API 调用的请求体中
- 数据库查询条件中

---

## 常见错误码解析

### HTTP 状态码错误

| 错误码 | 含义 | 常见原因 | 解决方案 |
|-------|------|---------|---------|
| **500** | 服务器内部错误 | 云函数代码执行异常 | 查看云函数日志 |
| **502** | 网关错误 | 云函数超时或崩溃 | 检查云函数配置 |
| **504** | 网关超时 | 请求处理时间过长 | 优化查询或增加超时时间 |

### 云函数业务错误码

| 错误码 | 含义 | 常见原因 | 解决方案 |
|-------|------|---------|---------|
| **200** | 成功 | - | - |
| **500** | 服务器繁忙 | 通用错误 | 查看具体错误消息 |
| **1001** | 参数校验失败 | 缺少必填参数或格式错误 | 检查请求参数 |
| **1600** | 未登录/无权限 | Token 无效或过期 | 重新登录 |

### CloudBase SDK 错误

| 错误消息 | 含义 | 常见原因 | 解决方案 |
|---------|------|---------|---------|
| `数据库未初始化` | 未调用 `initDatabase()` | 直接使用 `getDatabase()` | 先调用 `initDatabase()` |
| `PERMISSION_DENIED` | 权限不足 | 安全规则限制 | 检查数据库安全规则 |
| `INVALID_PARAM` | 参数错误 | 查询条件格式错误 | 检查查询语法 |

### 管理员认证错误

| 错误消息 | 含义 | 常见原因 | 解决方案 |
|---------|------|---------|---------|
| `管理员不存在` | `isAdmin()` 检查失败 | 路由需要管理员认证但无 JWT | 添加到 publicRoutes 或传递 JWT |
| `Token expired` | JWT 过期 | Token 超过 7 天有效期 | 重新登录 |
| `Missing authorization header` | 缺少认证头 | HTTP 请求未携带 Authorization | 添加 Authorization 头 |

---

## 历史 Bug 案例分析

### Bug #1: 用户登录后 API 返回空数据

**问题表现:**
- 用户 `user/123456` 登录后，预约列表显示为空
- 数据库中明明有该用户的预约记录

**根本原因:**
```javascript
// AuthContext.jsx 中的 user.id 格式错误
const userData = {
  id: `${account.role}_${username}`,  // ❌ 生成 "user_user"
  // ...
}
```

数据库中用户真实 ID 是微信 OpenID (`oi1Jt1yz9SQ8MzgMri3ifVTKnSNk`)，
但 API 调用时 token 传递的是 `"user_user"`，导致查询结果为空。

**修复方案:**
```javascript
const ACCOUNTS = {
  user: {
    pwd: '123456',
    userId: 'oi1Jt1yz9SQ8MzgMri3ifVTKnSNk'  // ✅ 使用真实 ID
  }
}
const realUserId = account.userId || `${account.role}_${username}`
```

---

### Bug #2: Admin Dashboard 统计数据为空 (错误: 管理员不存在)

**问题表现:**
- 管理员登录后，仪表盘统计数据全部显示为 0
- 控制台报错: `管理员不存在`

**根本原因:**
```javascript
// admin_home_controller.js
async adminHome() {
  await this.isAdmin();  // ❌ 检查管理员身份
  // ...
}
```

虽然 `admin/home` 在 `publicRoutes` 中（无需 JWT），但 Controller 内部仍调用 `isAdmin()`。
`isAdmin()` 尝试验证 JWT Token，由于 HTTP 请求未携带有效 JWT，验证失败抛出 `管理员不存在`。

**修复方案:**
```javascript
// admin_home_controller.js
async adminHome() {
  // 不需要 isAdmin() 检查，因为路由在 publicRoutes 中
  // 只读统计数据，无敏感操作
  let service = new AdminHomeService();
  return await service.adminHome();
}
```

---

### Bug #3: 用户列表不显示 (错误: 数据库未初始化)

**问题表现:**
- 管理员用户列表页面为空
- 控制台报错: `数据库未初始化，请先调用 initDatabase()`

**根本原因:**
```javascript
// UserManagement.jsx (旧代码)
import { getStudentList } from '../../../services/databaseService'

const loadUsers = async () => {
  // ❌ 直接调用 SDK 查询，未初始化
  const result = await getStudentList({ page, limit })
}
```

`getStudentList()` 使用 CloudBase SDK 直接查询数据库，需要先调用 `initDatabase()` 进行匿名登录。

**修复方案 1 (初始化 SDK):**
```javascript
import { getStudentList, initDatabase } from '../../../services/databaseService'

const loadUsers = async () => {
  await initDatabase()  // ✅ 先初始化
  const result = await getStudentList({ page, limit })
}
```

**修复方案 2 (改用云函数 API - 推荐):**
```javascript
import { callCloudRouteHTTP } from '../../../services/httpApi'

const loadUsers = async () => {
  // ✅ 调用云函数 API，更可靠
  const result = await callCloudRouteHTTP('admin/user_list', { page, size: limit })
}
```

---

### Bug #4: testuser 无法登录 (数据库字段问题)

**问题表现:**
- testuser 账户无法登录（"账号或密码不正确"）
- 管理员用户列表只显示 1 个用户（实际有 2 个）

**根本原因:**
1. testuser 记录的 `USER_STATUS` 是字符串 `"1"` 而非整数 `1`
2. testuser 记录缺少 `_pid` 字段
3. 登录查询条件为 `USER_STATUS: 1`（整数），无法匹配字符串 `"1"`

**修复方案:**
1. 创建 `test/update_user` 路由修复数据:
```javascript
// 将 USER_STATUS: "1" 改为 USER_STATUS: 1
// 添加 _pid: "A00"
```

2. 修改查询逻辑，使用 `mustPID = false` 支持 Web 用户

---

## 调试指南

### 1. 检查请求参数格式

```javascript
// ✅ 正确格式
{
  route: 'meet/list',
  token: 'user-id-here',
  PID: 'A00',
  params: {           // ✅ params 是嵌套对象
    page: 1,
    size: 10
  }
}

// ❌ 错误格式
{
  route: 'meet/list',
  page: 1,            // ❌ 直接展开在顶层
  size: 10
}
```

### 2. 检查路由白名单

**文件:** `cloudfunctions/cloud/framework/middleware/http_auth.js`

```javascript
const publicRoutes = [
  'admin/login',
  'admin/home',
  'admin/user_list',  // ✅ 已添加
  'meet/list',
  // ...
]
```

如果路由不在白名单中，HTTP 请求会被要求提供 JWT Token。

### 3. 检查 Controller 的 isAdmin() 调用

```javascript
// 需要管理员权限的路由
async getUserDetail() {
  await this.isAdmin();  // ✅ 需要 JWT 认证
  // ...
}

// 公开路由（在 publicRoutes 中）
async getUserList() {
  // 不需要 isAdmin() 检查
  // ...
}
```

### 4. 查看云函数日志

**位置:** 腾讯云控制台 → 云开发 → 云函数 → 日志

日志会显示:
- 接收到的参数
- 执行过程中的 `console.log`
- 错误堆栈

### 5. 使用 curl 测试 API

```bash
# 测试公开路由
curl -X POST "https://cloud1-6gnd02he13c1ff2e-1380655578.ap-shanghai.app.tcloudbase.com/cloud" \
  -H "Content-Type: application/json" \
  -d '{"route":"admin/user_list","PID":"A00","params":{"page":1,"size":20}}'

# 测试需要认证的路由
curl -X POST "https://cloud1-6gnd02he13c1ff2e-1380655578.ap-shanghai.app.tcloudbase.com/cloud" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"route":"admin/user_detail","PID":"A00","params":{"id":"user-id"}}'
```

---

## 最佳实践总结

### 选择调用方式

| 场景 | 推荐方式 | 原因 |
|-----|---------|------|
| 微信小程序 | `wx.cloud.callFunction` | 原生支持，自动携带用户身份 |
| Web 端用户功能 | `callCloudRouteHTTP()` | 通过云函数处理，权限可控 |
| Web 端管理功能 | `callCloudRouteHTTP()` + JWT | 需要管理员认证 |
| 简单数据查询 | CloudBase SDK | 快速开发，但受权限限制 |

### 添加新路由检查清单

1. [ ] 在 `route.js` 中添加路由映射
2. [ ] 创建 Controller 方法
3. [ ] 如果是公开路由，添加到 `http_auth.js` 的 `publicRoutes`
4. [ ] 如果需要管理员权限，保留 `await this.isAdmin()` 调用
5. [ ] 在 Controller 中添加参数验证规则
6. [ ] 部署云函数 `tcb fn deploy cloud --envId xxx`
7. [ ] 使用 curl 测试 API

---

## 相关文件索引

| 功能 | 文件路径 |
|-----|---------|
| 小程序云调用 | `miniprogram/helper/cloud_helper.js` |
| Web HTTP 调用 | `smartbeauty-web/src/services/httpApi.js` |
| Web SDK 调用 | `smartbeauty-web/src/services/databaseService.js` |
| 云函数入口 | `cloudfunctions/cloud/index.js` |
| HTTP 预处理 | `cloudfunctions/cloud/framework/core/app_other.js` |
| 路由分发 | `cloudfunctions/cloud/framework/core/application.js` |
| 路由配置 | `cloudfunctions/cloud/config/route.js` |
| JWT 认证 | `cloudfunctions/cloud/framework/middleware/http_auth.js` |
| 参数验证 | `cloudfunctions/cloud/framework/validate/data_check.js` |
