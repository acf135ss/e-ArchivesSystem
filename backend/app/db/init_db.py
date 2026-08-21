"""数据库初始化模块。

用于首次部署时初始化数据库，自动完成：
1. 连接 MySQL 服务器，创建数据库（如不存在）；
2. 创建所有数据表；
3. 可选将连接信息写入 backend/.env。

说明：本系统采用用户开放注册，无需预置管理员账号。
每个用户注册时（`POST /api/auth/register`）会自动创建其私有的默认分类。

用法（交互式，推荐首次部署使用）：
    python -m app.db.init_db

用法（命令行参数，适合脚本化）：
    python -m app.db.init_db --host 127.0.0.1 --port 3306 --user root --password xxx --dbname e_archives_system
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path
from urllib.parse import quote_plus

from sqlalchemy import create_engine, text

from app.db.base import Base
from app.models.archive import Archive  # noqa: F401
from app.models.attachment import Attachment  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.user import User  # noqa: F401

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 3306
DEFAULT_USER = "root"
DEFAULT_DBNAME = "e_archives_system"


def _server_url(host: str, port: int, user: str, password: str) -> str:
    return f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/"


def _db_url(host: str, port: int, user: str, password: str, dbname: str) -> str:
    return (
        f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{dbname}?charset=utf8mb4"
    )


def ensure_database(host: str, port: int, user: str, password: str, dbname: str) -> None:
    """连接 MySQL 服务器并创建数据库（如不存在）。"""
    engine = create_engine(_server_url(host, port, user, password), pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{dbname}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            conn.commit()
    finally:
        engine.dispose()


def init_db(host: str, port: int, user: str, password: str, dbname: str) -> str:
    print(f"[1/2] 正在创建数据库 `{dbname}` ...")
    ensure_database(host, port, user, password, dbname)

    engine = create_engine(_db_url(host, port, user, password, dbname), pool_pre_ping=True)
    try:
        print("[2/2] 正在创建数据表 ...")
        Base.metadata.create_all(bind=engine)
    finally:
        engine.dispose()

    print("数据库初始化完成。")
    return _db_url(host, port, user, password, dbname)


def _ask(prompt: str, default: str | None = None, secret: bool = False) -> str:
    if default is not None:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    value = getpass.getpass(prompt) if secret else input(prompt)
    value = value.strip()
    return value if value else (default or "")


def _write_env(db_url: str) -> Path:
    content = f"""# 应用配置
APP_NAME=e-ArchivesSystem
APP_ENV=development
DEBUG=true

# 数据库
DATABASE_URL={db_url}

# JWT
SECRET_KEY=change-me-to-a-random-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 附件存储
STORAGE_DIR=./storage
MAX_UPLOAD_SIZE_MB=20
ALLOWED_EXTENSIONS=jpg,jpeg,png,pdf

# 到期提醒
EXPIRE_REMIND_DAYS=30
"""
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    env_path.write_text(content, encoding="utf-8")
    return env_path


def main() -> None:
    parser = argparse.ArgumentParser(description="初始化电子档案系统数据库")
    parser.add_argument("--host", default=None, help=f"MySQL 主机地址（默认 {DEFAULT_HOST}）")
    parser.add_argument("--port", type=int, default=None, help=f"MySQL 端口（默认 {DEFAULT_PORT}）")
    parser.add_argument("--user", default=None, help=f"MySQL 用户名（默认 {DEFAULT_USER}）")
    parser.add_argument("--password", default=None, help="MySQL 密码")
    parser.add_argument("--dbname", default=None, help=f"数据库名（默认 {DEFAULT_DBNAME}）")
    args = parser.parse_args()

    host = args.host or _ask("MySQL 主机地址", DEFAULT_HOST)
    port = args.port or int(_ask("MySQL 端口", str(DEFAULT_PORT)) or DEFAULT_PORT)
    user = args.user or _ask("MySQL 用户名", DEFAULT_USER)
    password = args.password if args.password is not None else _ask("MySQL 密码", secret=True)
    dbname = args.dbname or _ask("数据库名", DEFAULT_DBNAME)

    if not password:
        print("错误：MySQL 密码不能为空。", file=sys.stderr)
        sys.exit(1)

    print()
    try:
        db_url = init_db(host, port, user, password, dbname)
    except Exception as exc:  # noqa: BLE001
        print(f"\n初始化失败：{exc}", file=sys.stderr)
        print("请检查 MySQL 是否已启动、主机/端口/用户名/密码是否正确。", file=sys.stderr)
        sys.exit(1)

    write = _ask("\n是否将连接信息写入 backend/.env 文件？(y/n)", "y")
    if write.lower() in ("y", "yes", ""):
        env_path = _write_env(db_url)
        print(f"已写入配置文件：{env_path}")

    print("\n初始化完成。请运行：uvicorn app.main:app --reload")


if __name__ == "__main__":
    main()
