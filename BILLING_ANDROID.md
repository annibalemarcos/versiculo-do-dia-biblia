# Validação de Assinaturas & Google Play Billing (`BillingProvider.kt`)

## 1. Autoridade Server-Side (FastAPI)

- O **DataStore** local **NÃO** é a autoridade definitiva de status Premium.
- Quando o usuário adquire um plano ou clica em "Restaurar Compras", o token gerado pela Google Play Billing é enviado para o endpoint:
  `POST /api/v1/billing/verify`
- O servidor valida a compra diretamente com a API do Google Play Developer e retorna:
  ```json
  {
    "success": true,
    "data": {
      "status": "verified",
      "is_premium": true,
      "expires_at": "2026-12-31T23:59:59Z",
      "entitlements": ["premium", "ad_free", "offline_full", "unlimited_favorites"]
    }
  }
  ```
- O app atualiza as permissões de acesso às funcionalidades com base nos direitos validados.
