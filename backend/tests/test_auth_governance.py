import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.app import AppConfig, App
from app.models.user import User

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()
    db = SessionLocal()
    # Ensure default app and config exist
    app_entity = db.query(App).filter(App.id == "verse_daily").first()
    if not app_entity:
        app_entity = App(id="verse_daily", name="Versículo do Dia & Bíblia", package_id="com.aistudio.biblia.nvgtnt")
        db.add(app_entity)
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    if not cfg:
        cfg = AppConfig(
            app_id="verse_daily",
            authentication_system_enabled=True,
            login_enabled=True,
            local_auth_enabled=True,
            google_auth_enabled=False,
            google_auth_status="coming_soon",
            logout_enabled=True,
            registration_enabled=True
        )
        db.add(cfg)
    else:
        cfg.authentication_system_enabled = True
        cfg.login_enabled = True
        cfg.local_auth_enabled = True
        cfg.google_auth_enabled = False
        cfg.google_auth_status = "coming_soon"
        cfg.logout_enabled = True
        cfg.registration_enabled = True
        cfg.maintenance_mode = False
    db.commit()
    db.close()

@pytest.fixture
def client():
    return TestClient(app)

def test_public_config_includes_auth_governance(client):
    res = client.get("/api/v1/apps/verse_daily/config")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "authentication_system_enabled" in data
    assert "login_enabled" in data
    assert "local_auth_enabled" in data
    assert "google_auth_enabled" in data
    assert "google_auth_status" in data
    assert "logout_enabled" in data
    assert "auth" in data
    assert data["auth"]["system_enabled"] is True
    assert "providers" in data["auth"]
    assert data["auth"]["providers"]["local"]["enabled"] is True
    assert data["auth"]["providers"]["google"]["status"] == "coming_soon"

def test_user_registration_with_username_and_login_dual_identifier(client):
    db = SessionLocal()
    # Clean test user if exists
    test_email = "test_auth_user@example.com"
    test_user = "test_user_unique"
    db.query(User).filter((User.email == test_email) | (User.username == test_user)).delete()
    db.commit()
    db.close()

    # 1. Register with email, username and password
    reg_payload = {
        "email": test_email,
        "username": test_user,
        "password": "SecurePassword123!",
        "name": "Test User",
        "app_id": "verse_daily"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()["data"]
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["username"] == test_user

    # 2. Duplicate username registration should fail
    dup_res = client.post("/api/v1/auth/register", json={
        "email": "different@example.com",
        "username": test_user,
        "password": "SecurePassword123!",
        "app_id": "verse_daily"
    })
    assert dup_res.status_code == 409
    assert "já está em uso" in dup_res.json()["message"]

    # 3. Login using EMAIL
    login_email_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!"
    })
    assert login_email_res.status_code == 200
    assert login_email_res.json()["data"]["user"]["username"] == test_user

    # 4. Login using USERNAME
    login_user_res = client.post("/api/v1/auth/login", json={
        "username": test_user,
        "password": "SecurePassword123!"
    })
    assert login_user_res.status_code == 200
    assert login_user_res.json()["data"]["user"]["email"] == test_email

    # 5. Login using IDENTIFIER generic field
    login_id_res = client.post("/api/v1/auth/login", json={
        "identifier": test_user,
        "password": "SecurePassword123!"
    })
    assert login_id_res.status_code == 200
    assert login_id_res.json()["data"]["access_token"] is not None

def test_governance_registration_disabled(client):
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.registration_enabled = False
    db.commit()
    db.close()

    res = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "Password123!",
        "app_id": "verse_daily"
    })
    assert res.status_code == 403
    assert res.json()["code"] == "REGISTRATION_DISABLED"

    # Reset
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.registration_enabled = True
    db.commit()
    db.close()

def test_governance_authentication_system_disabled(client):
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.authentication_system_enabled = False
    db.commit()
    db.close()

    # Register should be blocked
    reg_res = client.post("/api/v1/auth/register", json={
        "email": "blocked@example.com",
        "username": "blocked",
        "password": "Password123!",
        "app_id": "verse_daily"
    })
    assert reg_res.status_code == 403
    assert reg_res.json()["code"] == "AUTH_SYSTEM_DISABLED"

    # Login should be blocked
    log_res = client.post("/api/v1/auth/login", json={
        "email": "test_auth_user@example.com",
        "password": "SecurePassword123!"
    })
    assert log_res.status_code == 403
    assert log_res.json()["code"] == "AUTH_SYSTEM_DISABLED"

    # Reset
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.authentication_system_enabled = True
    db.commit()
    db.close()

def test_governance_local_auth_disabled(client):
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.local_auth_enabled = False
    db.commit()
    db.close()

    log_res = client.post("/api/v1/auth/login", json={
        "identifier": "test_auth_user@example.com",
        "password": "SecurePassword123!"
    })
    assert log_res.status_code == 403
    assert log_res.json()["code"] == "LOCAL_AUTH_DISABLED"

    # Reset
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.local_auth_enabled = True
    db.commit()
    db.close()

def test_logout_endpoint_and_governance(client):
    # Success when enabled
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 200

    # Blocked when disabled
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.logout_enabled = False
    db.commit()
    db.close()

    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 403
    assert res.json()["code"] == "LOGOUT_DISABLED"

    # Reset
    db = SessionLocal()
    cfg = db.query(AppConfig).filter(AppConfig.app_id == "verse_daily").first()
    cfg.logout_enabled = True
    db.commit()
    db.close()
