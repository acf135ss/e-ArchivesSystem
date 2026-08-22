from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, decode_category_unlock_token
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的登录凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    if user.status != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="账号已停用"
        )
    return user


def check_category_unlocked(
    category_id: int,
    current_user: User,
    db: Session,
    x_category_unlock: str | None = Header(default=None),
) -> None:
    """校验当前用户是否已解锁指定分类（二次密码防护）。

    仅当分类设置了二次密码时强制校验；请求头 X-Category-Unlock 需携带
    有效的分类解锁 token（对应同一用户、同一分类）。
    """
    category = db.get(Category, category_id)
    if category is None or category.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="分类不存在")
    if not category.protect_password_hash:
        return  # 未设置密码，无需校验
    if not x_category_unlock:
        raise HTTPException(status_code=403, detail="该分类受二次密码保护，请先验证密码")
    parsed = decode_category_unlock_token(x_category_unlock)
    if parsed is None or parsed[0] != current_user.id or parsed[1] != category_id:
        raise HTTPException(status_code=403, detail="分类解锁凭证无效或已过期")

