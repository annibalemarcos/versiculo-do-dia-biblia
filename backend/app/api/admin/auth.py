from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_jwt_token
from app.core.errors import UnauthorizedException, ForbiddenException
from app.core.dependencies import get_current_admin
from app.models.auth import AdminUser
from app.schemas.auth import LoginRequest, RefreshTokenRequest, AdminUserSummary
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/auth", tags=["Admin Authentication"])

@router.post("/login")
def admin_login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    admin = db.query(AdminUser).filter(AdminUser.email == body.email).first()
    if not admin or not admin.is_active or not verify_password(body.password, admin.hashed_password):
        log_admin_action(
            db=db,
            admin=None,
            action="admin_login_failed",
            resource_type="auth",
            ip_address=ip,
            user_agent=ua,
            meta_data={"attempted_email": body.email}
        )
        raise UnauthorizedException("Credenciais administrativas inválidas")

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Collect roles and permissions
    role_ids = [r.id for r in admin.roles]
    perm_set = set()
    for r in admin.roles:
        for p in r.permissions:
            perm_set.add(p.id)
    if admin.is_super_admin:
        perm_set.add("*")

    access_token = create_access_token(
        subject=admin.id,
        claims={"scope": "admin", "roles": role_ids, "email": admin.email}
    )
    refresh_token = create_refresh_token(
        subject=admin.id,
        claims={"scope": "admin", "roles": role_ids}
    )

    log_admin_action(
        db=db,
        admin=admin,
        action="admin_login",
        resource_type="auth",
        resource_id=admin.id,
        ip_address=ip,
        user_agent=ua
    )

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in_seconds": 3600,
            "user": {
                "id": admin.id,
                "email": admin.email,
                "name": admin.name,
                "is_active": admin.is_active,
                "is_super_admin": admin.is_super_admin,
                "roles": role_ids,
                "permissions": list(perm_set),
                "last_login_at": admin.last_login_at.isoformat()
            }
        }
    }

@router.get("/me")
def get_admin_me(admin: AdminUser = Depends(get_current_admin)):
    role_ids = [r.id for r in admin.roles]
    perm_set = set()
    for r in admin.roles:
        for p in r.permissions:
            perm_set.add(p.id)
    if admin.is_super_admin:
        perm_set.add("*")

    return {
        "success": True,
        "data": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "is_active": admin.is_active,
            "is_super_admin": admin.is_super_admin,
            "roles": role_ids,
            "permissions": list(perm_set),
            "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None
        }
    }

@router.post("/refresh")
def admin_refresh_token(
    body: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    payload = decode_jwt_token(body.refresh_token)
    if not payload or payload.get("token_type") != "refresh" or payload.get("scope") != "admin":
        raise UnauthorizedException("Refresh token inválido ou expirado")

    admin_id = payload.get("sub")
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active == True).first()
    if not admin:
        raise UnauthorizedException("Administrador não encontrado")

    role_ids = [r.id for r in admin.roles]
    access_token = create_access_token(
        subject=admin.id,
        claims={"scope": "admin", "roles": role_ids, "email": admin.email}
    )
    refresh_token = create_refresh_token(
        subject=admin.id,
        claims={"scope": "admin", "roles": role_ids}
    )

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in_seconds": 3600
        }
    }

@router.post("/logout")
def admin_logout(admin: AdminUser = Depends(get_current_admin)):
    return {"success": True, "message": "Sessão encerrada com sucesso"}
