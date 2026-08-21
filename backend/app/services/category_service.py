"""分类业务逻辑（每个用户私有）。"""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

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
    payload.pop("sort", None)  # 忽略前端传入的排序，始终自动递增
    category = Category(user_id=user.id, sort=auto_sort, **payload)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, user: User, category_id: int, data: CategoryUpdate) -> Category:
    category = get_category(db, user, category_id)
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload:
        _ensure_unique_name(db, user, payload["name"], exclude_id=category_id)
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
