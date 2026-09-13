from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.bible import Emotion, VerseEmotion
from app.schemas.bible import EmotionCreate, EmotionUpdate, EmotionResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/emotions", tags=["Admin Content - Emotions"])

@router.get("")
def list_emotions(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    emotions = db.query(Emotion).filter(Emotion.app_id == app_id).order_by(Emotion.sort_order.asc()).all()
    
    results = []
    for e in emotions:
        cnt = db.query(func.count(VerseEmotion.verse_id)).filter(VerseEmotion.emotion_id == e.id).scalar() or 0
        results.append({
            "id": e.id,
            "name": e.name,
            "slug": e.slug,
            "description": e.description,
            "icon_name": e.icon_name,
            "color_hex": e.color_hex,
            "sort_order": e.sort_order,
            "status": e.status,
            "app_id": e.app_id,
            "verses_count": cnt
        })

    return {"success": True, "data": results}

@router.post("", status_code=status.HTTP_201_CREATED)
def create_emotion(
    body: EmotionCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(Emotion).filter(Emotion.id == body.id).first()
    if existing:
        raise ConflictException(f"Emoção com id '{body.id}' já existe")

    emotion = Emotion(
        id=body.id,
        name=body.name,
        slug=body.slug,
        description=body.description,
        icon_name=body.icon_name,
        color_hex=body.color_hex,
        sort_order=body.sort_order,
        status=body.status,
        app_id=body.app_id
    )
    db.add(emotion)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="emotion_created",
        resource_type="emotion",
        resource_id=emotion.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": emotion.name}
    )

    return {"success": True, "data": {"id": emotion.id, "name": emotion.name}}

@router.put("/{emotion_id}")
def update_emotion(
    emotion_id: str,
    body: EmotionUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    emotion = db.query(Emotion).filter(Emotion.id == emotion_id).first()
    if not emotion:
        raise NotFoundException("Sentimento/Emoção não encontrado")

    if body.name is not None:
        emotion.name = body.name
    if body.slug is not None:
        emotion.slug = body.slug
    if body.description is not None:
        emotion.description = body.description
    if body.icon_name is not None:
        emotion.icon_name = body.icon_name
    if body.color_hex is not None:
        emotion.color_hex = body.color_hex
    if body.sort_order is not None:
        emotion.sort_order = body.sort_order
    if body.status is not None:
        emotion.status = body.status

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="emotion_updated",
        resource_type="emotion",
        resource_id=emotion.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": emotion.name}
    )

    return {"success": True, "message": "Sentimento/Emoção atualizado com sucesso"}

@router.delete("/{emotion_id}")
def delete_emotion(
    emotion_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    emotion = db.query(Emotion).filter(Emotion.id == emotion_id).first()
    if not emotion:
        raise NotFoundException("Sentimento/Emoção não encontrado")

    name = emotion.name
    db.delete(emotion)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="emotion_deleted",
        resource_type="emotion",
        resource_id=emotion_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": name}
    )

    return {"success": True, "message": "Sentimento/Emoção excluído com sucesso"}
