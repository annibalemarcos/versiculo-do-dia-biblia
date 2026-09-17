"""Auth remote governance flags and username support

Revision ID: 008_auth_governance_and_username
Revises: 007_app_remote_governance
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_auth_governance_and_username'
down_revision = '007_app_remote_governance'
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
    # 1. Add authentication governance flags to app_configs
    if not _column_exists("app_configs", "authentication_system_enabled"):
        op.add_column("app_configs", sa.Column("authentication_system_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "login_enabled"):
        op.add_column("app_configs", sa.Column("login_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "local_auth_enabled"):
        op.add_column("app_configs", sa.Column("local_auth_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not _column_exists("app_configs", "google_auth_enabled"):
        op.add_column("app_configs", sa.Column("google_auth_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    if not _column_exists("app_configs", "google_auth_status"):
        op.add_column("app_configs", sa.Column("google_auth_status", sa.String(length=20), server_default="coming_soon", nullable=False))

    if not _column_exists("app_configs", "logout_enabled"):
        op.add_column("app_configs", sa.Column("logout_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    # 2. Add username column to users table with unique constraint and index
    if not _column_exists("users", "username"):
        op.add_column("users", sa.Column("username", sa.String(length=100), nullable=True))
        try:
            op.create_index("ix_users_username", "users", ["username"], unique=True)
        except Exception:
            pass

def downgrade() -> None:
    # Remove index and column from users
    try:
        op.drop_index("ix_users_username", table_name="users")
    except Exception:
        pass

    if _column_exists("users", "username"):
        op.drop_column("users", "username")

    columns = [
        "logout_enabled",
        "google_auth_status",
        "google_auth_enabled",
        "local_auth_enabled",
        "login_enabled",
        "authentication_system_enabled"
    ]
    for col in columns:
        if _column_exists("app_configs", col):
            op.drop_column("app_configs", col)
