"""Staff hierarchy, department approval requests, ticket participants and staff notifications

Revision ID: 002_staff_hierarchy
Revises: 001_initial_schema
Create Date: 2026-08-30 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_staff_hierarchy'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Alter roles table
    op.add_column('roles', sa.Column('department', sa.String(length=50), nullable=False, server_default='general'))
    op.add_column('roles', sa.Column('hierarchy_level', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('roles', sa.Column('is_department_master', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('roles', sa.Column('can_manage_staff', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('roles', sa.Column('requires_master_approval', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('roles', sa.Column('parent_role_id', sa.String(length=50), nullable=True))
    op.create_foreign_key('fk_roles_parent_role', 'roles', 'roles', ['parent_role_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_roles_department', 'roles', ['department'])
    op.create_index('ix_roles_hierarchy_level', 'roles', ['hierarchy_level'])

    # 2. Alter admin_users table
    op.add_column('admin_users', sa.Column('department', sa.String(length=50), nullable=False, server_default='general'))
    op.add_column('admin_users', sa.Column('approval_status', sa.String(length=20), nullable=False, server_default='APPROVED'))
    op.create_index('ix_admin_users_department', 'admin_users', ['department'])
    op.create_index('ix_admin_users_approval_status', 'admin_users', ['approval_status'])

    # 3. Create staff_change_requests table
    op.create_table(
        'staff_change_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('request_type', sa.String(length=50), nullable=False),
        sa.Column('target_user_id', sa.String(length=36), nullable=True),
        sa.Column('target_user_email', sa.String(length=255), nullable=True),
        sa.Column('target_user_name', sa.String(length=150), nullable=True),
        sa.Column('target_password_hash', sa.String(length=255), nullable=True),
        sa.Column('requested_role_id', sa.String(length=50), nullable=True),
        sa.Column('previous_role_id', sa.String(length=50), nullable=True),
        sa.Column('requested_department', sa.String(length=50), nullable=True),
        sa.Column('requested_permissions', sa.JSON(), nullable=True),
        sa.Column('requested_by_admin_id', sa.String(length=36), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('reviewed_by_admin_id', sa.String(length=36), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['target_user_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['requested_role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['previous_role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['requested_by_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_change_requests_request_type', 'staff_change_requests', ['request_type'])
    op.create_index('ix_staff_change_requests_target_user_id', 'staff_change_requests', ['target_user_id'])
    op.create_index('ix_staff_change_requests_requested_by_admin_id', 'staff_change_requests', ['requested_by_admin_id'])
    op.create_index('ix_staff_change_requests_status', 'staff_change_requests', ['status'])

    # 4. Create ticket_participants table
    op.create_table(
        'ticket_participants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ticket_id', sa.String(length=36), nullable=False),
        sa.Column('admin_id', sa.String(length=36), nullable=False),
        sa.Column('added_by_admin_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['added_by_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ticket_id', 'admin_id', name='uq_ticket_participant')
    )
    op.create_index('ix_ticket_participants_ticket_id', 'ticket_participants', ['ticket_id'])
    op.create_index('ix_ticket_participants_admin_id', 'ticket_participants', ['admin_id'])

    # 5. Create staff_notifications table
    op.create_table(
        'staff_notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('recipient_admin_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('action_url', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['recipient_admin_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_notifications_recipient_admin_id', 'staff_notifications', ['recipient_admin_id'])
    op.create_index('ix_staff_notifications_type', 'staff_notifications', ['type'])
    op.create_index('ix_staff_notifications_is_read', 'staff_notifications', ['is_read'])
    op.create_index('ix_staff_notifications_created_at', 'staff_notifications', ['created_at'])

def downgrade() -> None:
    op.drop_table('staff_notifications')
    op.drop_table('ticket_participants')
    op.drop_table('staff_change_requests')
    op.drop_index('ix_admin_users_approval_status', 'admin_users')
    op.drop_index('ix_admin_users_department', 'admin_users')
    op.drop_column('admin_users', 'approval_status')
    op.drop_column('admin_users', 'department')
    op.drop_index('ix_roles_hierarchy_level', 'roles')
    op.drop_index('ix_roles_department', 'roles')
    op.drop_constraint('fk_roles_parent_role', 'roles', type_='foreignkey')
    op.drop_column('roles', 'parent_role_id')
    op.drop_column('roles', 'requires_master_approval')
    op.drop_column('roles', 'can_manage_staff')
    op.drop_column('roles', 'is_department_master')
    op.drop_column('roles', 'hierarchy_level')
    op.drop_column('roles', 'department')
