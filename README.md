# 电子档案系统（e-ArchivesSystem）

用于记录和管理各类证件、获奖证书、经历证明的电子档案系统。

> **隐私说明**：本系统为纯个人私有模式，每个用户只能看到并管理自己的档案，数据严格隔离。用户自行注册账号，无需管理员。

## 技术栈

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Python + FastAPI + SQLAlchemy 2.0
- 数据库：MySQL 8.0

## 目录结构

```
e-ArchivesSystem/
├── frontend/          # 前端项目
├── backend/           # 后端项目
│   └── app/
│       ├── api/       # 路由接口
│       ├── core/      # 配置与安全
│       ├── db/        # 数据库连接与模型
│       ├── models/    # ORM 模型
│       └── schemas/   # Pydantic 模型
└── docs/              # 需求与设计文档
```

## 快速开始

### 后端

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
python -m app.db.init_db   # 初始化数据库（建库 + 建表）
uvicorn app.main:app --reload
```

> 首次部署运行 `python -m app.db.init_db` 时，会交互式提示你输入 **MySQL 用户名与密码**，程序将自动完成：
>
> 1. 创建数据库（`e_archives_system`，如不存在）；
> 2. 创建全部数据表；
> 3. 询问是否将连接信息写入 `backend/.env`（建议输入 `y`）。
>
> 也可用命令行参数非交互式初始化：
>
> ```bash
> python -m app.db.init_db --host 127.0.0.1 --port 3306 --user root --password 你的密码 --dbname e_archives_system
> ```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 使用说明

- 系统为**开放注册**模式：首次使用在登录页点击「立即注册」创建自己的账号。
- 注册成功后会自动创建该用户私有的默认分类（证件类 / 获奖证书类 / 经历证明类）。
- 每个用户只能看到并管理自己的档案、分类与附件，数据完全隔离。

## 相关文档

- [技术方案设计](docs/技术方案设计.md)
