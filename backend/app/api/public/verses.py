from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_app_id
from app.core.errors import NotFoundException
from app.models.bible import (
    Verse, DailyVerse, Book, Theme, Emotion, Devotional, DevotionalDay, BibleTranslation
)

router = APIRouter(tags=["Public Bible Content"])

@router.get("/verses/daily")
def get_daily_verse(
    target_date: Optional[date] = Query(None),
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    query_date = target_date or date.today()
    
    # Attempt to find scheduled daily verse for this date and app
    dv = db.query(DailyVerse).options(
        joinedload(DailyVerse.verse),
        joinedload(DailyVerse.theme)
    ).filter(
        DailyVerse.app_id == app_id,
        DailyVerse.target_date == query_date
    ).first()

    if not dv:
        # Fallback to the latest scheduled daily verse or first published verse
        dv = db.query(DailyVerse).options(
            joinedload(DailyVerse.verse),
            joinedload(DailyVerse.theme)
        ).filter(DailyVerse.app_id == app_id).order_by(DailyVerse.target_date.desc()).first()

    if not dv:
        # Fallback to any published verse
        verse = db.query(Verse).filter(Verse.status == "published").first()
        if not verse:
            raise NotFoundException("Nenhum versículo cadastrado no sistema")
        return {
            "success": True,
            "data": {
                "id": "daily-fallback",
                "target_date": query_date.isoformat(),
                "verse_id": verse.id,
                "reference": verse.reference,
                "text": verse.text,
                "translation": verse.translation,
                "reflection_title": "Mensagem de Fé",
                "reflection_text": "Deus cuida de você em todos os momentos.",
                "prayer_text": "Senhor, guia os meus passos e renova as minhas forças hoje. Amém.",
                "theme_name": "Fé",
                "background_image_url": None
            }
        }

    return {
        "success": True,
        "data": {
            "id": dv.id,
            "target_date": dv.target_date.isoformat(),
            "verse_id": dv.verse_id,
            "reference": dv.verse.reference if dv.verse else "Bíblia Sagrada",
            "text": dv.verse.text if dv.verse else "",
            "translation": dv.verse.translation if dv.verse else "NVI",
            "reflection_title": dv.reflection_title or "Reflexão do Dia",
            "reflection_text": dv.reflection_text or "",
            "prayer_text": dv.prayer_text or "",
            "theme_name": dv.theme.name if dv.theme else None,
            "background_image_url": dv.background_image_url
        }
    }

@router.get("/verses/search")
def search_verses(
    q: str = Query(..., min_length=2),
    translation: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Verse).filter(Verse.status == "published")
    if translation:
        query = query.filter(Verse.translation == translation)
    
    search_filter = or_(
        Verse.text.ilike(f"%{q}%"),
        Verse.reference.ilike(f"%{q}%")
    )
    results = query.filter(search_filter).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": v.id,
                "book_id": v.book_id,
                "translation": v.translation,
                "chapter": v.chapter,
                "verse_number": v.verse_number,
                "reference": v.reference,
                "text": v.text
            }
            for v in results
        ]
    }

@router.get("/verses/{verse_id}")
def get_verse_by_id(
    verse_id: str,
    db: Session = Depends(get_db)
):
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise NotFoundException(f"Versículo '{verse_id}' não encontrado")
    
    return {
        "success": True,
        "data": {
            "id": verse.id,
            "book_id": verse.book_id,
            "translation": verse.translation,
            "chapter": verse.chapter,
            "verse_number": verse.verse_number,
            "reference": verse.reference,
            "text": verse.text,
            "language": verse.language
        }
    }

@router.get("/books")
def get_books(db: Session = Depends(get_db)):
    books = db.query(Book).order_by(Book.number.asc()).all()
    return {
        "success": True,
        "data": [
            {
                "id": b.id,
                "number": b.number,
                "name": b.name,
                "testament": b.testament,
                "chapters_count": b.chapters_count
            }
            for b in books
        ]
    }

@router.get("/themes")
def get_themes(
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    themes = db.query(Theme).filter(
        Theme.app_id == app_id,
        Theme.status == "published"
    ).order_by(Theme.sort_order.asc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "description": t.description,
                "icon_name": t.icon_name,
                "color_hex": t.color_hex
            }
            for t in themes
        ]
    }

@router.get("/emotions")
def get_emotions(
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    emotions = db.query(Emotion).filter(
        Emotion.app_id == app_id,
        Emotion.status == "published"
    ).order_by(Emotion.sort_order.asc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "name": e.name,
                "slug": e.slug,
                "description": e.description,
                "icon_name": e.icon_name,
                "color_hex": e.color_hex
            }
            for e in emotions
        ]
    }

@router.get("/devotionals")
def get_devotionals(
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    devotionals = db.query(Devotional).filter(
        Devotional.app_id == app_id,
        Devotional.status == "published"
    ).order_by(Devotional.publication_date.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": d.id,
                "title": d.title,
                "slug": d.slug,
                "description": d.description,
                "cover_image_url": d.cover_image_url,
                "total_days": d.total_days,
                "is_premium": d.is_premium
            }
            for d in devotionals
        ]
    }

@router.get("/devotionals/{devotional_id}")
def get_devotional_detail(
    devotional_id: str,
    db: Session = Depends(get_db)
):
    devotional = db.query(Devotional).options(
        joinedload(Devotional.days)
    ).filter(Devotional.id == devotional_id).first()

    if not devotional:
        raise NotFoundException(f"Devocional '{devotional_id}' não encontrado")

    return {
        "success": True,
        "data": {
            "id": devotional.id,
            "title": devotional.title,
            "slug": devotional.slug,
            "description": devotional.description,
            "cover_image_url": devotional.cover_image_url,
            "total_days": devotional.total_days,
            "is_premium": devotional.is_premium,
            "days": [
                {
                    "day_number": day.day_number,
                    "title": day.title,
                    "verse_reference": day.verse_reference,
                    "verse_text": day.verse_text,
                    "reflection": day.reflection,
                    "prayer": day.prayer,
                    "reading_passage": day.reading_passage
                }
                for day in sorted(devotional.days, key=lambda x: x.day_number)
            ]
        }
    }
