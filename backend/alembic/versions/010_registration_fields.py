"""Registration field definitions and user custom fields

Revision ID: 010_registration_fields
Revises: 009_banners_system
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010_registration_fields'
down_revision = '009_banners_system'
branch_labels = None
depends_on = None

def _table_exists(table_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        return table_name in insp.get_table_names()
    except Exception:
        return False

def _column_exists(table_name: str, column_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        cols = [c["name"] for c in insp.get_columns(table_name)]
        return column_name in cols
    except Exception:
        return False

def upgrade() -> None:
    # 1. Add custom_fields column to users table if not present
    if _table_exists("users") and not _column_exists("users", "custom_fields"):
        op.add_column(
            "users",
            sa.Column("custom_fields", sa.JSON(), server_default="{}", nullable=False)
        )

    # 2. Create registration_field_definitions table
    if not _table_exists("registration_field_definitions"):
        op.create_table(
            "registration_field_definitions",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("app_id", sa.String(length=50), sa.ForeignKey("apps.id", ondelete="CASCADE"), nullable=False),
            sa.Column("field_key", sa.String(length=50), nullable=False),
            sa.Column("label", sa.String(length=150), nullable=False),
            sa.Column("placeholder", sa.String(length=200), nullable=True),
            sa.Column("help_text", sa.String(length=255), nullable=True),
            sa.Column("field_type", sa.String(length=30), server_default="text", nullable=False),
            sa.Column("options", sa.JSON(), nullable=True),
            sa.Column("is_required", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("min_length", sa.Integer(), nullable=True),
            sa.Column("max_length", sa.Integer(), nullable=True),
            sa.Column("regex_pattern", sa.String(length=255), nullable=True),
            sa.Column("error_message", sa.String(length=255), nullable=True),
            sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("show_in_profile", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("show_in_export", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.UniqueConstraint("app_id", "field_key", name="uq_app_registration_field_key")
        )

        op.create_index("ix_reg_fields_app_id", "registration_field_definitions", ["app_id"])
        op.create_index("ix_reg_fields_field_key", "registration_field_definitions", ["field_key"])
        op.create_index("ix_reg_fields_active", "registration_field_definitions", ["is_active"])
        op.create_index("ix_reg_fields_order", "registration_field_definitions", ["display_order"])

def downgrade() -> None:
    if _table_exists("registration_field_definitions"):
        op.drop_table("registration_field_definitions")
    if _table_exists("users") and _column_exists("users", "custom_fields"):
        op.drop_column("users", "custom_fields")
