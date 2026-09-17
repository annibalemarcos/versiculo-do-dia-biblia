from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import re
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_jwt_token
from app.core.errors import UnauthorizedException, ConflictException, NotFoundException, AppException, ValidationException
from app.core.dependencies import get_current_user_required
from app.models.user import User, UserPreference, Favorite, ReadingHistory
from app.models.app import AppConfig
from app.models.registration_field import RegistrationFieldDefinition
from app.schemas.user import (
    UserRegisterRequest, UserLoginRequest, UserTokenResponse, UserSummary, UserDetail
)

router = APIRouter(prefix="/auth", tags=["Public User Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    # Server-side enforcement: Check AppConfig for maintenance and auth activation flags
    cfg = db.query(AppConfig).filter(AppConfig.app_id == body.app_id).first()
    if cfg:
        if cfg.maintenance_mode and getattr(cfg, "maintenance_level", "informational") in ["partial", "full"]:
            raise AppException(
                code="MAINTENANCE_BLOCKED",
                message=cfg.maintenance_message or "O cadastro de novos usuários está temporariamente suspenso para manutenção.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                details={"maintenance_level": cfg.maintenance_level, "estimated_end": cfg.maintenance_estimated_end.isoformat() if cfg.maintenance_estimated_end else None}
            )
        if not getattr(cfg, "authentication_system_enabled", True):
            raise AppException(
                code="AUTH_SYSTEM_DISABLED",
                message="O sistema de contas e autenticação está temporariamente desativado pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        if not getattr(cfg, "registration_enabled", True):
            raise AppException(
                code="REGISTRATION_DISABLED",
                message="Novos cadastros estão temporariamente desativados pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        if not getattr(cfg, "local_auth_enabled", True):
            raise AppException(
                code="LOCAL_AUTH_DISABLED",
                message="O cadastro local por e-mail/senha está temporariamente desativado pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )

    clean_email = str(body.email).strip().lower()
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_email:
        raise ConflictException("Este e-mail já está cadastrado")

    clean_username = None
    if body.username:
        clean_username = body.username.strip()
        if len(clean_username) < 3 or len(clean_username) > 30:
            raise ValidationException("O nome de usuário deve conter entre 3 e 30 caracteres")
        if not re.match(r"^[a-zA-Z0-9_.-]+$", clean_username):
            raise ValidationException("O nome de usuário pode conter apenas letras, números, sublinhados, pontos ou hífens")
        existing_username = db.query(User).filter(func.lower(User.username) == clean_username.lower()).first()
        if existing_username:
            raise ConflictException("Este nome de usuário já está em uso")

    # Server-side validation of dynamic registration fields (RegistrationFieldDefinition)
    active_field_defs = db.query(RegistrationFieldDefinition).filter(
        RegistrationFieldDefinition.app_id == body.app_id,
        RegistrationFieldDefinition.is_active == True
    ).order_by(RegistrationFieldDefinition.display_order.asc()).all()

    submitted_custom = body.custom_fields or {}
    sanitized_custom = {}

    for f in active_field_defs:
        raw_val = submitted_custom.get(f.field_key)

        # Check required constraint
        if f.is_required:
            if raw_val is None or (isinstance(raw_val, str) and not raw_val.strip()) or (isinstance(raw_val, list) and len(raw_val) == 0):
                err_msg = f.error_message or f"O campo '{f.label}' é obrigatório."
                raise ValidationException(err_msg, details={"field_key": f.field_key, "label": f.label})

        # Value validations when provided
        if raw_val is not None and not (isinstance(raw_val, str) and not raw_val.strip()):
            if f.field_type in ["text", "textarea", "phone", "date"]:
                sval = str(raw_val).strip()
                if f.min_length is not None and len(sval) < f.min_length:
                    err_msg = f.error_message or f"O campo '{f.label}' deve ter no mínimo {f.min_length} caracteres."
                    raise ValidationException(err_msg, details={"field_key": f.field_key})
                if f.max_length is not None and len(sval) > f.max_length:
                    err_msg = f.error_message or f"O campo '{f.label}' deve ter no máximo {f.max_length} caracteres."
                    raise ValidationException(err_msg, details={"field_key": f.field_key})
                if f.regex_pattern:
                    if not re.match(f.regex_pattern, sval):
                        err_msg = f.error_message or f"O valor informado para '{f.label}' não atende ao formato esperado."
                        raise ValidationException(err_msg, details={"field_key": f.field_key})
                sanitized_custom[f.field_key] = sval
            elif f.field_type == "number":
                try:
                    num_val = float(raw_val) if "." in str(raw_val) else int(raw_val)
                    sanitized_custom[f.field_key] = num_val
                except (ValueError, TypeError):
                    err_msg = f.error_message or f"O campo '{f.label}' deve conter um número válido."
                    raise ValidationException(err_msg, details={"field_key": f.field_key})
            elif f.field_type == "boolean":
                sanitized_custom[f.field_key] = bool(raw_val)
            elif f.field_type == "select":
                sval = str(raw_val).strip()
                if f.options and isinstance(f.options, list):
                    allowed = [opt["value"] if isinstance(opt, dict) and "value" in opt else str(opt) for opt in f.options]
                    if sval not in allowed:
                        err_msg = f.error_message or f"Opção inválida selecionada para '{f.label}'."
                        raise ValidationException(err_msg, details={"field_key": f.field_key})
                sanitized_custom[f.field_key] = sval
            elif f.field_type == "multiselect":
                if isinstance(raw_val, list):
                    if f.options and isinstance(f.options, list):
                        allowed = [opt["value"] if isinstance(opt, dict) and "value" in opt else str(opt) for opt in f.options]
                        for item in raw_val:
                            if str(item) not in allowed:
                                err_msg = f.error_message or f"Opção '{item}' inválida para '{f.label}'."
                                raise ValidationException(err_msg, details={"field_key": f.field_key})
                    sanitized_custom[f.field_key] = raw_val
                else:
                    sanitized_custom[f.field_key] = [str(raw_val)]
            else:
                sanitized_custom[f.field_key] = raw_val

    user = User(
        email=clean_email,
        username=clean_username,
        name=body.name or clean_username or clean_email.split("@")[0],
        hashed_password=get_password_hash(body.password),
        platform=body.platform,
        app_id=body.app_id,
        is_anonymous=False,
        is_active=True,
        custom_fields=sanitized_custom
    )
    db.add(user)
    db.flush()

    # Create default user preferences
    pref = UserPreference(
        user_id=user.id,
        theme_mode="SYSTEM",
        text_scale="NORMAL",
        preferred_translation="NVI",
        notifications_enabled=True,
        notification_hour=8,
        notification_minute=0
    )
    db.add(pref)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id, claims={"scope": "user"})
    refresh_token = create_refresh_token(subject=user.id, claims={"scope": "user"})

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in_seconds": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "platform": user.platform,
                "language": user.language,
                "app_id": user.app_id,
                "is_anonymous": user.is_anonymous,
                "is_active": user.is_active,
                "is_premium": user.is_premium,
                "custom_fields": user.custom_fields or {},
                "created_at": user.created_at.isoformat()
            }
        }
    }

@router.get("/registration-fields")
def get_public_registration_fields(
    app_id: str = "verse_daily",
    db: Session = Depends(get_db)
):
    """
    Public endpoint for mobile and web clients to query active registration fields,
    their labels, placeholders, types, options, and validation rules.
    """
    fields = db.query(RegistrationFieldDefinition).filter(
        RegistrationFieldDefinition.app_id == app_id,
        RegistrationFieldDefinition.is_active == True
    ).order_by(RegistrationFieldDefinition.display_order.asc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": f.id,
                "field_key": f.field_key,
                "label": f.label,
                "placeholder": f.placeholder,
                "help_text": f.help_text,
                "field_type": f.field_type,
                "options": f.options,
                "is_required": f.is_required,
                "min_length": f.min_length,
                "max_length": f.max_length,
                "regex_pattern": f.regex_pattern,
                "error_message": f.error_message,
                "display_order": f.display_order,
                "show_in_profile": f.show_in_profile
            }
            for f in fields
        ]
    }

@router.post("/login")
def login_user(
    body: UserLoginRequest,
    db: Session = Depends(get_db)
):
    # Determine login identifier (email, username, or identifier)
    login_term = (body.identifier or body.email or body.username or "").strip()
    if not login_term or not body.password:
        raise UnauthorizedException("Informe seu e-mail ou nome de usuário e sua senha.")

    # Server-side enforcement: Check AppConfig for active auth & login flags
    cfg = db.query(AppConfig).first()
    if cfg:
        if not getattr(cfg, "authentication_system_enabled", True):
            raise AppException(
                code="AUTH_SYSTEM_DISABLED",
                message="O sistema de autenticação está temporariamente desativado pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        if not getattr(cfg, "login_enabled", True):
            raise AppException(
                code="LOGIN_DISABLED",
                message="O login de usuários está temporariamente suspenso pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        if not getattr(cfg, "local_auth_enabled", True):
            raise AppException(
                code="LOCAL_AUTH_DISABLED",
                message="O login local está temporariamente desativado pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )

    # Search by email OR username (case-insensitive)
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == login_term.lower(),
            func.lower(User.username) == login_term.lower()
        ),
        User.is_active == True
    ).first()

    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedException("Credenciais inválidas. Verifique seu e-mail/usuário e senha.")

    if getattr(user, "is_deleted", False):
        raise ValidationException("Esta conta foi excluída anteriormente.")

    access_token = create_access_token(subject=user.id, claims={"scope": "user"})
    refresh_token = create_refresh_token(subject=user.id, claims={"scope": "user"})

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in_seconds": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "platform": user.platform,
                "language": user.language,
                "app_id": user.app_id,
                "is_anonymous": user.is_anonymous,
                "is_active": user.is_active,
                "is_premium": user.is_premium,
                "created_at": user.created_at.isoformat()
            }
        }
    }

@router.post("/refresh")
def refresh_user_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    payload = decode_jwt_token(refresh_token)
    if not payload or payload.get("token_type") != "refresh":
        raise UnauthorizedException("Refresh token inválido ou expirado")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise UnauthorizedException("Usuário não encontrado")

    new_access = create_access_token(subject=user.id, claims={"scope": "user"})
    new_refresh = create_refresh_token(subject=user.id, claims={"scope": "user"})

    return {
        "success": True,
        "data": {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "Bearer",
            "expires_in_seconds": 3600
        }
    }

@router.post("/logout")
def logout_user(db: Session = Depends(get_db)):
    cfg = db.query(AppConfig).first()
    if cfg and not getattr(cfg, "logout_enabled", True):
        raise AppException(
            code="LOGOUT_DISABLED",
            message="O encerramento de sessão está temporariamente desativado pela administração.",
            status_code=status.HTTP_403_FORBIDDEN
        )
    return {"success": True, "message": "Logout realizado com sucesso"}

# /api/v1/me endpoint
user_router = APIRouter(prefix="/me", tags=["Public User Profile & Sync"])

@user_router.get("")
def get_current_user_profile(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    return {
        "success": True,
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "platform": user.platform,
            "language": user.language,
            "app_id": user.app_id,
            "is_premium": user.is_premium,
            "premium_expires_at": user.premium_expires_at.isoformat() if user.premium_expires_at else None,
            "custom_fields": user.custom_fields or {},
            "preferences": {
                "theme_mode": pref.theme_mode if pref else "SYSTEM",
                "text_scale": pref.text_scale if pref else "NORMAL",
                "preferred_translation": pref.preferred_translation if pref else "NVI",
                "notifications_enabled": pref.notifications_enabled if pref else True,
                "notification_hour": pref.notification_hour if pref else 8,
                "notification_minute": pref.notification_minute if pref else 0
            }
        }
    }

@user_router.put("")
def update_current_user_profile(
    body: Dict[str, Any],
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Update current user profile and custom fields allowed for profile editing.
    """
    if "name" in body and body["name"]:
        user.name = str(body["name"]).strip()

    if "custom_fields" in body and isinstance(body["custom_fields"], dict):
        # Fetch allowed fields for editing in profile
        profile_fields = db.query(RegistrationFieldDefinition).filter(
            RegistrationFieldDefinition.app_id == user.app_id,
            RegistrationFieldDefinition.is_active == True,
            RegistrationFieldDefinition.show_in_profile == True
        ).all()

        current_custom = dict(user.custom_fields or {})
        for pf in profile_fields:
            if pf.field_key in body["custom_fields"]:
                val = body["custom_fields"][pf.field_key]
                if pf.is_required and (val is None or (isinstance(val, str) and not val.strip())):
                    raise ValidationException(f"O campo '{pf.label}' é obrigatório.")
                current_custom[pf.field_key] = val
        user.custom_fields = current_custom

    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "message": "Perfil atualizado com sucesso!",
        "data": {
            "id": user.id,
            "name": user.name,
            "custom_fields": user.custom_fields or {}
        }
    }

@user_router.delete("")
def delete_current_user_account(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    LGPD / GDPR compliant user account deletion:
    - Marks user as deleted and inactive
    - Clears sensitive personal info (tokens, devices)
    - Deletes user favorites and reading history
    """
    user.is_deleted = True
    user.is_active = False
    user.deleted_at = utc_now()
    user.fcm_token = None
    user.device_id = None
    
    # Anonymize identifier while preserving referential integrity
    original_id = user.id
    if user.email:
        user.email = f"deleted_{original_id[:8]}@deleted.local"
    user.name = "Conta Excluída"
    user.hashed_password = None

    # Clear private data
    db.query(Favorite).filter(Favorite.user_id == user.id).delete()
    db.query(ReadingHistory).filter(ReadingHistory.user_id == user.id).delete()

    db.commit()

    return {
        "success": True,
        "message": "Sua conta foi excluída com sucesso. Todos os seus dados foram removidos."
    }

