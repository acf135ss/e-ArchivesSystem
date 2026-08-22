"""附件管理接口。"""
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import check_category_unlocked, get_current_user
from app.core.config import settings
from app.core.storage import build_stored_path
from app.db.session import get_db
from app.models.archive import Archive
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.archive import AttachmentOut
from app.services import archive_service

router = APIRouter(tags=["附件"])


def _check_attachment_access(db: Session, current_user: User, attachment: Attachment) -> None:
    archive = db.get(Archive, attachment.archive_id)
    if archive is None:
        raise HTTPException(status_code=404, detail="档案不存在")
    if archive.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该附件")


@router.post("/archives/{archive_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    archive_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive = archive_service.get_archive(db, current_user, archive_id)

    filename = file.filename or "attachment"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型：{ext or '未知'}，仅支持 {settings.ALLOWED_EXTENSIONS}",
        )

    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制（{settings.MAX_UPLOAD_SIZE_MB}MB）",
        )

    stored_path = build_stored_path(archive.user_id, archive.id, ext)
    stored_path.write_bytes(content)

    attachment = Attachment(
        archive_id=archive.id,
        filename=filename,
        stored_path=str(stored_path),
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_category_unlock: str | None = Header(default=None),
):
    attachment = db.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="附件不存在")
    _check_attachment_access(db, current_user, attachment)
    check_category_unlocked(
        attachment.archive.category_id, current_user, db, x_category_unlock
    )

    path = Path(attachment.stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="附件文件缺失")
    return FileResponse(path, filename=attachment.filename, media_type=attachment.content_type)


@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="附件不存在")
    _check_attachment_access(db, current_user, attachment)

    path = Path(attachment.stored_path)
    if path.exists():
        path.unlink(missing_ok=True)
    db.delete(attachment)
    db.commit()
    return {"message": "删除成功"}
