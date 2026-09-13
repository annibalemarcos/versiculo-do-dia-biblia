import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.bible import Verse, Theme, Emotion, VerseTheme, VerseEmotion
from app.schemas.bible import VerseCreate, VerseUpdate, VerseResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/verses", tags=["Admin Content - Verses"])

@router.get("")
def list_verses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    book_id: Optional[str] = Query(None),
    translation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    theme_id: Optional[str] = Query(None),
    emotion_id: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Verse).options(
        joinedload(Verse.themes),
        joinedload(Verse.emotions)
    )

    if app_id:
        query = query.filter(Verse.app_id == app_id)
    if book_id:
        query = query.filter(Verse.book_id == book_id)
    if translation:
        query = query.filter(Verse.translation == translation)
    if status:
        query = query.filter(Verse.status == status)
    if theme_id:
        query = query.filter(Verse.themes.any(Theme.id == theme_id))
    if emotion_id:
        query = query.filter(Verse.emotions.any(Emotion.id == emotion_id))
    if q:
        query = query.filter(
            or_(
                Verse.text.ilike(f"%{q}%"),
                Verse.reference.ilike(f"%{q}%")
            )
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    verses = query.order_by(desc(Verse.created_at)).offset(offset).limit(limit).all()

    items = [
        {
            "id": v.id,
            "book_id": v.book_id,
            "translation": v.translation,
            "chapter": v.chapter,
            "verse_number": v.verse_number,
            "reference": v.reference,
            "text": v.text,
            "language": v.language,
            "status": v.status,
            "app_id": v.app_id,
            "themes": [t.name for t in v.themes],
            "emotions": [e.name for e in v.emotions],
            "created_at": v.created_at.isoformat(),
            "updated_at": v.updated_at.isoformat()
        }
        for v in verses
    ]

    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "has_next": page < pages,
                "has_prev": page > 1
            }
        }
    }

@router.get("/{verse_id}")
def get_verse(
    verse_id: str,
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    v = db.query(Verse).options(
        joinedload(Verse.themes),
        joinedload(Verse.emotions)
    ).filter(Verse.id == verse_id).first()

    if not v:
        raise NotFoundException(f"Versículo '{verse_id}' não encontrado")

    return {
        "success": True,
        "data": {
            "id": v.id,
            "book_id": v.book_id,
            "translation": v.translation,
            "chapter": v.chapter,
            "verse_number": v.verse_number,
            "reference": v.reference,
            "text": v.text,
            "language": v.language,
            "status": v.status,
            "app_id": v.app_id,
            "theme_ids": [t.id for t in v.themes],
            "emotion_ids": [e.id for e in v.emotions],
            "themes": [t.name for t in v.themes],
            "emotions": [e.name for e in v.emotions],
            "created_at": v.created_at.isoformat(),
            "updated_at": v.updated_at.isoformat()
        }
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_verse(
    body: VerseCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    verse = Verse(
        book_id=body.book_id,
        translation=body.translation,
        chapter=body.chapter,
        verse_number=body.verse_number,
        reference=body.reference,
        text=body.text,
        language=body.language,
        status=body.status,
        app_id=body.app_id
    )
    db.add(verse)
    db.flush()

    # Assign themes
    for t_id in body.theme_ids:
        db.add(VerseTheme(verse_id=verse.id, theme_id=t_id))
    
    # Assign emotions
    for e_id in body.emotion_ids:
        db.add(VerseEmotion(verse_id=verse.id, emotion_id=e_id))

    db.commit()
    db.refresh(verse)

    log_admin_action(
        db=db,
        admin=admin,
        action="verse_created",
        resource_type="verse",
        resource_id=verse.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"reference": verse.reference, "status": verse.status}
    )

    return {"success": True, "data": {"id": verse.id, "reference": verse.reference}}

@router.put("/{verse_id}")
def update_verse(
    verse_id: str,
    body: VerseUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise NotFoundException(f"Versículo '{verse_id}' não encontrado")

    if body.book_id is not None:
        verse.book_id = body.book_id
    if body.translation is not None:
        verse.translation = body.translation
    if body.chapter is not None:
        verse.chapter = body.chapter
    if body.verse_number is not None:
        verse.verse_number = body.verse_number
    if body.reference is not None:
        verse.reference = body.reference
    if body.text is not None:
        verse.text = body.text
    if body.language is not None:
        verse.language = body.language
    if body.status is not None:
        verse.status = body.status

    if body.theme_ids is not None:
        db.query(VerseTheme).filter(VerseTheme.verse_id == verse.id).delete()
        for t_id in body.theme_ids:
            db.add(VerseTheme(verse_id=verse.id, theme_id=t_id))

    if body.emotion_ids is not None:
        db.query(VerseEmotion).filter(VerseEmotion.verse_id == verse.id).delete()
        for e_id in body.emotion_ids:
            db.add(VerseEmotion(verse_id=verse.id, emotion_id=e_id))

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="verse_updated",
        resource_type="verse",
        resource_id=verse.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"reference": verse.reference, "status": verse.status}
    )

    return {"success": True, "message": "Versículo atualizado com sucesso"}

@router.delete("/{verse_id}")
def delete_verse(
    verse_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise NotFoundException(f"Versículo '{verse_id}' não encontrado")

    ref = verse.reference
    db.delete(verse)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="verse_deleted",
        resource_type="verse",
        resource_id=verse_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"reference": ref}
    )

    return {"success": True, "message": "Versículo excluído com sucesso"}
