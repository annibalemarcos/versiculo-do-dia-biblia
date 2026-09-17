"""Consolidation updates: user push devices, admin entitlement grants, financial scenarios, user notifications

Revision ID: 004_consolidation_updates
Revises: 003_staff_push_devices
Create Date: 2026-08-31 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_consolidation_updates'
down_revision = '003_staff_push_devices'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. user_notifications
    op.create_table(
        'user_notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('app_id', sa.String(length=50), nullable=False, server_default='verse_daily'),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='verse'),
        sa.Column('deep_link', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_notifications_user_id', 'user_notifications', ['user_id'])
    op.create_index('ix_user_notifications_app_id', 'user_notifications', ['app_id'])
    op.create_index('ix_user_notifications_is_read', 'user_notifications', ['is_read'])

    # 2. user_push_devices
    op.create_table(
        'user_push_devices',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('app_id', sa.String(length=50), nullable=False, server_default='verse_daily'),
        sa.Column('token', sa.Text(), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False, server_default='android'),
        sa.Column('device_name', sa.String(length=150), nullable=True),
        sa.Column('app_version', sa.String(length=50), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('last_failure_at', sa.DateTime(), nullable=True),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_push_devices_user_id', 'user_push_devices', ['user_id'])
    op.create_index('ix_user_push_devices_app_id', 'user_push_devices', ['app_id'])
    op.create_index('ix_user_push_devices_token', 'user_push_devices', ['token'], unique=True)
    op.create_index('ix_user_push_devices_active', 'user_push_devices', ['active'])

    # 3. admin_entitlement_grants
    op.create_table(
        'admin_entitlement_grants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('admin_id', sa.String(length=36), nullable=True),
        sa.Column('entitlement_id', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_reason', sa.String(length=255), nullable=True),
        sa.Column('revoked_by_admin_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['revoked_by_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['entitlement_id'], ['entitlements.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_admin_entitlement_grants_user_id', 'admin_entitlement_grants', ['user_id'])
    op.create_index('ix_admin_entitlement_grants_admin_id', 'admin_entitlement_grants', ['admin_id'])
    op.create_index('ix_admin_entitlement_grants_entitlement_id', 'admin_entitlement_grants', ['entitlement_id'])
    op.create_index('ix_admin_entitlement_grants_is_active', 'admin_entitlement_grants', ['is_active'])

    # 4. financial_scenarios
    op.create_table(
        'financial_scenarios',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False, server_default='verse_daily'),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_by_admin_id', sa.String(length=36), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('projection_summary', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_financial_scenarios_app_id', 'financial_scenarios', ['app_id'])

def downgrade() -> None:
    op.drop_table('financial_scenarios')
    op.drop_table('admin_entitlement_grants')
    op.drop_table('user_push_devices')
    op.drop_table('user_notifications')
