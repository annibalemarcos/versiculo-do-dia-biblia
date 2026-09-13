from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.auth import AdminUser, Role
from app.models.notification import StaffNotification
from app.models.base import utc_now
from app.services.push_notification_service import send_staff_push

def create_staff_notification(
    db: Session,
    recipient_admin_id: str,
    type: str,
    title: str,
    message: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    action_url: Optional[str] = None
) -> StaffNotification:
    # 1. Internal DB Notification (Mandatory reliable fallback)
    notif = StaffNotification(
        recipient_admin_id=recipient_admin_id,
        type=type,
        title=title,
        message=message,
        target_type=target_type,
        target_id=target_id,
        action_url=action_url,
        is_read=False,
        created_at=utc_now()
    )
    db.add(notif)
    db.flush()

    # 2. Real Push Notification Delivery (Non-blocking / failsafe)
    try:
        send_staff_push(
            db=db,
            recipient_admin_id=recipient_admin_id,
            title=title,
            message=message,
            notification_type=type,
            target_type=target_type,
            target_id=target_id,
            action_url=action_url,
            notification_id=notif.id
        )
    except Exception as push_err:
        # DB notification remains intact even if push fails
        pass

    return notif

def notify_all_masters(
    db: Session,
    type: str,
    title: str,
    message: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    action_url: Optional[str] = None,
    exclude_admin_id: Optional[str] = None
) -> List[StaffNotification]:
    """
    Sends notification to all Super Admins (Admin Master).
    """
    query = db.query(AdminUser).filter(
        AdminUser.is_active == True,
        AdminUser.is_super_admin == True
    )
    if exclude_admin_id:
        query = query.filter(AdminUser.id != exclude_admin_id)
    
    masters = query.all()
    created = []
    for master in masters:
        notif = create_staff_notification(
            db=db,
            recipient_admin_id=master.id,
            type=type,
            title=title,
            message=message,
            target_type=target_type,
            target_id=target_id,
            action_url=action_url
        )
        created.append(notif)
    return created

def notify_department_masters(
    db: Session,
    department: str,
    type: str,
    title: str,
    message: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    action_url: Optional[str] = None,
    exclude_admin_id: Optional[str] = None
) -> List[StaffNotification]:
    """
    Sends notification to masters of a specific department as well as Super Admins.
    """
    # Find users who have a role in this department with is_department_master=True OR is_super_admin=True
    users = db.query(AdminUser).join(AdminUser.roles).filter(
        AdminUser.is_active == True,
        (
            (Role.department == department) & (Role.is_department_master == True)
        ) | (AdminUser.is_super_admin == True)
    ).distinct().all()

    created = []
    for u in users:
        if exclude_admin_id and u.id == exclude_admin_id:
            continue
        notif = create_staff_notification(
            db=db,
            recipient_admin_id=u.id,
            type=type,
            title=title,
            message=message,
            target_type=target_type,
            target_id=target_id,
            action_url=action_url
        )
        created.append(notif)
    return created

def mark_notification_as_read(
    db: Session,
    notification_id: str,
    admin_id: str
) -> Optional[StaffNotification]:
    notif = db.query(StaffNotification).filter(
        StaffNotification.id == notification_id,
        StaffNotification.recipient_admin_id == admin_id
    ).first()
    if not notif:
        return None
    if not notif.is_read:
        notif.is_read = True
        notif.read_at = utc_now()
        db.flush()
    return notif

def mark_all_notifications_as_read(
    db: Session,
    admin_id: str
) -> int:
    now = utc_now()
    count = db.query(StaffNotification).filter(
        StaffNotification.recipient_admin_id == admin_id,
        StaffNotification.is_read == False
    ).update(
        {StaffNotification.is_read: True, StaffNotification.read_at: now},
        synchronize_session="fetch"
    )
    db.flush()
    return count

def get_unread_notifications_count(
    db: Session,
    admin_id: str
) -> int:
    return db.query(func.count(StaffNotification.id)).filter(
        StaffNotification.recipient_admin_id == admin_id,
        StaffNotification.is_read == False
    ).scalar() or 0

def list_staff_notifications(
    db: Session,
    admin_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0
) -> List[StaffNotification]:
    query = db.query(StaffNotification).filter(
        StaffNotification.recipient_admin_id == admin_id
    )
    if unread_only:
        query = query.filter(StaffNotification.is_read == False)
    
    return query.order_by(desc(StaffNotification.created_at)).offset(offset).limit(limit).all()
