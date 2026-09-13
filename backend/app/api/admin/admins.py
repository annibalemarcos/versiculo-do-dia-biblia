from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import require_permission, get_current_admin, require_super_admin
from app.core.errors import NotFoundException, ConflictException, ForbiddenException, BadRequestException
from app.models.auth import AdminUser, Role, Permission, AdminUserRole, RolePermission, StaffChangeRequest
from app.schemas.auth import (
    AdminUserCreate, AdminUserUpdate, RoleCreate, RoleUpdate,
    StaffChangeRequestCreate, StaffChangeRequestReview
)
from app.services.audit_service import log_admin_action
from app.services.staff_notification_service import (
    notify_all_masters, create_staff_notification
)
from app.models.base import utc_now

router = APIRouter(prefix="/admins", tags=["Admin Team & RBAC Management"])

# --- Admin Users Management ---
@router.get("")
def list_admins(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Check if user has permission to view staff or manage admins
    has_perm = admin.is_super_admin
    if not has_perm:
        for r in admin.roles:
            if r.can_manage_staff or r.is_department_master:
                has_perm = True
                break
            for p in r.permissions:
                if p.id in ["admins.manage", "staff.view", "*"]:
                    has_perm = True
                    break
            if has_perm:
                break
    
    if not has_perm:
        raise ForbiddenException("Ação não autorizada. Requer permissão de equipe ou administrador")

    users = db.query(AdminUser).options(
        joinedload(AdminUser.roles)
    ).order_by(AdminUser.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "is_active": u.is_active,
                "is_super_admin": u.is_super_admin,
                "department": getattr(u, "department", "general"),
                "approval_status": getattr(u, "approval_status", "APPROVED"),
                "roles": [r.name for r in u.roles],
                "role_ids": [r.id for r in u.roles],
                "is_department_master": any(r.is_department_master for r in u.roles),
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ]
    }

@router.get("/hierarchy")
def get_staff_hierarchy(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns organizational hierarchy by departments with leaders and subordinates.
    """
    users = db.query(AdminUser).options(joinedload(AdminUser.roles)).filter(AdminUser.is_active == True).all()

    departments_map = {
        "management": {"name": "Diretoria & Gestão Geral", "masters": [], "members": []},
        "content": {"name": "Conteúdo Bíblico & Editorial", "masters": [], "members": []},
        "monetization": {"name": "Monetização & Publicidade", "masters": [], "members": []},
        "support": {"name": "Atendimento & Suporte ao Usuário", "masters": [], "members": []},
        "general": {"name": "Geral", "masters": [], "members": []}
    }

    for u in users:
        dept = getattr(u, "department", "general")
        if dept not in departments_map:
            departments_map[dept] = {"name": dept.capitalize(), "masters": [], "members": []}
        
        is_master = u.is_super_admin or any(r.is_department_master for r in u.roles)
        user_info = {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_super_admin": u.is_super_admin,
            "roles": [r.name for r in u.roles],
            "role_ids": [r.id for r in u.roles],
            "approval_status": getattr(u, "approval_status", "APPROVED"),
            "is_master": is_master
        }

        if is_master:
            departments_map[dept]["masters"].append(user_info)
        else:
            departments_map[dept]["members"].append(user_info)

    return {
        "success": True,
        "data": departments_map
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_admin_user(
    body: AdminUserCreate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(AdminUser).filter(AdminUser.email == body.email).first()
    if existing:
        raise ConflictException("Já existe um administrador com este e-mail")

    # Check permission
    is_master = current_admin.is_super_admin or any(r.is_department_master or r.can_manage_staff for r in current_admin.roles)
    has_admin_perm = False
    for r in current_admin.roles:
        for p in r.permissions:
            if p.id in ["admins.manage", "staff.request_create", "staff.manage_department", "*"]:
                has_admin_perm = True
                break
        if has_admin_perm:
            break

    if not current_admin.is_super_admin and not is_master and not has_admin_perm:
        raise ForbiddenException("Ação não autorizada para cadastrar membros na equipe")

    department = body.department or "general"
    # If not super admin, non-masters must stay in own department
    if not current_admin.is_super_admin and current_admin.department != department:
        department = current_admin.department

    # If created directly by Super Admin -> APPROVED immediately
    if current_admin.is_super_admin:
        user = AdminUser(
            email=body.email,
            name=body.name,
            hashed_password=get_password_hash(body.password),
            is_active=body.is_active,
            is_super_admin="super_admin" in body.roles,
            department=department,
            approval_status="APPROVED"
        )
        db.add(user)
        db.flush()

        for r_id in body.roles:
            db.add(AdminUserRole(admin_user_id=user.id, role_id=r_id))

        db.commit()
        db.refresh(user)

        log_admin_action(
            db=db,
            admin=current_admin,
            action="admin_user_created",
            resource_type="admin_user",
            resource_id=user.id,
            ip_address=request.client.host if request.client else None,
            meta_data={"email": user.email, "roles": body.roles, "status": "APPROVED"}
        )

        return {"success": True, "data": {"id": user.id, "email": user.email, "status": "APPROVED"}}

    # If created by Department Master -> Create as PENDING and submit StaffChangeRequest
    user = AdminUser(
        email=body.email,
        name=body.name,
        hashed_password=get_password_hash(body.password),
        is_active=body.is_active,
        is_super_admin=False,
        department=department,
        approval_status="PENDING"
    )
    db.add(user)
    db.flush()

    for r_id in body.roles:
        if r_id != "super_admin":
            db.add(AdminUserRole(admin_user_id=user.id, role_id=r_id))

    primary_role_id = body.roles[0] if body.roles else None

    # Create change request for Admin Master
    change_req = StaffChangeRequest(
        request_type="CREATE_STAFF",
        target_user_id=user.id,
        target_user_email=user.email,
        target_user_name=user.name,
        requested_role_id=primary_role_id,
        requested_department=department,
        requested_by_admin_id=current_admin.id,
        reason=body.reason or f"Inclusão de novo membro no departamento {department} solicitada por {current_admin.name}",
        status="PENDING"
    )
    db.add(change_req)
    db.flush()

    # Notify Master Admins
    notify_all_masters(
        db=db,
        type="STAFF_REQUEST_CREATED",
        title="Nova Solicitação de Membro de Equipe",
        message=f"{current_admin.name} solicitou a inclusão de {user.name} ({user.email}) para o departamento {department}.",
        target_type="staff_request",
        target_id=change_req.id,
        action_url="/team"
    )

    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="staff_creation_requested",
        resource_type="staff_change_request",
        resource_id=change_req.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"target_email": user.email, "department": department}
    )

    return {
        "success": True,
        "data": {
            "id": user.id,
            "email": user.email,
            "status": "PENDING",
            "message": "Solicitação de cadastro criada com sucesso e enviada para aprovação do Administrador Master."
        }
    }

@router.put("/{admin_id}")
def update_admin_user(
    admin_id: str,
    body: AdminUserUpdate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not user:
        raise NotFoundException("Administrador não encontrado")

    # Protect root super_admin from deactivation or de-escalation by others
    if user.is_super_admin and not current_admin.is_super_admin:
        raise ForbiddenException("Não é permitido alterar dados do Super Administrador")

    if user.email == "admin@versiculododia.com" and body.is_active is False:
        raise ForbiddenException("O Super Administrador principal do sistema não pode ser desativado")

    # If Super Admin, direct update
    if current_admin.is_super_admin:
        if body.name is not None:
            user.name = body.name
        if body.email is not None:
            user.email = body.email
        if body.password is not None and body.password.strip():
            user.hashed_password = get_password_hash(body.password)
        if body.department is not None:
            user.department = body.department
        if body.is_active is not None:
            user.is_active = body.is_active

        if body.roles is not None:
            db.query(AdminUserRole).filter(AdminUserRole.admin_user_id == user.id).delete()
            for r_id in body.roles:
                db.add(AdminUserRole(admin_user_id=user.id, role_id=r_id))
            user.is_super_admin = "super_admin" in body.roles

        db.commit()

        log_admin_action(
            db=db,
            admin=current_admin,
            action="admin_user_updated",
            resource_type="admin_user",
            resource_id=user.id,
            ip_address=request.client.host if request.client else None,
            meta_data={"email": user.email, "is_active": user.is_active}
        )

        return {"success": True, "message": "Administrador atualizado com sucesso"}

    # Department Master trying to change role or department -> Generate StaffChangeRequest
    if body.roles is not None or body.department is not None:
        target_role = body.roles[0] if (body.roles and len(body.roles) > 0) else None
        prev_role = user.roles[0].id if user.roles else None

        change_req = StaffChangeRequest(
            request_type="CHANGE_ROLE",
            target_user_id=user.id,
            target_user_email=user.email,
            target_user_name=user.name,
            requested_role_id=target_role,
            previous_role_id=prev_role,
            requested_department=body.department or user.department,
            requested_by_admin_id=current_admin.id,
            reason=f"Alteração de perfil/departamento solicitada por {current_admin.name}",
            status="PENDING"
        )
        db.add(change_req)
        db.flush()

        notify_all_masters(
            db=db,
            type="STAFF_REQUEST_CREATED",
            title="Solicitação de Alteração de Cargo",
            message=f"{current_admin.name} solicitou alteração de perfil de {user.name} ({user.email}).",
            target_type="staff_request",
            target_id=change_req.id,
            action_url="/team"
        )

        db.commit()

        return {
            "success": True,
            "message": "Solicitação de alteração enviada para aprovação do Administrador Master."
        }

    if body.name is not None:
        user.name = body.name
    if body.is_active is not None and user.department == current_admin.department:
        user.is_active = body.is_active

    db.commit()
    return {"success": True, "message": "Dados básicos atualizados"}

@router.delete("/{admin_id}")
def delete_admin_user(
    admin_id: str,
    request: Request,
    current_admin: AdminUser = Depends(require_permission("admins.manage")),
    db: Session = Depends(get_db)
):
    user = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not user:
        raise NotFoundException("Administrador não encontrado")

    if user.id == current_admin.id:
        raise ForbiddenException("Você não pode excluir sua própria conta")

    if user.is_super_admin:
        raise ForbiddenException("Contas com perfil de Super Administrador não podem ser excluídas diretamente")

    email = user.email
    db.delete(user)
    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="admin_user_deleted",
        resource_type="admin_user",
        resource_id=admin_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"email": email}
    )

    return {"success": True, "message": "Administrador excluído com sucesso"}

# --- Staff Change Requests Management (Approval Workflow) ---
@router.get("/requests")
def list_staff_requests(
    status_filter: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(StaffChangeRequest).options(
        joinedload(StaffChangeRequest.requested_by_admin),
        joinedload(StaffChangeRequest.reviewed_by_admin),
        joinedload(StaffChangeRequest.target_user),
        joinedload(StaffChangeRequest.requested_role),
        joinedload(StaffChangeRequest.previous_role)
    )

    # Super Admin sees all requests; Department masters see requests from their department or created by them
    if not current_admin.is_super_admin:
        query = query.filter(
            (StaffChangeRequest.requested_by_admin_id == current_admin.id) |
            (StaffChangeRequest.requested_department == current_admin.department)
        )

    if status_filter:
        query = query.filter(StaffChangeRequest.status == status_filter.upper())

    requests = query.order_by(StaffChangeRequest.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": req.id,
                "request_type": req.request_type,
                "target_user_id": req.target_user_id,
                "target_user_email": req.target_user_email or (req.target_user.email if req.target_user else None),
                "target_user_name": req.target_user_name or (req.target_user.name if req.target_user else None),
                "requested_role_id": req.requested_role_id,
                "requested_role_name": req.requested_role.name if req.requested_role else req.requested_role_id,
                "previous_role_id": req.previous_role_id,
                "previous_role_name": req.previous_role.name if req.previous_role else req.previous_role_id,
                "requested_department": req.requested_department,
                "requested_permissions": req.requested_permissions,
                "requested_by_admin_id": req.requested_by_admin_id,
                "requested_by_name": req.requested_by_admin.name if req.requested_by_admin else "Sistema",
                "requested_by_email": req.requested_by_admin.email if req.requested_by_admin else None,
                "reason": req.reason,
                "status": req.status,
                "reviewed_by_admin_id": req.reviewed_by_admin_id,
                "reviewed_by_name": req.reviewed_by_admin.name if req.reviewed_by_admin else None,
                "review_notes": req.review_notes,
                "created_at": req.created_at.isoformat(),
                "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None
            }
            for req in requests
        ]
    }

@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_staff_request(
    body: StaffChangeRequestCreate,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Enforce no self-promotion without master approval
    if body.target_user_id and body.target_user_id == current_admin.id and not current_admin.is_super_admin:
        if body.request_type in ["PROMOTE", "MAKE_DEPARTMENT_MASTER"]:
            # Allowed to request promotion, but it goes to Admin Master
            pass

    target_user = None
    if body.target_user_id:
        target_user = db.query(AdminUser).filter(AdminUser.id == body.target_user_id).first()
        if not target_user:
            raise NotFoundException("Usuário alvo não encontrado")

    req = StaffChangeRequest(
        request_type=body.request_type,
        target_user_id=body.target_user_id,
        target_user_email=body.target_user_email or (target_user.email if target_user else None),
        target_user_name=body.target_user_name or (target_user.name if target_user else None),
        requested_role_id=body.requested_role_id,
        previous_role_id=target_user.roles[0].id if (target_user and target_user.roles) else None,
        requested_department=body.requested_department or (target_user.department if target_user else current_admin.department),
        requested_permissions=body.requested_permissions,
        requested_by_admin_id=current_admin.id,
        reason=body.reason,
        status="PENDING"
    )
    db.add(req)
    db.flush()

    notify_all_masters(
        db=db,
        type="STAFF_REQUEST_CREATED",
        title="Nova Solicitação de Equipe",
        message=f"{current_admin.name} abriu solicitação '{body.request_type}' para {req.target_user_name or req.target_user_email}: {body.reason}",
        target_type="staff_request",
        target_id=req.id,
        action_url="/team"
    )

    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="staff_change_request_submitted",
        resource_type="staff_change_request",
        resource_id=req.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"request_type": req.request_type, "target": req.target_user_email}
    )

    return {"success": True, "data": {"id": req.id, "status": req.status}}

@router.post("/requests/{request_id}/approve")
def approve_staff_request(
    request_id: str,
    body: StaffChangeRequestReview,
    request: Request,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    change_req = db.query(StaffChangeRequest).filter(StaffChangeRequest.id == request_id).first()
    if not change_req:
        raise NotFoundException("Solicitação não encontrada")

    if change_req.status != "PENDING":
        raise BadRequestException(f"Solicitação já finalizada com status '{change_req.status}'")

    # Apply changes
    if change_req.request_type == "CREATE_STAFF":
        if change_req.target_user_id:
            user = db.query(AdminUser).filter(AdminUser.id == change_req.target_user_id).first()
            if user:
                user.approval_status = "APPROVED"
                user.is_active = True
                if change_req.requested_department:
                    user.department = change_req.requested_department
                if change_req.requested_role_id:
                    db.query(AdminUserRole).filter(AdminUserRole.admin_user_id == user.id).delete()
                    db.add(AdminUserRole(admin_user_id=user.id, role_id=change_req.requested_role_id))
    
    elif change_req.request_type in ["CHANGE_ROLE", "PROMOTE", "DEMOTE", "MAKE_DEPARTMENT_MASTER", "CHANGE_DEPARTMENT"]:
        if change_req.target_user_id:
            user = db.query(AdminUser).filter(AdminUser.id == change_req.target_user_id).first()
            if user:
                if change_req.requested_department:
                    user.department = change_req.requested_department
                if change_req.requested_role_id:
                    db.query(AdminUserRole).filter(AdminUserRole.admin_user_id == user.id).delete()
                    db.add(AdminUserRole(admin_user_id=user.id, role_id=change_req.requested_role_id))
                user.approval_status = "APPROVED"

    change_req.status = "APPROVED"
    change_req.reviewed_by_admin_id = current_admin.id
    change_req.review_notes = body.review_notes
    change_req.reviewed_at = utc_now()

    # Notify requester
    if change_req.requested_by_admin_id:
        create_staff_notification(
            db=db,
            recipient_admin_id=change_req.requested_by_admin_id,
            type="STAFF_REQUEST_APPROVED",
            title="Solicitação de Equipe Aprovada",
            message=f"Sua solicitação de equipe para {change_req.target_user_name or change_req.target_user_email} foi APROVADA pelo Admin Master.",
            target_type="staff_request",
            target_id=change_req.id,
            action_url="/team"
        )

    # Notify target user if active
    if change_req.target_user_id:
        create_staff_notification(
            db=db,
            recipient_admin_id=change_req.target_user_id,
            type="ROLE_CHANGE_APPROVED",
            title="Seu cargo/função foi atualizado",
            message="Sua função na equipe foi aprovada e atualizada pelo Administrador Master.",
            target_type="admin_user",
            target_id=change_req.target_user_id,
            action_url="/team"
        )

    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="staff_change_request_approved",
        resource_type="staff_change_request",
        resource_id=change_req.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"request_type": change_req.request_type, "target": change_req.target_user_email}
    )

    return {"success": True, "message": "Solicitação aprovada com sucesso e aplicada ao sistema"}

@router.post("/requests/{request_id}/reject")
def reject_staff_request(
    request_id: str,
    body: StaffChangeRequestReview,
    request: Request,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    change_req = db.query(StaffChangeRequest).filter(StaffChangeRequest.id == request_id).first()
    if not change_req:
        raise NotFoundException("Solicitação não encontrada")

    if change_req.status != "PENDING":
        raise BadRequestException(f"Solicitação já finalizada com status '{change_req.status}'")

    if change_req.request_type == "CREATE_STAFF" and change_req.target_user_id:
        user = db.query(AdminUser).filter(AdminUser.id == change_req.target_user_id).first()
        if user:
            user.approval_status = "REJECTED"
            user.is_active = False

    change_req.status = "REJECTED"
    change_req.reviewed_by_admin_id = current_admin.id
    change_req.review_notes = body.review_notes or "Rejeitado pelo Administrador Master"
    change_req.reviewed_at = utc_now()

    # Notify requester
    if change_req.requested_by_admin_id:
        create_staff_notification(
            db=db,
            recipient_admin_id=change_req.requested_by_admin_id,
            type="STAFF_REQUEST_REJECTED",
            title="Solicitação de Equipe Rejeitada",
            message=f"Sua solicitação de equipe para {change_req.target_user_name or change_req.target_user_email} foi rejeitada pelo Admin Master. Motivo: {change_req.review_notes}",
            target_type="staff_request",
            target_id=change_req.id,
            action_url="/team"
        )

    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="staff_change_request_rejected",
        resource_type="staff_change_request",
        resource_id=change_req.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"request_type": change_req.request_type, "target": change_req.target_user_email}
    )

    return {"success": True, "message": "Solicitação rejeitada com sucesso"}

# --- Roles & Permissions Management ---
@router.get("/roles")
def list_roles(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).options(joinedload(Role.permissions)).all()
    perms = db.query(Permission).all()

    return {
        "success": True,
        "data": {
            "roles": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "is_system": r.is_system,
                    "department": getattr(r, "department", "general"),
                    "hierarchy_level": getattr(r, "hierarchy_level", 1),
                    "is_department_master": getattr(r, "is_department_master", False),
                    "can_manage_staff": getattr(r, "can_manage_staff", False),
                    "requires_master_approval": getattr(r, "requires_master_approval", False),
                    "parent_role_id": getattr(r, "parent_role_id", None),
                    "permissions": [p.id for p in r.permissions]
                }
                for r in roles
            ],
            "all_permissions": [
                {
                    "id": p.id,
                    "name": p.name,
                    "module": p.module,
                    "description": p.description
                }
                for p in perms
            ]
        }
    }

