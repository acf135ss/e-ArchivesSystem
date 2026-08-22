"""分类业务逻辑（每个用户私有）。"""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.archive import Archive
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session, user: User, active_only: bool = False) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user.id).order_by(Category.sort, Category.id)
    if active_only:
        stmt = stmt.where(Category.is_active == 1)
    return list(db.scalars(stmt).all())


def get_category(db: Session, user: User, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None or category.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="分类不存在")
    return category


def _ensure_unique_name(db: Session, user: User, name: str, exclude_id: int | None = None) -> None:
    stmt = select(Category).where(Category.user_id == user.id, Category.name == name)
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="分类名称已存在")


def create_category(db: Session, user: User, data: CategoryCreate) -> Category:
    _ensure_unique_name(db, user, data.name)
    # 自动排序：新分类排在当前用户已有分类之后
    max_sort = db.scalar(
        select(func.max(Category.sort)).where(Category.user_id == user.id)
    )
    auto_sort = (max_sort or 0) + 1
    payload = data.model_dump()
    protect_password = payload.pop("protect_password", None)
    payload.pop("sort", None)  # 忽略前端传入的排序，始终自动递增
    category = Category(user_id=user.id, sort=auto_sort, **payload)
    if protect_password:
        category.protect_password_hash = hash_password(protect_password)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, user: User, category_id: int, data: CategoryUpdate) -> Category:
    category = get_category(db, user, category_id)
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload:
        _ensure_unique_name(db, user, payload["name"], exclude_id=category_id)

    # 二次密码：None 表示不修改；空字符串表示清除密码；非空表示设置/更新密码
    old_password = payload.pop("old_password", None)
    if "protect_password" in payload:
        protect_password = payload.pop("protect_password")
        if protect_password is None:
            pass
        elif protect_password == "":
            # 清除密码：若当前已有密码，需校验旧密码
            if category.protect_password_hash:
                if not old_password or not verify_password(
                    old_password, category.protect_password_hash
                ):
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="原密码错误")
            category.protect_password_hash = None
        else:
            # 修改密码：若当前已有密码，需校验旧密码
            if category.protect_password_hash:
                if not old_password or not verify_password(
                    old_password, category.protect_password_hash
                ):
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="原密码错误")
            category.protect_password_hash = hash_password(protect_password)

    for field, value in payload.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, user: User, category_id: int) -> None:
    category = get_category(db, user, category_id)
    count = db.scalar(
        select(func.count(Archive.id)).where(
            Archive.category_id == category_id,
            Archive.user_id == user.id,
            Archive.deleted_at.is_(None),
        )
    )
    if count:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="该分类下存在档案，无法删除"
        )
    db.delete(category)
    db.commit()


def verify_category_password(db: Session, user: User, category_id: int, password: str) -> bool:
    category = get_category(db, user, category_id)
    if not category.protect_password_hash:
        return True  # 未设置密码，无需验证
    return verify_password(password, category.protect_password_hash)
