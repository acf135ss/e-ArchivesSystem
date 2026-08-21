from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，从环境变量 / .env 文件加载。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "e-ArchivesSystem"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # 数据库
    DATABASE_URL: str = (
        "mysql+pymysql://root:password@127.0.0.1:3306/e_archives_system?charset=utf8mb4"
    )

    # JWT
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # 附件存储
    STORAGE_DIR: str = "./storage"
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,pdf"

    # 到期提醒
    EXPIRE_REMIND_DAYS: int = 30

    @property
    def allowed_extensions(self) -> list[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

    @property
    def max_upload_size(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
