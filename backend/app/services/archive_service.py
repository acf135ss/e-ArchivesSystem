"""档案业务逻辑。"""
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.archive import Archive
from app.models.tag import Tag
from app.models.user import User
from app.schemas.archive import ArchiveCreate, ArchiveUpdate


def _resolve_tags(db: Session, names: list[str]) -> list[Tag]:
    """根据名称解析标签，不存在则自动创建（标签不区分用户，按名称共享）。"""
    tags: list[Tag] = []
    seen: set[str] = set()
    for raw in names:
        name = raw.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        tag = db.scalar(select(Tag).where(Tag.name == name))
        if tag is None:
            tag = Tag(name=name)
            db.add(tag)
        tags.append(tag)
    return tags


def list_archives(
    db: Session,
    current_user: User,
    *,
    keyword: str | None = None,
    category_id: int | None = None,
    tag: str | None = None,
    issue_date_from: date | None = None,
    issue_date_to: date | None = None,
    expire_date_from: date | None = None,
    expire_date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Archive], int]:
    conditions = [Archive.deleted_at.is_(None), Archive.user_id == current_user.id]

    if keyword:
        like = f"%{keyword}%"
        conditions.append(
            or_(
                Archive.name.like(like),
                Archive.issuer.like(like),
                Archive.cert_no.like(like),
                Archive.holder.like(like),
                Archive.remark.like(like),
                Archive.related_experience.like(like),
            )
        )
    if category_id is not None:
        conditions.append(Archive.category_id == category_id)
    if tag:
        conditions.append(Archive.tags.any(Tag.name == tag))
    if issue_date_from is not None:
        conditions.append(Archive.issue_date >= issue_date_from)
    if issue_date_to is not None:
        conditions.append(Archive.issue_date <= issue_date_to)
    if expire_date_from is not None:
        conditions.append(Archive.expire_date >= expire_date_from)
    if expire_date_to is not None:
        conditions.append(Archive.expire_date <= expire_date_to)

    total = db.scalar(select(func.count(Archive.id)).where(*conditions)) or 0
    stmt = (
        select(Archive)
        .where(*conditions)
        .order_by(Archive.created_at.desc(), Archive.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(stmt).all())
    return items, total


def get_archive(db: Session, current_user: User, archive_id: int) -> Archive:
    archive = db.get(Archive, archive_id)
    if archive is None or archive.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="档案不存在")
    if archive.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="无权访问该档案")
    return archive


def create_archive(db: Session, current_user: User, data: ArchiveCreate) -> Archive:
    archive = Archive(
        user_id=current_user.id,
        category_id=data.category_id,
        name=data.name,
        issuer=data.issuer,
        issue_date=data.issue_date,
        expire_date=data.expire_date,
        cert_no=data.cert_no,
        grade=data.grade,
        holder=data.holder or current_user.real_name or current_user.username,
        remark=data.remark,
        related_experience=data.related_experience,
        tags=_resolve_tags(db, data.tags),
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)
    return archive


def update_archive(
    db: Session, current_user: User, archive_id: int, data: ArchiveUpdate
) -> Archive:
    archive = get_archive(db, current_user, archive_id)
    payload = data.model_dump(exclude_unset=True)
    tags = payload.pop("tags", None)
    for field, value in payload.items():
        setattr(archive, field, value)
    if tags is not None:
        archive.tags = _resolve_tags(db, tags)
    db.commit()
    db.refresh(archive)
    return archive


def delete_archive(db: Session, current_user: User, archive_id: int) -> None:
    archive = get_archive(db, current_user, archive_id)
    archive.deleted_at = datetime.now()
    db.commit()


def list_expiring(db: Session, current_user: User) -> list[Archive]:
    """即将到期：有效期在未来且在提醒窗口内。"""
    today = date.today()
    deadline = today + timedelta(days=settings.EXPIRE_REMIND_DAYS)
    conditions = [Archive.deleted_at.is_(None), Archive.user_id == current_user.id]
    conditions.append(Archive.expire_date >= today)
    conditions.append(Archive.expire_date <= deadline)
    return list(
        db.scalars(
            select(Archive).where(*conditions).order_by(Archive.expire_date.asc())
        ).all()
    )


def list_expired(db: Session, current_user: User) -> list[Archive]:
    """已过期：有效期早于今天。"""
    today = date.today()
    conditions = [Archive.deleted_at.is_(None), Archive.user_id == current_user.id]
    conditions.append(Archive.expire_date < today)
    return list(
        db.scalars(
            select(Archive).where(*conditions).order_by(Archive.expire_date.asc())
        ).all()
    )
