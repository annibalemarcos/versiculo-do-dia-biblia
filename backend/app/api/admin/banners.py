import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, BadRequestException
from app.models.banner import Banner
from app.schemas.banner import BannerCreate, BannerUpdate, BannerResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/banners", tags=["Admin Content - Banners"])

@router.get("")
def list_admin_banners(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    placement: Optional[str] = Query(None),
    target_audience: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Banner)

    if app_id:
        query = query.filter(Banner.app_id == app_id)
    if placement:
        query = query.filter(Banner.placement == placement)
    if target_audience:
        query = query.filter(Banner.target_audience == target_audience)
    if is_active is not None:
        query = query.filter(Banner.is_active == is_active)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Banner.title.ilike(term),
                Banner.subtitle.ilike(term),
                Banner.description.ilike(term)
            )
        )

    total = query.count()
    banners = query.order_by(desc(Banner.priority), desc(Banner.created_at))\
                   .offset((page - 1) * limit)\
                   .limit(limit)\
                   .all()

    items = [
        {
            "id": b.id,
            "app_id": b.app_id,
            "title": b.title,
            "subtitle": b.subtitle,
            "description": b.description,
            "image_url": b.image_url,
            "badge_text": b.badge_text,
            "placement": b.placement,
            "target_audience": b.target_audience,
            "action_type": b.action_type,
            "action_url": b.action_url,
            "action_label": b.action_label,
            "secondary_action_label": b.secondary_action_label,
            "priority": b.priority,
            "is_active": b.is_active,
            "starts_at": b.starts_at.isoformat() if b.starts_at else None,
            "expires_at": b.expires_at.isoformat() if b.expires_at else None,
            "dismissible": b.dismissible,
            "bg_color": b.bg_color,
            "text_color": b.text_color,
            "max_impressions": b.max_impressions,
            "impression_count": b.impression_count,
            "click_count": b.click_count,
            "created_by": b.created_by,
            "created_at": b.created_at.isoformat(),
            "updated_at": b.updated_at.isoformat()
        }
        for b in banners
    ]

    return {
        "success": True,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1,
        "data": items
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_admin_banner(
    body: BannerCreate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    admin_identifier = getattr(admin, "id", None) or getattr(admin, "email", "admin")

    banner = Banner(
        app_id=body.app_id,
        title=body.title,
        subtitle=body.subtitle,
        description=body.description,
        image_url=body.image_url,
        badge_text=body.badge_text,
        placement=body.placement,
        target_audience=body.target_audience,
        action_type=body.action_type,
        action_url=body.action_url,
        action_label=body.action_label,
        secondary_action_label=body.secondary_action_label,
        priority=body.priority,
        is_active=body.is_active,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
        dismissible=body.dismissible,
        bg_color=body.bg_color,
        text_color=body.text_color,
        max_impressions=body.max_impressions,
        created_by=admin_identifier
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)

    log_admin_action(
        db=db,
        admin=admin,
        action="banner_created",
        resource_type="banner",
        resource_id=banner.id,
        ip_address=request.client.host if request.client else None,
        meta_data={
            "title": banner.title,
            "placement": banner.placement,
            "target_audience": banner.target_audience,
            "priority": banner.priority,
            "is_active": banner.is_active
        }
    )

    return {
        "success": True,
        "message": "Banner criado com sucesso",
        "data": {
            "id": banner.id,
            "title": banner.title,
            "placement": banner.placement,
            "priority": banner.priority,
            "is_active": banner.is_active
        }
    }

@router.get("/{banner_id}")
def get_admin_banner(
    banner_id: str = Path(...),
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise NotFoundException("Banner não encontrado")

    return {
        "success": True,
        "data": {
            "id": banner.id,
            "app_id": banner.app_id,
            "title": banner.title,
            "subtitle": banner.subtitle,
            "description": banner.description,
            "image_url": banner.image_url,
            "badge_text": banner.badge_text,
            "placement": banner.placement,
            "target_audience": banner.target_audience,
            "action_type": banner.action_type,
            "action_url": banner.action_url,
            "action_label": banner.action_label,
            "secondary_action_label": banner.secondary_action_label,
            "priority": banner.priority,
            "is_active": banner.is_active,
            "starts_at": banner.starts_at.isoformat() if banner.starts_at else None,
            "expires_at": banner.expires_at.isoformat() if banner.expires_at else None,
            "dismissible": banner.dismissible,
            "bg_color": banner.bg_color,
            "text_color": banner.text_color,
            "max_impressions": banner.max_impressions,
            "impression_count": banner.impression_count,
            "click_count": banner.click_count,
            "created_by": banner.created_by,
            "created_at": banner.created_at.isoformat(),
            "updated_at": banner.updated_at.isoformat()
        }
    }

@router.put("/{banner_id}")
def update_admin_banner(
    banner_id: str,
    body: BannerUpdate,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise NotFoundException("Banner não encontrado")

    update_fields = body.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(banner, field, value)

    db.commit()
    db.refresh(banner)

    log_admin_action(
        db=db,
        admin=admin,
        action="banner_updated",
        resource_type="banner",
        resource_id=banner.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"updated_fields": list(update_fields.keys())}
    )

    return {"success": True, "message": "Banner atualizado com sucesso"}

@router.delete("/{banner_id}")
def delete_admin_banner(
    banner_id: str,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise NotFoundException("Banner não encontrado")

    db.delete(banner)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="banner_deleted",
        resource_type="banner",
        resource_id=banner_id,
        ip_address=request.client.host if request.client else None
    )

    return {"success": True, "message": "Banner excluído com sucesso"}

@router.patch("/{banner_id}/toggle")
def toggle_admin_banner(
    banner_id: str,
    request: Request,
    admin = Depends(require_permission("content.write")),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise NotFoundException("Banner não encontrado")

    banner.is_active = not banner.is_active
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="banner_toggled",
        resource_type="banner",
        resource_id=banner_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"is_active": banner.is_active}
    )

    return {
        "success": True,
        "is_active": banner.is_active,
        "data": {"is_active": banner.is_active},
        "message": f"Banner {'ativado' if banner.is_active else 'pausado'} com sucesso"
    }
