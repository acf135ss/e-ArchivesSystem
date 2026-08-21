"""首页统计概览接口。"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.archive import Archive
from app.models.attachment import Attachment
from app.models.category import Category
from app.models.user import User
from app.schemas.dashboard import CategoryCount, DashboardStats

router = APIRouter(prefix="/dashboard", tags=["统计"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [Archive.deleted_at.is_(None), Archive.user_id == current_user.id]
    total = db.scalar(select(func.count(Archive.id)).where(*conditions)) or 0

    today = date.today()
    deadline = today + timedelta(days=settings.EXPIRE_REMIND_DAYS)
    expiring = db.scalar(
        select(func.count(Archive.id)).where(
            *conditions,
            Archive.expire_date >= today,
            Archive.expire_date <= deadline,
        )
    ) or 0
    expired = db.scalar(
        select(func.count(Archive.id)).where(
            *conditions,
            Archive.expire_date < today,
        )
    ) or 0

    attachment_count = db.scalar(
        select(func.count(Attachment.id))
        .join(Archive, Attachment.archive_id == Archive.id)
        .where(*conditions)
    ) or 0

    rows = db.execute(
        select(Category.id, Category.name, func.count(Archive.id))
        .join(Archive, Archive.category_id == Category.id)
        .where(*conditions)
        .group_by(Category.id, Category.name)
        .order_by(Category.sort, Category.id)
    ).all()
    distribution = [
        CategoryCount(category_id=cid, category_name=name, count=cnt)
        for cid, name, cnt in rows
    ]

    return DashboardStats(
        total_archives=total,
        expiring_count=expiring,
        expired_count=expired,
        attachment_count=attachment_count,
        category_distribution=distribution,
    )
