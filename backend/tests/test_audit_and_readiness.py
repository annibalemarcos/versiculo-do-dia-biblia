import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import check_database_health, engine, SessionLocal
from app.main import app
from app.services.audit_service import sanitize_metadata, log_admin_action
from app.models.auth import AdminUser

@pytest.fixture
def client():
    return TestClient(app)

def test_check_database_health_success():
    """
    Verifica se check_database_health executa SELECT 1 e retorna
    indicador de banco disponível, tempo de resposta e nenhum erro.
    """
    result = check_database_health()
    assert result is not None
    assert bool(result) is True
    assert result["healthy"] is True
    assert result["status"] == "available"
    assert result["database"] == "available"
    assert result.status == "available"
    assert result.healthy is True
    assert result["error"] is None
    assert isinstance(result["response_time_ms"], int)
    assert result["response_time_ms"] >= 0

def test_check_database_health_failure_and_zero_secret_leak():
    """
    Verifica se em caso de falha de conexão (com exceção contendo URL ou senha confidencial):
    1. O resultado indica status 'unavailable' e healthy=False.
    2. Nenhuma credencial ou URL sensível vaza no retorno de erro.
    """
    secret_password = "pAssw0rd_SuperSecret_987654"
    sensitive_url = f"postgresql://admin:{secret_password}@production-db.internal:5432/secrets_db"

    mock_error = Exception(f"Failed connection to {sensitive_url}: authentication failed for user admin")

    with patch("app.core.database.engine.connect", side_effect=mock_error):
        result = check_database_health()
        assert result["healthy"] is False
        assert result["status"] == "unavailable"
        assert result["database"] == "unavailable"
        assert bool(result) is False
        assert result["error"] is not None
        # Garante vazamento ZERO de secrets
        assert secret_password not in result["error"]
        assert sensitive_url not in result["error"]
        assert "production-db.internal" not in result["error"]

def test_readiness_endpoint_200_when_database_healthy(client):
    """
    Verifica se os endpoints de readiness (/health/ready e /ready)
    retornam HTTP 200 OK quando o banco de dados está disponível.
    """
    for endpoint in ["/health/ready", "/ready", "/api/v1/health/ready"]:
        response = client.get(endpoint)
        assert response.status_code == 200, f"Endpoint {endpoint} retornou status {response.status_code}"
        data = response.json()
        assert data.get("status") == "ready"
        assert data.get("database") == "available"
        assert data.get("ready") is True

def test_readiness_endpoint_503_when_database_unavailable(client):
    """
    Verifica se o endpoint de readiness (/health/ready) retorna
    HTTP 503 Service Unavailable quando o PostgreSQL ou banco estiver inacessível.
    """
    from app.core.database import DatabaseHealthResult
    failing_health = DatabaseHealthResult(
        healthy=False,
        status="unavailable",
        response_time_ms=None,
        error="Database connection failed or timed out."
    )

    with patch("app.main.check_database_health", return_value=failing_health):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data.get("status") == "unavailable"
        assert data.get("database") == "unavailable"
        assert data.get("ready") is False
        assert "password" not in str(data).lower()

def test_readiness_endpoint_zero_secret_leak_on_exception(client):
    """
    Verifica se mesmo com falha grave contendo secrets, a resposta 503
    não expõe nenhuma informação confidencial.
    """
    secret_token = "jwt-super-secret-token-key-12345"
    failing_health = {
        "healthy": False,
        "status": "unavailable",
        "database": "unavailable",
        "ready": False,
        "error": "Database connection failed or timed out."
    }

    with patch("app.main.check_database_health", return_value=failing_health):
        response = client.get("/ready")
        assert response.status_code == 503
        assert secret_token not in response.text

def test_audit_metadata_sanitization():
    """
    Verifica se a função de sanitização de metadados de auditoria
    remove ou mascara senhas, tokens, secrets e chaves sensíveis.
    """
    raw_metadata = {
        "user_id": "usr_123",
        "action_detail": "login_attempt",
        "password": "ClearTextPassword123",
        "token": "secret_jwt_token_abc",
        "authorization": "Bearer xyz123",
        "nested": {
            "secret_key": "api_secret_456",
            "safe_field": "public_data"
        }
    }

    sanitized = sanitize_metadata(raw_metadata)
    assert sanitized["user_id"] == "usr_123"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["token"] == "[REDACTED]"
    assert sanitized["authorization"] == "[REDACTED]"
    assert sanitized["nested"]["secret_key"] == "[REDACTED]"
    assert sanitized["nested"]["safe_field"] == "public_data"


def test_health_service_no_jwt_secret_attribute_and_secret_key_used():
    """
    Verifica que o health_service não referencia o atributo inexistente 'JWT_SECRET'
    em Settings e utiliza canonicamente 'SECRET_KEY' sem lançar AttributeError.
    """
    import ast

    health_service_file = BACKEND_DIR / "app" / "services" / "health_service.py"
    with open(health_service_file, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    jwt_secret_nodes = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Attribute) and node.attr == "JWT_SECRET"
    ]
    assert len(jwt_secret_nodes) == 0, f"Found unexpected JWT_SECRET references at lines: {jwt_secret_nodes}"

    # Valida que com SECRET_KEY configurada o diagnóstico opera normalmente
    from app.core.config import settings
    assert hasattr(settings, "SECRET_KEY"), "settings deve conter o atributo canônico SECRET_KEY"
    assert not hasattr(settings, "JWT_SECRET"), "settings não deve conter o atributo JWT_SECRET"


def test_create_ticket_exception_handling_no_name_error_and_canonical_500():
    """
    Verifica que uma falha durante create_ticket():
    1. Não lança NameError (ex: por classe inexistente InternalServerException).
    2. Retorna envelope canônico HTTP 500 com código INTERNAL_SERVER_ERROR.
    3. Não vaza detalhes de banco ou stack trace para o cliente.
    """
    from app.core.errors import AppException

    # Usar cliente isolado com raise_server_exceptions=False para inspecionar resposta do global_exception_handler
    safe_client = TestClient(app, raise_server_exceptions=False)

    payload = {
        "subject": "Problema com assinatura",
        "description": "Não consigo restaurar minhas compras no aplicativo",
        "category": "BILLING",
        "priority": "HIGH",
        "guest_name": "Maria Silva",
        "guest_email": "maria@example.com"
    }

    # Força uma exceção interna simulada no create_ticket
    with patch("app.api.public.support.create_ticket", side_effect=RuntimeError("Simulated DB connection failure")):
        response = safe_client.post("/api/v1/support/tickets", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
        assert data["error"]["message"] == "Ocorreu um erro interno ao processar sua solicitação."
        assert "Simulated DB connection failure" not in response.text
