"""Staff hierarchy, department approval requests, ticket participants and staff notifications

Revision ID: 002_staff_hierarchy_and_notifications
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
    with op.batch_alter_table('roles') as batch_op:
        batch_op.add_column(sa.Column('department', sa.String(length=50), nullable=False, server_default='general'))
        batch_op.add_column(sa.Column('hierarchy_level', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('is_department_master', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('can_manage_staff', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('requires_master_approval', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('parent_role_id', sa.String(length=50), nullable=True))
        batch_op.create_foreign_key('fk_roles_parent_role', 'roles', ['parent_role_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_roles_department', ['department'])
        batch_op.create_index('ix_roles_hierarchy_level', ['hierarchy_level'])

    # 2. Alter admin_users table
    with op.batch_alter_table('admin_users') as batch_op:
        batch_op.add_column(sa.Column('department', sa.String(length=50), nullable=False, server_default='general'))
        batch_op.add_column(sa.Column('approval_status', sa.String(length=20), nullable=False, server_default='APPROVED'))
        batch_op.create_index('ix_admin_users_department', ['department'])
        batch_op.create_index('ix_admin_users_approval_status', ['approval_status'])

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

    # 4. Create support_tickets and related tables (prerequisite for ticket_participants)
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ticket_number', sa.String(length=20), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('guest_email', sa.String(length=255), nullable=True),
        sa.Column('guest_name', sa.String(length=150), nullable=True),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('assigned_admin_id', sa.String(length=36), nullable=True),
        sa.Column('first_response_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ticket_number')
    )
    op.create_index('ix_support_tickets_ticket_number', 'support_tickets', ['ticket_number'])
    op.create_index('ix_support_tickets_app_id', 'support_tickets', ['app_id'])
    op.create_index('ix_support_tickets_user_id', 'support_tickets', ['user_id'])
    op.create_index('ix_support_tickets_guest_email', 'support_tickets', ['guest_email'])
    op.create_index('ix_support_tickets_category', 'support_tickets', ['category'])
    op.create_index('ix_support_tickets_priority', 'support_tickets', ['priority'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index('ix_support_tickets_assigned_admin_id', 'support_tickets', ['assigned_admin_id'])

    op.create_table(
        'ticket_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ticket_id', sa.String(length=36), nullable=False),
        sa.Column('sender_type', sa.String(length=20), nullable=False),
        sa.Column('sender_user_id', sa.String(length=36), nullable=True),
        sa.Column('sender_admin_id', sa.String(length=36), nullable=True),
        sa.Column('sender_name', sa.String(length=150), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_internal_note', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sender_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_messages_ticket_id', 'ticket_messages', ['ticket_id'])
    op.create_index('ix_ticket_messages_sender_type', 'ticket_messages', ['sender_type'])
    op.create_index('ix_ticket_messages_is_internal_note', 'ticket_messages', ['is_internal_note'])

    op.create_table(
        'ticket_attachments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ticket_id', sa.String(length=36), nullable=False),
        sa.Column('message_id', sa.String(length=36), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('storage_reference', sa.Text(), nullable=False),
        sa.Column('uploaded_by', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['ticket_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_attachments_ticket_id', 'ticket_attachments', ['ticket_id'])
    op.create_index('ix_ticket_attachments_message_id', 'ticket_attachments', ['message_id'])

    op.create_table(
        'ticket_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ticket_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('previous_value', sa.String(length=255), nullable=True),
        sa.Column('new_value', sa.String(length=255), nullable=True),
        sa.Column('admin_id', sa.String(length=36), nullable=True),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_history_ticket_id', 'ticket_history', ['ticket_id'])

    # 5. Create ticket_participants table
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

    # 6. Create staff_notifications table
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
    op.drop_table('ticket_history')
    op.drop_table('ticket_attachments')
    op.drop_table('ticket_messages')
    op.drop_table('support_tickets')
    op.drop_table('staff_change_requests')
    with op.batch_alter_table('admin_users') as batch_op:
        batch_op.drop_index('ix_admin_users_approval_status')
        batch_op.drop_index('ix_admin_users_department')
        batch_op.drop_column('approval_status')
        batch_op.drop_column('department')
    with op.batch_alter_table('roles') as batch_op:
        batch_op.drop_index('ix_roles_hierarchy_level')
        batch_op.drop_index('ix_roles_department')
        batch_op.drop_constraint('fk_roles_parent_role', type_='foreignkey')
        batch_op.drop_column('parent_role_id')
        batch_op.drop_column('requires_master_approval')
        batch_op.drop_column('can_manage_staff')
        batch_op.drop_column('is_department_master')
        batch_op.drop_column('hierarchy_level')
        batch_op.drop_column('department')
