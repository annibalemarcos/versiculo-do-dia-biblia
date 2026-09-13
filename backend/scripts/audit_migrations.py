#!/usr/bin/env python3
"""
Alembic Migrations Audit Script
Validates:
  - Revision ID length <= 32 characters (PostgreSQL alembic_version VARCHAR(32) limit)
  - Down revision existence and valid references
  - Strictly linear chain (no forks, no multiple heads)
  - Exactly one HEAD revision
  - Exactly one base revision
"""

import sys
import os
import ast
from pathlib import Path
from typing import Dict, List, Optional, Tuple

def find_backend_dir() -> Path:
    # 1. Script is located at backend/scripts/audit_migrations.py -> parent.parent is backend
    script_parent = Path(__file__).resolve().parent.parent
    if (script_parent / "alembic" / "versions").is_dir():
        return script_parent
    # 2. Check current working directory
    cwd = Path.cwd()
    if (cwd / "backend" / "alembic" / "versions").is_dir():
        return cwd / "backend"
    if (cwd / "alembic" / "versions").is_dir():
        return cwd
    raise FileNotFoundError("Could not locate backend/alembic/versions directory.")

def parse_migration_file(file_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """Parse revision and down_revision from a migration file without importing."""
    revision = None
    down_revision = None
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == "revision":
                        if isinstance(node.value, ast.Constant):
                            revision = str(node.value.value)
                    elif target.id == "down_revision":
                        if isinstance(node.value, ast.Constant):
                            down_revision = None if node.value.value is None else str(node.value.value)
                        elif isinstance(node.value, ast.Tuple):
                            # Alembic merge revisions can have a tuple
                            down_revision = tuple(
                                elt.value for elt in node.value.elts if isinstance(elt, ast.Constant)
                            )
    return revision, down_revision

def main() -> int:
    try:
        backend_dir = find_backend_dir()
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return 1

    versions_dir = backend_dir / "alembic" / "versions"
    print("=" * 80)
    print("ALEMBIC MIGRATIONS AUDIT")
    print(f"Directory: {versions_dir}")
    print("=" * 80)

    migration_files = sorted([f for f in versions_dir.glob("*.py") if not f.name.startswith("__")])
    if not migration_files:
        print("❌ ERROR: No migration files found!")
        return 1

    errors: List[str] = []
    revisions: Dict[str, Dict] = {}

    print(f"\nDiscovered {len(migration_files)} migration files:\n")
    print(f"{'File Name':<35} | {'Revision ID':<26} | {'Len':<4} | {'Down Revision':<26} | {'Status'}")
    print("-" * 110)

    for f in migration_files:
        rev, down_rev = parse_migration_file(f)
        if not rev:
            errors.append(f"File {f.name} does not define a 'revision' variable.")
            print(f"{f.name:<35} | {'<MISSING>':<26} | {'-':<4} | {'-':<26} | ❌ MISSING REVISION")
            continue

        rev_len = len(rev)
        down_rev_str = str(down_rev) if down_rev is not None else "<None>"
        status = "OK"

        if rev_len > 32:
            status = f"❌ EXCEEDS 32 ({rev_len})"
            errors.append(
                f"Revision '{rev}' in file '{f.name}' exceeds limit: {rev_len} characters > 32 characters."
            )
        elif rev in revisions:
            status = "❌ DUPLICATE REVISION"
            errors.append(f"Duplicate revision ID '{rev}' found in '{f.name}' and '{revisions[rev]['file']}'.")

        revisions[rev] = {
            "file": f.name,
            "revision": rev,
            "len": rev_len,
            "down_revision": down_rev,
        }

        status_display = "✅ OK" if status == "OK" else status
        print(f"{f.name:<35} | {rev:<26} | {rev_len:<4} | {down_rev_str:<26} | {status_display}")

    print("-" * 110)

    # Validate chain references
    children_map: Dict[Optional[str], List[str]] = {}
    for rev_id, info in revisions.items():
        down_rev = info["down_revision"]
        if isinstance(down_rev, tuple):
            errors.append(f"Fork/Merge detected: revision '{rev_id}' has multiple parents: {down_rev}")
            for d in down_rev:
                children_map.setdefault(d, []).append(rev_id)
        else:
            if down_rev is not None and down_rev not in revisions:
                errors.append(
                    f"Broken reference: revision '{rev_id}' points to nonexistent down_revision '{down_rev}'."
                )
            children_map.setdefault(down_rev, []).append(rev_id)

    # Base revisions (down_revision is None)
    base_revisions = [rev_id for rev_id, info in revisions.items() if info["down_revision"] is None]
    if len(base_revisions) == 0:
        errors.append("No base revision found (no migration with down_revision = None).")
    elif len(base_revisions) > 1:
        errors.append(f"Multiple base revisions found: {base_revisions}")

    # HEAD revisions (no other revision points to this revision as down_revision)
    head_revisions = [rev_id for rev_id in revisions if rev_id not in children_map]
    print(f"\nDetected HEAD(s): {head_revisions}")
    if len(head_revisions) == 0:
        errors.append("No HEAD revision detected (cycle in migrations).")
    elif len(head_revisions) > 1:
        errors.append(f"Multiple HEAD revisions detected (branches exist): {head_revisions}")
    else:
        print(f"✅ Exactly one HEAD: {head_revisions[0]}")

    # Validate linear chain from base to head
    if len(base_revisions) == 1 and len(head_revisions) == 1:
        curr = base_revisions[0]
        chain = [curr]
        visited = {curr}
        is_linear = True

        while curr in children_map:
            children = children_map[curr]
            if len(children) > 1:
                errors.append(f"Branching detected: revision '{curr}' has multiple children: {children}")
                is_linear = False
                break
            curr = children[0]
            if curr in visited:
                errors.append(f"Cycle detected in migration chain at '{curr}'!")
                is_linear = False
                break
            visited.add(curr)
            chain.append(curr)

        if is_linear:
            if len(chain) == len(revisions):
                print("\nMigration Chain (Linear):")
                for idx, rev_id in enumerate(chain, start=1):
                    info = revisions[rev_id]
                    print(f"  {idx}. {rev_id} ({info['len']} chars) [{info['file']}]")
            else:
                unconnected = set(revisions.keys()) - set(chain)
                errors.append(f"Disjoint migrations found not in linear chain: {unconnected}")

    print("\n" + "=" * 80)
    if errors:
        print("❌ AUDIT FAILED WITH ERRORS:")
        for err in errors:
            print(f"  • {err}")
        print("=" * 80)
        return 1
    else:
        print("✅ AUDIT PASSED: All revision IDs are <= 32 chars, chain is linear, single HEAD confirmed.")
        print("=" * 80)
        return 0

if __name__ == "__main__":
    sys.exit(main())
