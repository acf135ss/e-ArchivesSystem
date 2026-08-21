from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.tag import archive_tags


class Archive(Base, TimestampMixin):
    __tablename__ = "archives"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expire_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    cert_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    holder: Mapped[str | None] = mapped_column(String(50), nullable=True)
    remark: Mapped[str | None] = mapped_column(Text, nullable=True)
    related_experience: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    category = relationship("Category", lazy="joined")
    tags = relationship("Tag", secondary=archive_tags, lazy="selectin")
    attachments = relationship("Attachment", back_populates="archive", lazy="selectin")
