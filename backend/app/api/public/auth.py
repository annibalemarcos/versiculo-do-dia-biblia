from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_jwt_token
from app.core.errors import UnauthorizedException, ConflictException, NotFoundException
from app.core.dependencies import get_current_user_required
from app.models.user import User, UserPreference
from app.schemas.user import (
    UserRegisterRequest, UserLoginRequest, UserTokenResponse, UserSummary, UserDetail
)

router = APIRouter(prefix="/auth", tags=["Public User Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise ConflictException("Este e-mail já está cadastrado")

    user = User(
        email=body.email,
        name=body.name or body.email.split("@")[0],
        hashed_password=get_password_hash(body.password),
        platform=body.platform,
        app_id=body.app_id,
        is_anonymous=False,
        is_active=True
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

@router.post("/login")
def login_user(
    body: UserLoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedException("Credenciais inválidas. Verifique seu e-mail e senha.")

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
def logout_user():
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

