from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["认证"])

DEFAULT_CATEGORIES = [
    {"name": "证件类", "description": "个人身份与学历相关证件", "sort": 1},
    {"name": "获奖证书类", "description": "各类荣誉与考试成绩证书", "sort": 2},
    {"name": "经历证明类", "description": "工作与实习经历证明", "sort": 3},
]


def _init_user_categories(db: Session, user_id: int) -> None:
    """为新注册用户初始化默认三大分类。"""
    for c in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, **c))


def ensure_default_categories(db: Session, user: User) -> None:
    """兜底：若用户没有任何分类，自动补齐默认三大分类（覆盖历史账号）。"""
    has_any = db.scalar(
        select(Category.id).where(Category.user_id == user.id).limit(1)
    )
    if has_any is None:
        _init_user_categories(db, user.id)
        db.commit()


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == body.username)) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名已存在")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        real_name=body.real_name,
    )
    db.add(user)
    db.flush()
    _init_user_categories(db, user.id)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误"
        )
    if user.status != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="账号已停用"
        )
    ensure_default_categories(db, user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_default_categories(db, current_user)
    return UserOut.model_validate(current_user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="原密码错误"
        )
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "密码修改成功"}
