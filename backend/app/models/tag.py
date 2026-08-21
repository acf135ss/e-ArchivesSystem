from sqlalchemy import BigInteger, ForeignKey, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

# 档案-标签 多对多关联表
archive_tags = Table(
    "archive_tags",
    Base.metadata,
    Column("archive_id", BigInteger, ForeignKey("archives.id"), primary_key=True),
    Column("tag_id", BigInteger, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
