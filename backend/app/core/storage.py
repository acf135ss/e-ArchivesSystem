"""本地磁盘附件存储工具。"""
import uuid
from pathlib import Path

from app.core.config import settings


def storage_root() -> Path:
    root = Path(settings.STORAGE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def build_stored_path(user_id: int, archive_id: int, ext: str) -> Path:
    """按 {user_id}/{archive_id}/{uuid}.{ext} 组织附件存储路径。"""
    dir_path = storage_root() / str(user_id) / str(archive_id)
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path / f"{uuid.uuid4().hex}.{ext}"
