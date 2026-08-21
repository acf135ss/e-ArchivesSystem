# 项目长期记忆（e-ArchivesSystem）

## 项目概况
- 电子档案系统：管理证件/证书/经历证明，Web 前后端分离。
- 技术栈：前端 React + TypeScript + Vite + Ant Design（5.x）；后端 Python + FastAPI + SQLAlchemy 2.0；数据库 MySQL 8.0。
- 权限模型：**纯个人私有 + 开放注册**。每个用户只能看到并管理自己的档案；**无管理员角色**；用户自行注册账号（`POST /api/auth/register`）。

## 关键技术约定
- **SQLAlchemy 用同步 Session**（`db/session.py`），不要改异步（方案文档写异步是历史偏差）。
- **数据隔离**在 service 层实现：**所有数据严格按 `user_id == 当前用户` 隔离**（档案、分类、附件、统计），无管理员旁路。
- **软删除**：档案用 `deleted_at` 标记，列表默认过滤。
- **附件**：本地磁盘 `storage/{user_id}/{archive_id}/{uuid}.{ext}`；限 20MB；格式 jpg/jpeg/png/pdf；下载/删除需校验权限（仅本人）。
- **到期提醒**：实时计算（`EXPIRE_REMIND_DAYS` 默认 30 天），不持久化提醒记录，未用 APScheduler。
- **数据库**：库名 `e_archives_system`；无预置账号；**用户注册时自动初始化其私有默认分类**「证件类/获奖证书类/经历证明类」。
- **分类私有**：`categories` 表有 `user_id` 字段，每个用户私有，注册时复制默认三大分类。
- **数据库初始化**：`app/db/init_db.py` 交互式输入 MySQL 用户名/密码/库名 → 自动建库（utf8mb4）+ `create_all` 建表，可选写入 `backend/.env`。首次部署无需手动建库。
- **未引入 Alembic**（用 `create_all` 兜底建表）。
- **密码哈希**：`core/security.py` **直接用 `bcrypt` 库**（hashpw/checkpw，超 72 字节截断）；**不要用 `passlib`**（passlib 1.7.4 与 bcrypt 4.x+ 不兼容，会崩溃）。
- **已移除**：管理员角色（`role` 字段）、操作日志（`operation_logs` 表/服务/接口/页面）、用户管理功能。

## 目录结构
- `backend/app/`：`api/`(路由) `core/`(配置/安全/存储) `db/`(连接/init) `models/` `schemas/` `services/`(业务)
- `frontend/src/`：`api/` `components/`(AppLayout/RequireAuth) `pages/`(login/dashboard/archive/category/user/log) `store/`(auth)
- `docs/`：需求规格说明书、技术方案设计、开发进度记录

## 状态
- P1~P4 主体功能已完成；剩余 P5 联调测试（需 MySQL）+ 部署。
