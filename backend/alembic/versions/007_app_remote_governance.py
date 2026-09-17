"""App remote governance and operational feature flags

Revision ID: 007_app_remote_governance
Revises: 006_ticket_seq_user_soft_del
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
# Length: 26 chars <= 32 chars (PostgreSQL VARCHAR(32) strict limit)
revision = '007_app_remote_governance'
down_revision = '006_ticket_seq_user_soft_del'
branch_labels = None
depends_on = None

def _column_exists(table_name: str, column_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        cols = [c['name'] for c in insp.get_columns(table_name)]
        return column_name in cols
    except Exception:
        return False

def upgrade() -> None:
    # Add remote configuration & governance columns to app_configs table with safe defaults
    if not _column_exists("app_configs", "maintenance_level"):
        op.add_column("app_configs", sa.Column("maintenance_level", sa.String(length=20), server_default="informational", nullable=False))

    if not _column_exists("app_configs", "maintenance_title"):
        op.add_column("app_configs", sa.Column("maintenance_title", sa.String(length=150), nullable=True))

    if not _column_exists("app_configs", "maintenance_estimated_end"):
        op.add_column("app_configs", sa.Column("maintenance_estimated_end", sa.DateTime(timezone=True), nullable=True))

    if not _column_exists("app_configs", "registration_enabled"):
        op.add_column("app_configs", sa.Column("registration_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "purchases_enabled"):
        op.add_column("app_configs", sa.Column("purchases_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "premium_enabled"):
        op.add_column("app_configs", sa.Column("premium_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "notifications_enabled"):
        op.add_column("app_configs", sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "support_enabled"):
        op.add_column("app_configs", sa.Column("support_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "cloud_sync_enabled"):
        op.add_column("app_configs", sa.Column("cloud_sync_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "devotionals_enabled"):
        op.add_column("app_configs", sa.Column("devotionals_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "search_enabled"):
        op.add_column("app_configs", sa.Column("search_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "sharing_enabled"):
        op.add_column("app_configs", sa.Column("sharing_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "google_login_enabled"):
        op.add_column("app_configs", sa.Column("google_login_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    if not _column_exists("app_configs", "offline_download_enabled"):
        op.add_column("app_configs", sa.Column("offline_download_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "updated_by"):
        op.add_column("app_configs", sa.Column("updated_by", sa.String(length=36), nullable=True))

def downgrade() -> None:
    columns = [
        "updated_by",
        "offline_download_enabled",
        "google_login_enabled",
        "sharing_enabled",
        "search_enabled",
        "devotionals_enabled",
        "cloud_sync_enabled",
        "support_enabled",
        "notifications_enabled",
        "premium_enabled",
        "purchases_enabled",
        "registration_enabled",
        "maintenance_estimated_end",
        "maintenance_title",
        "maintenance_level"
    ]
    for col in columns:
        if _column_exists("app_configs", col):
            op.drop_column("app_configs", col)
