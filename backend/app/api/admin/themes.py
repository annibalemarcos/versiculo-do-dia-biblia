from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.bible import Theme, VerseTheme
from app.schemas.bible import ThemeCreate, ThemeUpdate, ThemeResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/themes", tags=["Admin Content - Themes"])

@router.get("")
def list_themes(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    themes = db.query(Theme).filter(Theme.app_id == app_id).order_by(Theme.sort_order.asc()).all()
    
    results = []
    for t in themes:
        cnt = db.query(func.count(VerseTheme.verse_id)).filter(VerseTheme.theme_id == t.id).scalar() or 0
        results.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "description": t.description,
            "icon_name": t.icon_name,
            "color_hex": t.color_hex,
            "sort_order": t.sort_order,
            "status": t.status,
            "app_id": t.app_id,
            "verses_count": cnt
        })

    return {"success": True, "data": results}

@router.post("", status_code=status.HTTP_201_CREATED)
def create_theme(
    body: ThemeCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(Theme).filter(Theme.id == body.id).first()
    if existing:
        raise ConflictException(f"Tema com id '{body.id}' já existe")

    theme = Theme(
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
    db.add(theme)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="theme_created",
        resource_type="theme",
        resource_id=theme.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": theme.name}
    )

    return {"success": True, "data": {"id": theme.id, "name": theme.name}}

@router.put("/{theme_id}")
def update_theme(
    theme_id: str,
    body: ThemeUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise NotFoundException("Tema não encontrado")

    if body.name is not None:
        theme.name = body.name
    if body.slug is not None:
        theme.slug = body.slug
    if body.description is not None:
        theme.description = body.description
    if body.icon_name is not None:
        theme.icon_name = body.icon_name
    if body.color_hex is not None:
        theme.color_hex = body.color_hex
    if body.sort_order is not None:
        theme.sort_order = body.sort_order
    if body.status is not None:
        theme.status = body.status

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="theme_updated",
        resource_type="theme",
        resource_id=theme.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": theme.name}
    )

    return {"success": True, "message": "Tema atualizado com sucesso"}

@router.delete("/{theme_id}")
def delete_theme(
    theme_id: str,
    request: Request,
    admin = Depends(require_permission("content.delete")),
    db: Session = Depends(get_db)
):
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise NotFoundException("Tema não encontrado")

    name = theme.name
    db.delete(theme)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="theme_deleted",
        resource_type="theme",
        resource_id=theme_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": name}
    )

    return {"success": True, "message": "Tema excluído com sucesso"}
