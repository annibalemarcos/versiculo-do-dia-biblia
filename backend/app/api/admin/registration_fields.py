from typing import Optional, List, Dict, Any
import re
from fastapi import APIRouter, Depends, Query, Path, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, BadRequestException, ConflictException, ValidationException
from app.models.registration_field import RegistrationFieldDefinition
from app.models.user import User
from app.schemas.registration_field import (
    RegistrationFieldAdminDto,
    RegistrationFieldCreatePayload,
    RegistrationFieldUpdatePayload,
    RegistrationFieldReorderPayload
)
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/registration-fields", tags=["Admin Settings - Registration Fields"])

@router.get("", response_model=Dict[str, Any])
def list_registration_fields(
    app_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_required: Optional[bool] = Query(None),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    """
    List all dynamic registration field definitions ordered by display_order.
    """
    query = db.query(RegistrationFieldDefinition)
    if app_id:
        query = query.filter(RegistrationFieldDefinition.app_id == app_id)
    if is_active is not None:
        query = query.filter(RegistrationFieldDefinition.is_active == is_active)
    if is_required is not None:
        query = query.filter(RegistrationFieldDefinition.is_required == is_required)

    fields = query.order_by(RegistrationFieldDefinition.display_order.asc(), RegistrationFieldDefinition.created_at.asc()).all()

    # Calculate user fill rates for each field
    # Fetch count of total users for this app_id
    total_users_q = db.query(User).filter(User.is_deleted == False)
    if app_id:
        total_users_q = total_users_q.filter(User.app_id == app_id)
    total_users = total_users_q.count()

    items = []
    for f in fields:
        # Check filled count in JSON
        # In SQLite/Postgres, we can count users where custom_fields is not null
        filled_count = 0
        if total_users > 0:
            # Check users with non-empty key
            users_with_custom = db.query(User.custom_fields).filter(
                User.is_deleted == False,
                User.app_id == f.app_id if app_id else True
            ).all()
            for u in users_with_custom:
                cf = u[0]
                if isinstance(cf, dict) and cf.get(f.field_key) not in [None, "", []]:
                    filled_count += 1

        fill_rate = round((filled_count / total_users) * 100, 1) if total_users > 0 else 0.0

        items.append({
            "id": f.id,
            "app_id": f.app_id,
            "field_key": f.field_key,
            "label": f.label,
            "placeholder": f.placeholder,
            "help_text": f.help_text,
            "field_type": f.field_type,
            "options": f.options,
            "is_required": f.is_required,
            "is_active": f.is_active,
            "min_length": f.min_length,
            "max_length": f.max_length,
            "regex_pattern": f.regex_pattern,
            "error_message": f.error_message,
            "display_order": f.display_order,
            "show_in_profile": f.show_in_profile,
            "show_in_export": f.show_in_export,
            "filled_count": filled_count,
            "fill_rate": fill_rate,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None
        })

    return {
        "success": True,
        "data": items,
        "total": len(items),
        "total_users": total_users
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_registration_field(
    body: RegistrationFieldCreatePayload,
    request: Request,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    """
    Create a new dynamic registration field definition.
    """
    # Validate field_key format: alphanumeric and underscore only, must start with letter
    clean_key = body.field_key.strip().lower()
    if not re.match(r"^[a-z][a-z0-9_]{1,49}$", clean_key):
        raise ValidationException(
            "A chave do campo (field_key) deve começar com uma letra e conter apenas letras minúsculas, números e sublinhados (ex: 'telefone_celular', 'igreja_origem')."
        )

    # Check for reserved keys
    reserved_keys = ["id", "email", "username", "password", "name", "platform", "language", "app_id", "is_active", "is_premium", "created_at"]
    if clean_key in reserved_keys:
        raise ConflictException(f"A chave '{clean_key}' é reservada pelo sistema.")

    # Check uniqueness per app_id
    existing = db.query(RegistrationFieldDefinition).filter(
        RegistrationFieldDefinition.app_id == body.app_id,
        RegistrationFieldDefinition.field_key == clean_key
    ).first()
    if existing:
        raise ConflictException(f"Já existe um campo cadastrado com a chave '{clean_key}' para este aplicativo.")

    # Determine next display_order if 0
    display_order = body.display_order
    if display_order == 0:
        max_order = db.query(func.max(RegistrationFieldDefinition.display_order))\
                      .filter(RegistrationFieldDefinition.app_id == body.app_id)\
                      .scalar()
        display_order = (max_order or 0) + 1

    field = RegistrationFieldDefinition(
        app_id=body.app_id,
        field_key=clean_key,
        label=body.label.strip(),
        placeholder=body.placeholder.strip() if body.placeholder else None,
        help_text=body.help_text.strip() if body.help_text else None,
        field_type=body.field_type,
        options=body.options,
        is_required=body.is_required,
        is_active=body.is_active,
        min_length=body.min_length,
        max_length=body.max_length,
        regex_pattern=body.regex_pattern,
        error_message=body.error_message,
        display_order=display_order,
        show_in_profile=body.show_in_profile,
        show_in_export=body.show_in_export
    )
    db.add(field)
    db.commit()
    db.refresh(field)

    log_admin_action(
        db=db,
        admin=admin,
        action="create_registration_field",
        resource_type="registration_field",
        resource_id=field.id,
        details={
            "app_id": field.app_id,
            "field_key": field.field_key,
            "label": field.label,
            "field_type": field.field_type,
            "is_required": field.is_required
        },
        request=request
    )

    return {
        "success": True,
        "message": f"Campo '{field.label}' cadastrado com sucesso!",
        "data": {
            "id": field.id,
            "app_id": field.app_id,
            "field_key": field.field_key,
            "label": field.label,
            "field_type": field.field_type,
            "is_required": field.is_required,
            "is_active": field.is_active,
            "display_order": field.display_order
        }
    }

@router.get("/{field_id}")
def get_registration_field(
    field_id: str = Path(...),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    field = db.query(RegistrationFieldDefinition).filter(RegistrationFieldDefinition.id == field_id).first()
    if not field:
        raise NotFoundException("Campo de cadastro não encontrado.")
    return {"success": True, "data": field}

@router.put("/{field_id}")
def update_registration_field(
    body: RegistrationFieldUpdatePayload,
    request: Request,
    field_id: str = Path(...),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    field = db.query(RegistrationFieldDefinition).filter(RegistrationFieldDefinition.id == field_id).first()
    if not field:
        raise NotFoundException("Campo de cadastro não encontrado.")

    if body.label is not None:
        field.label = body.label.strip()
    if body.placeholder is not None:
        field.placeholder = body.placeholder.strip() or None
    if body.help_text is not None:
        field.help_text = body.help_text.strip() or None
    if body.field_type is not None:
        field.field_type = body.field_type
    if body.options is not None:
        field.options = body.options
    if body.is_required is not None:
        field.is_required = body.is_required
    if body.is_active is not None:
        field.is_active = body.is_active
    if body.min_length is not None:
        field.min_length = body.min_length
    if body.max_length is not None:
        field.max_length = body.max_length
    if body.regex_pattern is not None:
        field.regex_pattern = body.regex_pattern
    if body.error_message is not None:
        field.error_message = body.error_message
    if body.display_order is not None:
        field.display_order = body.display_order
    if body.show_in_profile is not None:
        field.show_in_profile = body.show_in_profile
    if body.show_in_export is not None:
        field.show_in_export = body.show_in_export

    db.commit()
    db.refresh(field)

    log_admin_action(
        db=db,
        admin=admin,
        action="update_registration_field",
        resource_type="registration_field",
        resource_id=field.id,
        details={
            "app_id": field.app_id,
            "field_key": field.field_key,
            "label": field.label,
            "is_required": field.is_required,
            "is_active": field.is_active
        },
        request=request
    )

    return {
        "success": True,
        "message": f"Campo '{field.label}' atualizado com sucesso!",
        "data": {
            "id": field.id,
            "field_key": field.field_key,
            "label": field.label,
            "field_type": field.field_type,
            "is_required": field.is_required,
            "is_active": field.is_active,
            "display_order": field.display_order
        }
    }

@router.patch("/{field_id}/toggle-active")
def toggle_field_active(
    request: Request,
    field_id: str = Path(...),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    field = db.query(RegistrationFieldDefinition).filter(RegistrationFieldDefinition.id == field_id).first()
    if not field:
        raise NotFoundException("Campo de cadastro não encontrado.")

    field.is_active = not field.is_active
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="toggle_registration_field_active",
        resource_type="registration_field",
        resource_id=field.id,
        details={"field_key": field.field_key, "is_active": field.is_active},
        request=request
    )

    return {
        "success": True,
        "message": f"Campo {'ativado' if field.is_active else 'desativado'} com sucesso!",
        "data": {"id": field.id, "is_active": field.is_active}
    }

@router.patch("/{field_id}/toggle-required")
def toggle_field_required(
    request: Request,
    field_id: str = Path(...),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    field = db.query(RegistrationFieldDefinition).filter(RegistrationFieldDefinition.id == field_id).first()
    if not field:
        raise NotFoundException("Campo de cadastro não encontrado.")

    field.is_required = not field.is_required
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="toggle_registration_field_required",
        resource_type="registration_field",
        resource_id=field.id,
        details={"field_key": field.field_key, "is_required": field.is_required},
        request=request
    )

    return {
        "success": True,
        "message": f"Campo agora é {'obrigatório' if field.is_required else 'opcional'}!",
        "data": {"id": field.id, "is_required": field.is_required}
    }

@router.post("/reorder")
def reorder_registration_fields(
    body: RegistrationFieldReorderPayload,
    request: Request,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    """
    Bulk update display order of registration fields.
    """
    for item in body.items:
        db.query(RegistrationFieldDefinition).filter(
            RegistrationFieldDefinition.id == item.id
        ).update({"display_order": item.display_order})

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="reorder_registration_fields",
        resource_type="registration_field",
        details={"items_count": len(body.items)},
        request=request
    )

    return {"success": True, "message": "Ordem dos campos atualizada com sucesso!"}

@router.delete("/{field_id}")
def delete_registration_field(
    request: Request,
    field_id: str = Path(...),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    field = db.query(RegistrationFieldDefinition).filter(RegistrationFieldDefinition.id == field_id).first()
    if not field:
        raise NotFoundException("Campo de cadastro não encontrado.")

    deleted_label = field.label
    deleted_key = field.field_key
    app_id = field.app_id

    db.delete(field)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="delete_registration_field",
        resource_type="registration_field",
        resource_id=field_id,
        details={"app_id": app_id, "field_key": deleted_key, "label": deleted_label},
        request=request
    )

    return {"success": True, "message": f"Campo '{deleted_label}' removido com sucesso."}
