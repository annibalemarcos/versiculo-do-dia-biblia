# Integração Android Nativo ↔ FastAPI Backend ↔ Admin Dashboard

## 1. Visão Geral da Arquitetura

O aplicativo Android Nativo atua como cliente pleno da autoridade central (FastAPI + PostgreSQL + Admin Dashboard), mantendo uma arquitetura **Offline-First**.

```
                   PostgreSQL
                       │
                       ▼
                    FastAPI
                       │
               REST / JSON / JWT
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
   Admin Dashboard             Android Nativo
                                     │
                              Room / DataStore
                                     │
                             Usuário Offline/Online
```

## 2. Configuração de Rede & Ambientes (`AppConfig.kt`)

As URLs base são geridas centralmente em `AppConfig.kt`:
- **Debug / Emulador:** `http://10.0.2.2:8000/api/v1/`
- **Debug / Dispositivo Físico (LAN):** `http://192.168.1.100:8000/api/v1/` (alterável dinamicamente via `AppConfig.setCustomBaseUrl()`)
- **Staging:** `https://staging-api.seuservidor.com/api/v1/`
- **Produção:** `https://api.seuservidor.com/api/v1/`

NUNCA é permitido o uso de `localhost` ou `10.0.2.2` em builds de Release.

## 3. Autenticação & Gestão de Tokens (`TokenManager.kt`)

- **Armazenamento:** `EncryptedSharedPreferences` / `PreferencesManager`.
- **Cabeçalho:** `Authorization: Bearer <access_token>`
- **Renovação com Concorrência Segura:** O `TokenManager` utiliza um `Mutex` Kotlin para evitar disparos paralelos de renovação de token quando múltiplas requisições recebem `401 Unauthorized`.
- **Logout Seguro:** Limpa tokens em memória e no DataStore local.
