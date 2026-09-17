import os
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.app import App, AppConfig
from app.models.banner import Banner
from app.models.base import utc_now

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()
    db = SessionLocal()
    # Ensure app exists
    app_entity = db.query(App).filter(App.id == "verse_daily").first()
    if not app_entity:
        app_entity = App(id="verse_daily", name="Versículo do Dia & Bíblia", package_id="com.aistudio.biblia.nvgtnt")
        db.add(app_entity)
        db.commit()
    db.close()

@pytest.fixture
def client():
    return TestClient(app)

def test_public_banners_and_scheduling(client):
    db = SessionLocal()
    now = utc_now()

    # Clean old test banners
    db.query(Banner).filter(Banner.app_id == "verse_daily_test").delete()
    db.commit()

    # 1. Active high priority banner
    b1 = Banner(
        id="test_b1_active",
        app_id="verse_daily_test",
        title="Banner Ativo Prioridade Alta",
        placement="home_top",
        target_audience="all",
        priority=100,
        is_active=True
    )
    # 2. Active low priority banner
    b2 = Banner(
        id="test_b2_low",
        app_id="verse_daily_test",
        title="Banner Ativo Prioridade Baixa",
        placement="home_top",
        target_audience="all",
        priority=10,
        is_active=True
    )
    # 3. Inactive banner
    b3 = Banner(
        id="test_b3_inactive",
        app_id="verse_daily_test",
        title="Banner Inativo",
        placement="home_top",
        target_audience="all",
        priority=999,
        is_active=False
    )
    # 4. Expired banner
    b4 = Banner(
        id="test_b4_expired",
        app_id="verse_daily_test",
        title="Banner Expirado",
        placement="home_top",
        target_audience="all",
        priority=50,
        is_active=True,
        expires_at=now - timedelta(days=1)
    )
    # 5. Future scheduled banner
    b5 = Banner(
        id="test_b5_future",
        app_id="verse_daily_test",
        title="Banner Futuro",
        placement="home_top",
        target_audience="all",
        priority=50,
        is_active=True,
        starts_at=now + timedelta(days=1)
    )
    # 6. Reading screen placement banner
    b6 = Banner(
        id="test_b6_reading",
        app_id="verse_daily_test",
        title="Banner Tela de Leitura",
        placement="reading_screen",
        target_audience="free_only",
        priority=80,
        is_active=True
    )

    db.add_all([b1, b2, b3, b4, b5, b6])
    db.commit()
    db.close()

    # Query public home_top banners
    res = client.get("/api/v1/banners?app_id=verse_daily_test&placement=home_top")
    assert res.status_code == 200
    data = res.json()["data"]
    # b1 and b2 should be present, b3, b4, b5 should NOT
    ids = [item["id"] for item in data]
    assert "test_b1_active" in ids
    assert "test_b2_low" in ids
    assert "test_b3_inactive" not in ids
    assert "test_b4_expired" not in ids
    assert "test_b5_future" not in ids
    assert "test_b6_reading" not in ids
    # Check priority order: b1 (100) must appear before b2 (10)
    assert ids.index("test_b1_active") < ids.index("test_b2_low")

    # Query reading screen banners with audience filter
    res_free = client.get("/api/v1/banners?app_id=verse_daily_test&placement=reading_screen&audience=free")
    assert res_free.status_code == 200
    assert any(item["id"] == "test_b6_reading" for item in res_free.json()["data"])

    # Query reading screen with premium audience (b6 is free_only, so should not match)
    res_prem = client.get("/api/v1/banners?app_id=verse_daily_test&placement=reading_screen&audience=premium")
    assert res_prem.status_code == 200
    assert not any(item["id"] == "test_b6_reading" for item in res_prem.json()["data"])

def test_banner_interaction_tracking(client):
    db = SessionLocal()
    banner = Banner(
        id="test_track_banner",
        app_id="verse_daily",
        title="Banner de Teste Métricas",
        placement="home_top",
        is_active=True,
        impression_count=0,
        click_count=0
    )
    db.merge(banner)
    db.commit()
    db.close()

    # Track impression
    res_imp = client.post("/api/v1/banners/test_track_banner/track?action=impression")
    assert res_imp.status_code == 200
    assert res_imp.json()["success"] is True

    # Track click
    res_clk = client.post("/api/v1/banners/test_track_banner/track?action=click")
    assert res_clk.status_code == 200

    # Verify counts in DB
    db = SessionLocal()
    b = db.query(Banner).filter(Banner.id == "test_track_banner").first()
    assert b.impression_count == 1
    assert b.click_count == 1
    db.close()
