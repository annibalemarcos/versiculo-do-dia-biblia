from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException
from app.models.bible import Reflection, Verse
from app.schemas.bible import ReflectionCreate, ReflectionUpdate, ReflectionResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/reflections", tags=["Admin Content - Reflections"])

@router.get("")
def list_reflections(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    refs = db.query(Reflection).options(
        joinedload(Reflection.verse)
    ).filter(Reflection.app_id == app_id).order_by(Reflection.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "verse_id": r.verse_id,
                "verse_reference": r.verse.reference if r.verse else None,
                "title": r.title,
                "content": r.content,
                "prayer": r.prayer,
                "author": r.author,
                "language": r.language,
                "status": r.status,
                "app_id": r.app_id,
                "created_at": r.created_at.isoformat()
            }
            for r in refs
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_reflection(
    body: ReflectionCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    ref = Reflection(
        verse_id=body.verse_id,
        title=body.title,
        content=body.content,
        prayer=body.prayer,
        author=body.author,
        language=body.language,
        status=body.status,
        app_id=body.app_id
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)

    log_admin_action(
        db=db,
        admin=admin,
        action="reflection_created",
        resource_type="reflection",
        resource_id=ref.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": ref.title}
    )

    return {"success": True, "data": {"id": ref.id, "title": ref.title}}

@router.put("/{reflection_id}")
def update_reflection(
    reflection_id: str,
    body: ReflectionUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    ref = db.query(Reflection).filter(Reflection.id == reflection_id).first()
    if not ref:
        raise NotFoundException("Reflexão não encontrada")

    if body.verse_id is not None:
        ref.verse_id = body.verse_id
    if body.title is not None:
        ref.title = body.title
    if body.content is not None:
        ref.content = body.content
    if body.prayer is not None:
        ref.prayer = body.prayer
    if body.author is not None:
        ref.author = body.author
    if body.status is not None:
        ref.status = body.status

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="reflection_updated",
        resource_type="reflection",
        resource_id=ref.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": ref.title}
    )

    return {"success": True, "message": "Reflexão atualizada com sucesso"}

@router.delete("/{reflection_id}")
def delete_reflection(
    reflection_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    ref = db.query(Reflection).filter(Reflection.id == reflection_id).first()
    if not ref:
        raise NotFoundException("Reflexão não encontrada")

    title = ref.title
    db.delete(ref)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="reflection_deleted",
        resource_type="reflection",
        resource_id=reflection_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": title}
    )

    return {"success": True, "message": "Reflexão excluída com sucesso"}
