from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    description: str | None = None
    sort: int = 0
    is_active: int = 1


class CategoryCreate(CategoryBase):
    protect_password: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sort: int | None = None
    is_active: int | None = None
    protect_password: str | None = None
    old_password: str | None = None  # 修改/清除密码时需校验旧密码


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    is_protected: bool = False
    created_at: datetime


class CategoryVerifyRequest(BaseModel):
    password: str
