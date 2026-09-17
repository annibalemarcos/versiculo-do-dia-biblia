from datetime import date, datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.bible import DailyVerse, Verse, Theme
from app.schemas.bible import DailyVerseCreate, DailyVerseUpdate, DailyVerseResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/daily-verses", tags=["Admin Content - Daily Verses"])

@router.get("")
def list_daily_verses(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    app_id: Optional[str] = Query(None),
    limit: int = Query(60, ge=1, le=365),
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    query = db.query(DailyVerse).options(
        joinedload(DailyVerse.verse),
        joinedload(DailyVerse.theme)
    )

    if app_id:
        query = query.filter(DailyVerse.app_id == app_id)
    if start_date:
        query = query.filter(DailyVerse.target_date >= start_date)
    if end_date:
        query = query.filter(DailyVerse.target_date <= end_date)

    items = query.order_by(DailyVerse.target_date.asc()).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": dv.id,
                "target_date": dv.target_date.isoformat(),
                "verse_id": dv.verse_id,
                "reference": dv.verse.reference if dv.verse else "Desconhecido",
                "verse_text": dv.verse.text if dv.verse else "",
                "translation": dv.verse.translation if dv.verse else "NVI",
                "reflection_title": dv.reflection_title,
                "reflection_text": dv.reflection_text,
                "prayer_text": dv.prayer_text,
                "theme_id": dv.theme_id,
                "theme_name": dv.theme.name if dv.theme else None,
                "background_image_url": dv.background_image_url,
                "status": dv.status,
                "app_id": dv.app_id
            }
            for dv in items
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_or_schedule_daily_verse(
    body: DailyVerseCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    # Verify verse exists
    verse = db.query(Verse).filter(Verse.id == body.verse_id).first()
    if not verse:
        raise NotFoundException(f"Versículo '{body.verse_id}' não encontrado")

    # Check for duplicate consecutive verse scheduling
    prev_day = body.target_date - timedelta(days=1)
    prev_dv = db.query(DailyVerse).filter(
        DailyVerse.app_id == body.app_id,
        DailyVerse.target_date == prev_day
    ).first()
    if prev_dv and prev_dv.verse_id == body.verse_id:
        raise ConflictException("Aviso: O versículo selecionado já está agendado no dia imediatamente anterior. Escolha outro versículo para manter a variedade diária.")

    # Check if a daily verse is already scheduled on target_date
    existing = db.query(DailyVerse).filter(
        DailyVerse.target_date == body.target_date,
        DailyVerse.app_id == body.app_id
    ).first()

    if existing:
        existing.verse_id = body.verse_id
        existing.reflection_title = body.reflection_title
        existing.reflection_text = body.reflection_text
        existing.prayer_text = body.prayer_text
        existing.theme_id = body.theme_id
        existing.background_image_url = body.background_image_url
        existing.status = body.status
        db.commit()
        dv_id = existing.id
        action = "daily_verse_updated"
    else:
        dv = DailyVerse(
            target_date=body.target_date,
            verse_id=body.verse_id,
            reflection_title=body.reflection_title,
            reflection_text=body.reflection_text,
            prayer_text=body.prayer_text,
            theme_id=body.theme_id,
            background_image_url=body.background_image_url,
            status=body.status,
            app_id=body.app_id
        )
        db.add(dv)
        db.commit()
        db.refresh(dv)
        dv_id = dv.id
        action = "daily_verse_created"

    log_admin_action(
        db=db,
        admin=admin,
        action=action,
        resource_type="daily_verse",
        resource_id=dv_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"target_date": body.target_date.isoformat(), "verse_reference": verse.reference}
    )

    return {"success": True, "data": {"id": dv_id, "target_date": body.target_date.isoformat()}}

@router.put("/{daily_verse_id}")
def update_daily_verse(
    daily_verse_id: str,
    body: DailyVerseUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    dv = db.query(DailyVerse).filter(DailyVerse.id == daily_verse_id).first()
    if not dv:
        raise NotFoundException("Agendamento de Versículo do Dia não encontrado")

    if body.verse_id is not None:
        verse = db.query(Verse).filter(Verse.id == body.verse_id).first()
        if not verse:
            raise NotFoundException(f"Versículo '{body.verse_id}' não encontrado")
        dv.verse_id = body.verse_id

    if body.target_date is not None:
        dv.target_date = body.target_date
    if body.reflection_title is not None:
        dv.reflection_title = body.reflection_title
    if body.reflection_text is not None:
        dv.reflection_text = body.reflection_text
    if body.prayer_text is not None:
        dv.prayer_text = body.prayer_text
    if body.theme_id is not None:
        dv.theme_id = body.theme_id
    if body.background_image_url is not None:
        dv.background_image_url = body.background_image_url
    if body.status is not None:
        dv.status = body.status

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="daily_verse_updated",
        resource_type="daily_verse",
        resource_id=dv.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"target_date": dv.target_date.isoformat()}
    )

    return {"success": True, "data": {"id": dv.id, "target_date": dv.target_date.isoformat()}}

@router.delete("/{daily_verse_id}")
def delete_daily_verse(
    daily_verse_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    dv = db.query(DailyVerse).filter(DailyVerse.id == daily_verse_id).first()
    if not dv:
        raise NotFoundException("Agendamento de Versículo do Dia não encontrado")

    d_date = dv.target_date.isoformat()
    db.delete(dv)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="daily_verse_deleted",
        resource_type="daily_verse",
        resource_id=daily_verse_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"target_date": d_date}
    )

    return {"success": True, "message": "Agendamento removido com sucesso"}
