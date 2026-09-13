from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.bible import Devotional, DevotionalDay
from app.schemas.bible import DevotionalCreate, DevotionalUpdate, DevotionalResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/devotionals", tags=["Admin Content - Devotionals"])

@router.get("")
def list_devotionals(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    devotionals = db.query(Devotional).options(
        joinedload(Devotional.days)
    ).filter(Devotional.app_id == app_id).order_by(Devotional.created_at.desc()).all()

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
                "is_premium": d.is_premium,
                "status": d.status,
                "days_count": len(d.days),
                "created_at": d.created_at.isoformat()
            }
            for d in devotionals
        ]
    }

@router.get("/{devotional_id}")
def get_devotional(
    devotional_id: str,
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    d = db.query(Devotional).options(
        joinedload(Devotional.days)
    ).filter(Devotional.id == devotional_id).first()

    if not d:
        raise NotFoundException("Plano Devocional não encontrado")

    return {
        "success": True,
        "data": {
            "id": d.id,
            "title": d.title,
            "slug": d.slug,
            "description": d.description,
            "cover_image_url": d.cover_image_url,
            "total_days": d.total_days,
            "is_premium": d.is_premium,
            "status": d.status,
            "app_id": d.app_id,
            "days": [
                {
                    "id": day.id,
                    "day_number": day.day_number,
                    "title": day.title,
                    "verse_reference": day.verse_reference,
                    "verse_text": day.verse_text,
                    "reflection": day.reflection,
                    "prayer": day.prayer,
                    "reading_passage": day.reading_passage
                }
                for day in sorted(d.days, key=lambda x: x.day_number)
            ]
        }
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_devotional(
    body: DevotionalCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(Devotional).filter(Devotional.id == body.id).first()
    if existing:
        raise ConflictException(f"Devocional com identificador '{body.id}' já existe")

    devotional = Devotional(
        id=body.id,
        title=body.title,
        slug=body.slug,
        description=body.description,
        cover_image_url=body.cover_image_url,
        total_days=body.total_days,
        is_premium=body.is_premium,
        language=body.language,
        status=body.status,
        app_id=body.app_id
    )
    db.add(devotional)
    db.flush()

    for d in body.days:
        day_entity = DevotionalDay(
            devotional_id=devotional.id,
            day_number=d.day_number,
            title=d.title,
            verse_reference=d.verse_reference,
            verse_text=d.verse_text,
            reflection=d.reflection,
            prayer=d.prayer,
            reading_passage=d.reading_passage
        )
        db.add(day_entity)

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="devotional_created",
        resource_type="devotional",
        resource_id=devotional.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": devotional.title, "total_days": devotional.total_days}
    )

    return {"success": True, "data": {"id": devotional.id, "title": devotional.title}}

@router.put("/{devotional_id}")
def update_devotional(
    devotional_id: str,
    body: DevotionalUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    devotional = db.query(Devotional).filter(Devotional.id == devotional_id).first()
    if not devotional:
        raise NotFoundException("Devocional não encontrado")

    if body.title is not None:
        devotional.title = body.title
    if body.slug is not None:
        devotional.slug = body.slug
    if body.description is not None:
        devotional.description = body.description
    if body.cover_image_url is not None:
        devotional.cover_image_url = body.cover_image_url
    if body.total_days is not None:
        devotional.total_days = body.total_days
    if body.is_premium is not None:
        devotional.is_premium = body.is_premium
    if body.status is not None:
        devotional.status = body.status

    if body.days is not None:
        db.query(DevotionalDay).filter(DevotionalDay.devotional_id == devotional.id).delete()
        for d in body.days:
            db.add(
                DevotionalDay(
                    devotional_id=devotional.id,
                    day_number=d.day_number,
                    title=d.title,
                    verse_reference=d.verse_reference,
                    verse_text=d.verse_text,
                    reflection=d.reflection,
                    prayer=d.prayer,
                    reading_passage=d.reading_passage
                )
            )

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="devotional_updated",
        resource_type="devotional",
        resource_id=devotional.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": devotional.title}
    )

    return {"success": True, "message": "Devocional atualizado com sucesso"}

@router.delete("/{devotional_id}")
def delete_devotional(
    devotional_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    devotional = db.query(Devotional).filter(Devotional.id == devotional_id).first()
    if not devotional:
        raise NotFoundException("Devocional não encontrado")

    title = devotional.title
    db.delete(devotional)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="devotional_deleted",
        resource_type="devotional",
        resource_id=devotional_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": title}
    )

    return {"success": True, "message": "Devocional excluído com sucesso"}
