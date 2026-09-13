from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_required
from app.core.errors import NotFoundException
from app.models.user import User, Favorite, ReadingHistory, UserPreference
from app.schemas.user import FavoriteDto, ReadingHistoryDto, PreferenceDto

router = APIRouter(prefix="/me", tags=["Public User Data Sync"])

@router.get("/favorites")
def get_user_favorites(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.saved_at.desc()).all()
    return {
        "success": True,
        "data": [
            {
                "id": f.id,
                "verse_id": f.verse_id,
                "reference": f.reference,
                "text": f.text,
                "translation": f.translation,
                "reflection": f.reflection,
                "theme": f.theme,
                "saved_at": f.saved_at.isoformat()
            }
            for f in favs
        ]
    }

@router.post("/favorites")
def add_user_favorite(
    body: FavoriteDto,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.verse_id == body.verse_id
    ).first()

    if existing:
        return {
            "success": True,
            "message": "Versículo já constava nos favoritos",
            "data": {"id": existing.id, "verse_id": existing.verse_id}
        }

    fav = Favorite(
        user_id=user.id,
        verse_id=body.verse_id,
        reference=body.reference,
        text=body.text,
        translation=body.translation,
        reflection=body.reflection,
        theme=body.theme,
        saved_at=body.saved_at or datetime.now(timezone.utc)
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)

    return {"success": True, "data": {"id": fav.id, "verse_id": fav.verse_id}}

@router.delete("/favorites/{verse_id}")
def remove_user_favorite(
    verse_id: str,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.verse_id == verse_id
    ).first()

    if fav:
        db.delete(fav)
        db.commit()

    return {"success": True, "message": "Favorito removido com sucesso"}

@router.get("/history")
def get_reading_history(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    history = db.query(ReadingHistory).filter(
        ReadingHistory.user_id == user.id
    ).order_by(ReadingHistory.read_at.desc()).limit(100).all()

    return {
        "success": True,
        "data": [
            {
                "id": h.id,
                "verse_id": h.verse_id,
                "reference": h.reference,
                "text": h.text,
                "translation": h.translation,
                "read_at": h.read_at.isoformat()
            }
            for h in history
        ]
    }

@router.post("/history", status_code=status.HTTP_201_CREATED)
def add_reading_history(
    body: ReadingHistoryDto,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    entry = ReadingHistory(
        user_id=user.id,
        verse_id=body.verse_id,
        reference=body.reference,
        text=body.text,
        translation=body.translation,
        read_at=body.read_at or datetime.now(timezone.utc)
    )
    db.add(entry)
    db.commit()
    return {"success": True, "data": {"id": entry.id}}

@router.get("/preferences")
def get_preferences(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        db.commit()

    return {
        "success": True,
        "data": {
            "theme_mode": pref.theme_mode,
            "text_scale": pref.text_scale,
            "preferred_translation": pref.preferred_translation,
            "notifications_enabled": pref.notifications_enabled,
            "notification_hour": pref.notification_hour,
            "notification_minute": pref.notification_minute,
            "custom_prefs": pref.custom_prefs
        }
    }

@router.put("/preferences")
def update_preferences(
    body: PreferenceDto,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)

    pref.theme_mode = body.theme_mode
    pref.text_scale = body.text_scale
    pref.preferred_translation = body.preferred_translation
    pref.notifications_enabled = body.notifications_enabled
    pref.notification_hour = body.notification_hour
    pref.notification_minute = body.notification_minute
    pref.custom_prefs = body.custom_prefs

    db.commit()
    return {"success": True, "message": "Preferências salvas com sucesso"}
