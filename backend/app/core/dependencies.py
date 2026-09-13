from typing import Optional, List, Callable
from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_jwt_token
from app.core.errors import UnauthorizedException, ForbiddenException
from app.models.auth import AdminUser, Permission, Role
from app.models.user import User
from app.core.config import settings

def get_current_app_id(
    x_app_id: Optional[str] = Header(None, alias="X-App-ID")
) -> str:
    if x_app_id and x_app_id.strip():
        return x_app_id.strip()
    return settings.DEFAULT_APP_ID

def get_current_admin(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> AdminUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Cabeçalho de autorização Bearer ausente ou inválido")

    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)
    if not payload:
        raise UnauthorizedException("Token JWT expirado ou assinatura inválida")

    if payload.get("token_type") != "access" or payload.get("scope") != "admin":
        raise UnauthorizedException("Tipo ou escopo de token inválido para área administrativa")

    admin_id = payload.get("sub")
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active == True).first()
    if not admin:
        raise UnauthorizedException("Administrador não encontrado ou desativado")

    if getattr(admin, "approval_status", "APPROVED") == "PENDING":
        raise UnauthorizedException("Conta de administrador aguardando aprovação do Admin Master")
    if getattr(admin, "approval_status", "APPROVED") == "REJECTED":
        raise UnauthorizedException("Cadastro de administrador rejeitado")

    return admin

def require_super_admin(
    admin: AdminUser = Depends(get_current_admin)
) -> AdminUser:
    if not admin.is_super_admin:
        raise ForbiddenException("Ação exclusiva do Administrador Master")
    return admin

def require_permission(permission_id: str):
    def permission_checker(
        admin: AdminUser = Depends(get_current_admin)
    ) -> AdminUser:
        if admin.is_super_admin:
            return admin

        # Check permissions through associated roles
        has_perm = False
        for role in admin.roles:
            for perm in role.permissions:
                if perm.id == permission_id or perm.id == "*":
                    has_perm = True
                    break
            if has_perm:
                break

        if not has_perm:
            raise ForbiddenException(f"Ação não autorizada. Requer permissão: '{permission_id}'")

        return admin
    return permission_checker


def require_role(role_id: str):
    def role_checker(
        admin: AdminUser = Depends(get_current_admin)
    ) -> AdminUser:
        if admin.is_super_admin:
            return admin

        role_ids = [r.id for r in admin.roles]
        if role_id not in role_ids:
            raise ForbiddenException(f"Acesso restrito ao perfil: '{role_id}'")

        return admin
    return role_checker

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def get_current_user_required(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    if not user:
        raise UnauthorizedException("Autenticação de usuário necessária")
    return user
