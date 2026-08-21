from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.category import CategoryOut


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_size: int
    content_type: str
    created_at: datetime


class ArchiveBase(BaseModel):
    name: str
    category_id: int
    issuer: str | None = None
    issue_date: date | None = None
    expire_date: date | None = None
    cert_no: str | None = None
    grade: str | None = None
    holder: str | None = None
    remark: str | None = None
    related_experience: str | None = None
    tags: list[str] = []


class ArchiveCreate(ArchiveBase):
    pass


class ArchiveUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    issuer: str | None = None
    issue_date: date | None = None
    expire_date: date | None = None
    cert_no: str | None = None
    grade: str | None = None
    holder: str | None = None
    remark: str | None = None
    related_experience: str | None = None
    tags: list[str] | None = None


class ArchiveOut(ArchiveBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    attachments: list[AttachmentOut] = []
    created_at: datetime
    updated_at: datetime
