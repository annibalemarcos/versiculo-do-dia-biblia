import os
import sys
import re
import ast
import pytest
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, Table, Column, String, MetaData, select, insert, update
from sqlalchemy.exc import IntegrityError

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.models import Base

@pytest.fixture
def alembic_cfg():
    ini_path = BACKEND_DIR / "alembic.ini"
    cfg = Config(str(ini_path))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg

@pytest.fixture
def script_directory(alembic_cfg):
    return ScriptDirectory.from_config(alembic_cfg)

def _parse_migration_file_ast(file_path: Path):
    revision = None
    down_revision = None
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == "revision" and isinstance(node.value, ast.Constant):
                        revision = str(node.value.value)
                    elif target.id == "down_revision":
                        if isinstance(node.value, ast.Constant):
                            down_revision = None if node.value.value is None else str(node.value.value)
    return revision, down_revision

def test_traverse_migration_files_and_validate_chain():
    """
    Percorre todas as migrations em backend/alembic/versions;
    Lê revision e down_revision;
    Falha se qualquer revision ID tiver mais de 32 caracteres;
    Falha se a cadeia tiver referência quebrada;
    Confirma que existe apenas uma HEAD.
    """
    versions_dir = BACKEND_DIR / "alembic" / "versions"
    migration_files = sorted([f for f in versions_dir.glob("*.py") if not f.name.startswith("__")])
    assert len(migration_files) >= 5, f"Esperava pelo menos 5 migrations, encontrou {len(migration_files)}"

    revisions_found = {}
    down_references = set()

    for f in migration_files:
        rev, down_rev = _parse_migration_file_ast(f)
        assert rev is not None, f"Arquivo {f.name} não define revision"

        # 1. Falhe se qualquer revision ID tiver mais de 32 caracteres
        assert len(rev) <= 32, (
            f"Revision ID '{rev}' no arquivo {f.name} possui {len(rev)} caracteres, "
            f"excedendo o limite máximo de 32 caracteres do PostgreSQL!"
        )

        assert rev not in revisions_found, f"Revision ID duplicado '{rev}' encontrado em {f.name}"
        revisions_found[rev] = {
            "file": f.name,
            "down_revision": down_rev,
        }
        if down_rev is not None:
            down_references.add(down_rev)

    # 2. Falhe se a cadeia tiver referência quebrada
    for rev, data in revisions_found.items():
        down_rev = data["down_revision"]
        if down_rev is not None:
            assert down_rev in revisions_found, (
                f"Referência quebrada: revision '{rev}' em {data['file']} "
                f"aponta para down_revision inexistente '{down_rev}'"
            )

    # 3. Confirme que existe apenas uma HEAD
    # Uma HEAD é uma revision que não é down_revision de nenhuma outra
    heads = [rev for rev in revisions_found if rev not in down_references]
    assert len(heads) == 1, f"Esperava exatamente uma HEAD, mas encontrou {len(heads)}: {heads}"
    assert heads[0] == "006_ticket_seq_user_soft_del", f"HEAD esperada é '006_ticket_seq_user_soft_del', mas obteve '{heads[0]}'"

def test_all_revision_ids_within_postgresql_varchar_32_limit(script_directory):
    """
    Validates that every Alembic revision ID in the repository is at most 32 characters long.
    PostgreSQL's default alembic_version.version_num is VARCHAR(32).
    Any revision ID exceeding 32 characters causes psycopg2.errors.StringDataRightTruncation.
    """
    revisions = list(script_directory.walk_revisions())
    assert len(revisions) >= 5, f"Expected at least 5 revisions, found {len(revisions)}"

    for rev in revisions:
        rev_id = rev.revision
        assert len(rev_id) <= 32, (
            f"Migration revision ID '{rev_id}' has {len(rev_id)} characters, "
            f"which exceeds PostgreSQL alembic_version VARCHAR(32) limit!"
        )
        if rev.down_revision:
            if isinstance(rev.down_revision, tuple):
                for down_id in rev.down_revision:
                    assert len(down_id) <= 32, (
                        f"Migration down_revision '{down_id}' has {len(down_id)} characters, "
                        f"which exceeds PostgreSQL alembic_version VARCHAR(32) limit!"
                    )
            else:
                assert len(rev.down_revision) <= 32, (
                    f"Migration down_revision '{rev.down_revision}' has {len(rev.down_revision)} characters, "
                    f"which exceeds PostgreSQL alembic_version VARCHAR(32) limit!"
                )

def test_migration_chain_integrity_and_head(script_directory):
    """
    Verifies that the migration chain is strictly linear:
    001_initial_schema
      -> 002_staff_hierarchy
      -> 003_staff_push_devices
      -> 004_consolidation_updates
      -> 005_schema_alignment
      -> 006_ticket_seq_user_soft_del
    And that HEAD is 006_ticket_seq_user_soft_del.
    """
    heads = script_directory.get_heads()
    assert len(heads) == 1, f"Expected single head, got: {heads}"
    assert heads[0] == "006_ticket_seq_user_soft_del", f"Expected HEAD to be '006_ticket_seq_user_soft_del', got '{heads[0]}'"

    # Walk from head backwards to verify chain
    rev_006 = script_directory.get_revision("006_ticket_seq_user_soft_del")
    assert rev_006 is not None
    assert rev_006.down_revision == "005_schema_alignment"

    rev_005 = script_directory.get_revision("005_schema_alignment")
    assert rev_005 is not None
    assert rev_005.down_revision == "004_consolidation_updates"

    rev_004 = script_directory.get_revision("004_consolidation_updates")
    assert rev_004 is not None
    assert rev_004.down_revision == "003_staff_push_devices"

    rev_003 = script_directory.get_revision("003_staff_push_devices")
    assert rev_003 is not None
    assert rev_003.down_revision == "002_staff_hierarchy"

    rev_002 = script_directory.get_revision("002_staff_hierarchy")
    assert rev_002 is not None
    assert rev_002.down_revision == "001_initial_schema"

    rev_001 = script_directory.get_revision("001_initial_schema")
    assert rev_001 is not None
    assert rev_001.down_revision is None

def test_simulated_postgresql_varchar_32_constraint(script_directory):
    """
    Simulates PostgreSQL's VARCHAR(32) strict constraint on alembic_version.
    Verifies that all migration IDs succeed, and that old oversized IDs fail.
    """
    engine = create_engine("sqlite:///:memory:")
    meta = MetaData()

    # Create alembic_version with explicit CHECK (length(version_num) <= 32)
    with engine.begin() as conn:
        conn.exec_driver_sql("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num),
                CONSTRAINT chk_version_num_length CHECK (length(version_num) <= 32)
            );
        """)

    # 1. Verify that attempting to insert the old oversized ID fails
    with engine.begin() as conn:
        with pytest.raises(IntegrityError):
            conn.exec_driver_sql(
                "INSERT INTO alembic_version (version_num) VALUES ('002_staff_hierarchy_and_notifications');"
            )

    # 2. Replay all revisions in order
    ordered_revisions = [
        "001_initial_schema",
        "002_staff_hierarchy",
        "003_staff_push_devices",
        "004_consolidation_updates",
        "005_schema_alignment",
        "006_ticket_seq_user_soft_del",
    ]

    with engine.begin() as conn:
        # Initial insert
        conn.exec_driver_sql(f"INSERT INTO alembic_version (version_num) VALUES ('{ordered_revisions[0]}');")

        # Step through updates as Alembic does
        for i in range(len(ordered_revisions) - 1):
            prev_rev = ordered_revisions[i]
            next_rev = ordered_revisions[i + 1]
            conn.exec_driver_sql(
                f"UPDATE alembic_version SET version_num='{next_rev}' WHERE version_num='{prev_rev}';"
            )

        # Confirm final version
        res = conn.exec_driver_sql("SELECT version_num FROM alembic_version;").scalar()
        assert res == "006_ticket_seq_user_soft_del"

def test_all_models_present_in_migration_schema():
    """
    Verifies that all tables declared in app.models.Base.metadata
    are created across migrations 001 through 005.
    """
    import subprocess
    out = subprocess.check_output(
        ["alembic", "upgrade", "head", "--sql"],
        cwd=str(BACKEND_DIR)
    ).decode()

    created_tables = set(re.findall(r"CREATE TABLE ([a-zA-Z0-9_]+)", out))
    model_tables = set(Base.metadata.tables.keys())

    missing_tables = model_tables - created_tables
    assert not missing_tables, f"Tables defined in models are missing from migrations: {missing_tables}"
