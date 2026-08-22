"""分类管理接口（用户私有）。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_category_unlock_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CategoryVerifyRequest,
)
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["分类"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_service.list_categories(db, current_user, active_only=active_only)


@router.post("", response_model=CategoryOut)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_service.create_category(db, current_user, data)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_service.update_category(db, current_user, category_id, data)


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category_service.delete_category(db, current_user, category_id)
    return {"message": "删除成功"}


@router.post("/{category_id}/verify-password")
def verify_category_password(
    category_id: int,
    data: CategoryVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not category_service.verify_category_password(
        db, current_user, category_id, data.password
    ):
        raise HTTPException(status_code=400, detail="密码错误")
    unlock_token = create_category_unlock_token(current_user.id, category_id)
    return {"message": "验证通过", "unlock_token": unlock_token}
