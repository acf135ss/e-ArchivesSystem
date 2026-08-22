"""档案管理接口。"""
from datetime import date

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import check_category_unlocked, get_current_user
from app.core.security import decode_category_unlock_token
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.archive import ArchiveCreate, ArchiveOut, ArchiveUpdate
from app.schemas.common import Page
from app.services import archive_service, excel_service

router = APIRouter(prefix="/archives", tags=["档案"])

XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("", response_model=Page[ArchiveOut])
def list_archives(
    keyword: str | None = None,
    category_id: int | None = None,
    tag: str | None = None,
    issue_date_from: date | None = None,
    issue_date_to: date | None = None,
    expire_date_from: date | None = None,
    expire_date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = archive_service.list_archives(
        db,
        current_user,
        keyword=keyword,
        category_id=category_id,
        tag=tag,
        issue_date_from=issue_date_from,
        issue_date_to=issue_date_to,
        expire_date_from=expire_date_from,
        expire_date_to=expire_date_to,
        page=page,
        page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ArchiveOut)
def create_archive(
    data: ArchiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return archive_service.create_archive(db, current_user, data)


@router.get("/expiring", response_model=list[ArchiveOut])
def list_expiring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return archive_service.list_expiring(db, current_user)


@router.get("/expired", response_model=list[ArchiveOut])
def list_expired(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return archive_service.list_expired(db, current_user)


@router.get("/export")
def export_archives(
    keyword: str | None = None,
    category_id: int | None = None,
    tag: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_category_unlock: str | None = Header(default=None),
):
    items, _ = archive_service.list_archives(
        db,
        current_user,
        keyword=keyword,
        category_id=category_id,
        tag=tag,
        page=1,
        page_size=100000,
    )
    # 收集结果集中所有受保护分类，逐个校验是否已解锁
    protected_ids = {
        a.category_id
        for a in items
        if a.category is not None and a.category.protect_password_hash
    }
    if protected_ids:
        # 解析前端传来的解锁 token（支持多个，逗号分隔），得到已解锁的 category_id 集合
        unlocked_ids: set[int] = set()
        for t in (x_category_unlock or "").split(","):
            t = t.strip()
            if not t:
                continue
            parsed = decode_category_unlock_token(t)
            if parsed is not None and parsed[0] == current_user.id:
                unlocked_ids.add(parsed[1])
        for cid in protected_ids:
            if cid in unlocked_ids:
                continue
            category = db.get(Category, cid)
            name = category.name if category else str(cid)
            raise HTTPException(
                status_code=403,
                detail=f"分类「{name}」受二次密码保护，请先验证密码",
            )
    buf = excel_service.build_export_workbook(items)
    return StreamingResponse(
        buf,
        media_type=XLSX_MEDIA,
        headers={"Content-Disposition": "attachment; filename=archives.xlsx"},
    )


@router.get("/import/template")
def download_import_template():
    buf = excel_service.build_template_workbook()
    return StreamingResponse(
        buf,
        media_type=XLSX_MEDIA,
        headers={"Content-Disposition": "attachment; filename=import_template.xlsx"},
    )


@router.post("/import")
def import_archives(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = file.file.read()
    rows = excel_service.parse_import_rows(content)
    categories = {
        c.name: c
        for c in db.scalars(select(Category).where(Category.user_id == current_user.id)).all()
    }

    errors: list[str] = []
    created = 0
    for idx, row in enumerate(rows, start=2):
        name = str(row.get("档案名称") or "").strip()
        cat_name = str(row.get("分类") or "").strip()
        if not name:
            errors.append(f"第 {idx} 行：档案名称不能为空")
            continue
        category = categories.get(cat_name)
        if category is None:
            errors.append(f"第 {idx} 行：分类「{cat_name}」不存在")
            continue

        issue_date = excel_service.parse_date_cell(row.get("颁发日期"))
        expire_date = excel_service.parse_date_cell(row.get("有效期至"))
        tag_text = str(row.get("标签") or "").replace("、", ",").replace(";", ",")
        tags = [t.strip() for t in tag_text.split(",") if t.strip()]

        archive_service.create_archive(
            db,
            current_user,
            ArchiveCreate(
                name=name,
                category_id=category.id,
                issuer=str(row.get("颁发机构") or "").strip() or None,
                issue_date=issue_date,
                expire_date=expire_date,
                cert_no=str(row.get("证书编号") or "").strip() or None,
                grade=str(row.get("等级/成绩") or "").strip() or None,
                holder=str(row.get("持有人") or "").strip() or None,
                related_experience=str(row.get("关联经历") or "").strip() or None,
                remark=str(row.get("备注") or "").strip() or None,
                tags=tags,
            ),
        )
        created += 1

    return {"created": created, "errors": errors}


@router.get("/{archive_id}", response_model=ArchiveOut)
def get_archive(
    archive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_category_unlock: str | None = Header(default=None),
):
    archive = archive_service.get_archive(db, current_user, archive_id)
    check_category_unlocked(
        archive.category_id, current_user, db, x_category_unlock
    )
    return archive


@router.put("/{archive_id}", response_model=ArchiveOut)
def update_archive(
    archive_id: int,
    data: ArchiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return archive_service.update_archive(db, current_user, archive_id, data)


@router.delete("/{archive_id}")
def delete_archive(
    archive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    archive_service.delete_archive(db, current_user, archive_id)
    return {"message": "删除成功"}
