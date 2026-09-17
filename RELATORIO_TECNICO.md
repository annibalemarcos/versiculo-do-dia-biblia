# RELATÓRIO TÉCNICO DE ESTADO DO PROJETO

**Data do Diagnóstico:** 16 de setembro de 2026  
**Ambiente de Execução:** Cloud Container AI Studio / Linux x86_64  
**Status Geral de Compilação:**  
- **Android Nativo:** Compilando com sucesso (`compile_applet` exit 0; Gradle Unit Tests: 33 tasks concluídas com sucesso).  
- **Backend FastAPI:** Código sintaticamente válido (`python3 -m py_compile` aprovado em todos os módulos).  
- **Admin Web (React):** Código estruturado com TypeScript, Vite e Tailwind CSS (requer runtime local de Node.js/npm para execução do servidor Vite).

---

## 1. Identificação do Projeto

* **Nome do Projeto:** Versículo do Dia & Bíblia (Backend: *Bible Central*, Admin: *bible-admin-dashboard*, Android: *com.aistudio.biblia.rnfvpe* / *Versículo do Dia*).
* **Objetivo / Aplicação:** Plataforma cristã multiplataforma completa composta por aplicativo móvel Android nativo (leitura bíblica, devocionais diários, versículo do dia, busca por emoções, favoritos locais e suporte ao usuário via helpdesk), retaguarda de microsserviço/API com FastAPI e banco de dados relacional PostgreSQL, e painel administrativo web SPA para gestão editorial, governança de versões, moderação de tickets, auditoria e telemetria de saúde da infraestrutura.
* **Stack Utilizada:**
  * **Mobile:** Kotlin 2.0+, Jetpack Compose, Material Design 3, Coroutines, StateFlow, Android Jetpack (Room Database, DataStore Preferences, WorkManager, Navigation Compose), Retrofit 2, Moshi, OkHttp3, Firebase (Auth, Firestore, App Check, Cloud Messaging).
  * **Backend:** Python 3.11+, FastAPI, Pydantic v2 / Pydantic-Settings, SQLAlchemy 2.0, Alembic (migrações relacionais), Uvicorn, Passlib (Bcrypt), Python-Jose (JWT HS256), Firebase Admin SDK.
  * **Painel Web Administrativo:** React 18.3, TypeScript 5.4, Vite 5.2, Tailwind CSS 3.4, Lucide React (iconografia), Recharts (data visualization).
* **Bancos de Dados:**
  * **Servidor:** PostgreSQL 15+ (produção e staging) com fallback automático transparente para SQLite (`bible_central_local.db`) em ambiente de desenvolvimento local.
  * **Mobile (Dispositivo):** SQLite via Room Database (`verse_database`) com arquitetura Offline-First e fila persistente de sincronização (`sync_queue`).
* **Infraestrutura / Ambiente:**
  * Containers Docker (`backend/docker-compose.yml` com PostgreSQL 16 e FastAPI).
  * Servidores Web ASGI (Uvicorn / Gunicorn).
* **Plataformas Alvo:**
  * Android 7.0+ (API 24 até API 36).
  * Web responsivo para navegadores modernos (Desktop e Mobile).

---

## 2. Estado Atual do Sistema

### 2.1 Em que estágio o projeto está
O projeto se encontra em estágio de **Homologação e Pré-Lançamento (Release Candidate)**. As três camadas (App Android, Backend FastAPI e Admin Web) já estão totalmente conectadas através de contratos de API REST bem definidos, compartilhando modelos de dados de versículos, devocionais, perfis de usuários, tickets de suporte, governança remota de manutenção e telemetria de integridade.

### 2.2 O que está implementado e verificado
1. **Aplicativo Android Nativo:**
   * Leitor de Versículo do Dia e Devocionais com suporte offline completo via Room.
   * Sistema de Favoritos com sincronização bidirecional resiliente em segundo plano (`SyncManager` e `SyncWorker`).
   * Helpdesk nativo in-app com criação de tickets, protocolo sequencial (`TKT-XXXXXX`), cópia de protocolo e chat em tempo real com atendentes.
   * Navegação unificada com Bottom Navigation Bar (Início, Explorar, Buscar, Favoritos, Perfil).
   * Governança remota de manutenção em 3 níveis (`informational`, `partial`, `full`) com bloqueio de fluxos em modo estrito.
   * Sistema de Paywall e status de Assinatura com lógica defensiva para usuários Premium (sem exibição de anúncios ou ofertas para usuários com direitos ativos).
2. **Backend API (FastAPI):**
   * Autenticação completa (usuários públicos e administradores com RBAC granular: `admin`, `editor`, `support`).
   * CRUDs editoriais completos (versículos, livros, capítulos, devocionais, temas, emoções, reflexões).
   * Motor de Tickets de Suporte com histórico cronológico, atribuição e bloqueio de chamados fechados.
   * Sistema de Governança Remota e Controle de Versões (`/api/v1/app/config`).
   * Sistema de Campos de Cadastro Dinâmicos com validação server-side de regex, tipos e obrigatoriedade.
   * Sistema de Banners públicos e controle de segmentação.
   * Endpoint de verificação de integridade e prontidão do banco (`/health`, `/health/ready` e `/api/v1/admin/health/critical-check`).
   * Histórico imutável de auditoria administrativa (`AdminAuditLog`).
3. **Painel Administrativo Web (React):**
   * Dashboard executivo com métricas de conversão, usuários ativos e visualizador de saúde da infraestrutura.
   * Central de Saúde do Sistema (`/system-health`) com diagnóstico dos 7 provedores principais (PostgreSQL, FCM, Play Billing, AdMob, Play Integrity, UMP e API).
   * Sistema de Notificações Toast em tempo real com alerta sonoro sintetizado via Web Audio API e observador de fundo (`SystemHealthWatcher`).
   * Gerenciamento de Conteúdo Editorial, Banners e Campos de Cadastro com mockup interativo de celular.
   * Perfil 360° do Usuário com visualização de favoritos em nuvem, dispositivos push e concessão manual de benefícios.

### 2.3 O que está parcialmente implementado
* **Google Play Billing no Android:** A arquitetura do `BillingProvider.kt` está implementada e valida tokens contra o backend via `POST /api/v1/billing/verify`. No entanto, as chamadas diretas com a biblioteca Google Play Billing SDK v6/v7 estão estruturadas com mocks/simulações controladas para execução no ambiente de desenvolvimento (`BillingProvider.kt:231`).
* **Google AdMob / UMP:** As regras de negócio para exibição de anúncios (`AdProvider.kt`) e proteção de telas sagradas estão implementadas em código, porém a exibição real de banners depende de chaves reais de AdMob e publicação na Google Play.
* **Worker de Notificações Push FCM em Produção:** O worker de agendamento em segundo plano (`scheduled_push_worker`) e os endpoints de envio estão implementados no backend (`fcm_user_push_service.py`), mas operam em modo simulação quando o arquivo de credenciais da conta de serviço (`FCM_SERVICE_ACCOUNT_PATH`) não está configurado.

### 2.4 O que ainda não foi implementado
* Fluxo de login social via Google Play Services / Google Identity no Android nativo (a chave de governança `google_auth_enabled` está em estado `coming_soon` no backend e o app utiliza cadastro anônimo e por credenciais).
* Mecanismo de backup físico automatizado e replicação de banco de dados em nuvem (PITR).

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CAMADA CLIENTE (MOBILE)                        │
│  - Android Nativo (Kotlin / Jetpack Compose / M3)                           │
│  - Offline-First: Room Database (Cache Local & Fila de Sync)               │
│  - DataStore Preferences (Configurações e Sessão)                           │
│  - Retrofit 2 + OkHttp3 com Interceptor de Autenticação JWT                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST / JSON
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                              CAMADA DE SERVIÇOS (BACKEND)                   │
│  - FastAPI (Python 3.11+) com Validação Pydantic v2                        │
│  - SQLAlchemy 2.0 (ORM) + Alembic (10 Migrações Versionadas)               │
│  - Autenticação JWT (HS256) com Proteção contra Concorrência e RBAC        │
│  - Provedor de Saúde & Readiness Probes                                     │
│  - Background Worker para Campanhas Push FCM                                │
└───────────────────┬──────────────────────────────────▲──────────────────────┘
                    │                                  │ HTTPS / Bearer JWT
┌───────────────────▼──────────────────┐   ┌───────────┴──────────────────────┐
│          BANCO DE DADOS              │   │       PAINEL DE CONTROLE         │
│  - PostgreSQL 15+ (Produção)         │   │  - React 18 / TypeScript / Vite  │
│  - SQLite Fallback (Desenvolvimento) │   │  - Tailwind CSS + Lucide Icons   │
│  - 28 Tabelas Relacionais            │   │  - Poller de Saúde em Tempo Real │
│  - Trilha de Auditoria Imutável      │   │  - Alertas Toast com Áudio Web   │
└──────────────────────────────────────┘   └──────────────────────────────────┘
```

### Principais Decisões Técnicas:
1. **Offline-First com Resolução "Merge Union":** O aplicativo Android nunca bloqueia o usuário esperando resposta do servidor. Leituras e favoritos ocorrem no Room local; requisições pendentes são enfileiradas na tabela `sync_queue` e processadas assim que houver rede.
2. **Autoridade de Monetização Centralizada no Servidor:** O status Premium nunca é alterado unilateralmente pelo cliente sem que um token de compra seja validado no endpoint `/billing/verify` do FastAPI.
3. **Resiliência de Banco com Fallback Automático:** Se a conexão com o PostgreSQL falhar no ambiente de desenvolvimento, o backend conecta automaticamente a um banco SQLite local (`bible_central_local.db`) sem derrubar a aplicação.
4. **Sanitização Estrita de Saúde e Erros:** Nenhum endpoint de health check ou monitoramento expõe senhas, strings de conexão ou credenciais em mensagens de erro.

---

## 4. Estrutura do Projeto

```
/
├── admin-web/                     # Painel Administrativo SPA (React + TypeScript)
│   ├── src/
│   │   ├── components/            # Componentes reutilizáveis (Layout, Toast, Banners)
│   │   ├── context/               # AuthContext e ToastContext
│   │   ├── pages/                 # 18 Telas administrativas
│   │   ├── services/              # Cliente HTTP api.ts e Web Push
│   │   └── types/                 # Interfaces TypeScript de contratos de dados
│   ├── package.json
│   └── vite.config.ts
├── app/                           # Aplicativo Android Nativo
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/
│   │   │   │   ├── core/          # Segurança, Tokens, Rede, Billing, Ads
│   │   │   │   ├── data/          # Room DB, Entidades, Repositórios, Retrofit
│   │   │   │   └── ui/            # Telas Compose, ViewModel, Temas, Navegação
│   │   │   ├── res/               # Recursos XML, Drawables, Ícones Adaptativos
│   │   │   └── AndroidManifest.xml
│   │   └── test/                  # Testes Unitários e Robolectric
│   └── build.gradle.kts
├── backend/                       # Backend FastAPI
│   ├── alembic/                   # Controle de Migrações (001 até 010)
│   ├── app/
│   │   ├── api/                   # Rotas Públicas (/public) e Administrativas (/admin)
│   │   ├── core/                  # Configurações, Segurança JWT, Conexão com Banco
│   │   ├── models/                # Modelos ORM SQLAlchemy
│   │   ├── schemas/               # Schemas de Validação Pydantic
│   │   └── services/              # Regras de negócio, Push FCM, Helpdesk, Auditoria
│   ├── docker-compose.yml
│   └── requirements.txt
├── gradle/libs.versions.toml       # Catálogo de Versões Gradle
├── metadata.json                  # Metadados de plataforma AI Studio
├── BACKEND_INTEGRATION.md         # Documentação de integração de rede e endpoints
├── BILLING_ANDROID.md             # Documentação de regras de faturamento
└── SYNC_ARCHITECTURE.md           # Documentação de sincronização de dados offline
```

---

## 5. Inventário de Funcionalidades

| Funcionalidade | Status | Onde está implementada | Dependências | Observações / Problemas Conhecidos |
|---|:---:|---|---|---|
| **Leitor Bíblico e Devocionais** | Implementada | `app/.../screens/HomeScreen.kt`, `VerseReaderScreen.kt` | Room, ViewModel | Totalmente funcional offline com seed local. |
| **Sincronização de Favoritos** | Implementada | `app/.../sync/SyncManager.kt`, `backend/app/api/public/user_data.py` | Room, Retrofit, PostgreSQL | Mecanismo de união sem perda de dados locais. |
| **Helpdesk e Tickets de Suporte** | Implementada | `app/.../screens/HelpSupportScreen.kt`, `backend/.../tickets.py`, `admin-web/.../Tickets.tsx` | Retrofit, FastAPI, PostgreSQL | Protocolo `TKT-XXXXXX` atômico; bloqueio de tickets `CLOSED`. |
| **Governança Remota e Manutenção** | Implementada | `backend/.../config.py`, `admin-web/.../MultiAppConfig.tsx`, `app/.../HomeScreen.kt` | FastAPI, DataStore, StateFlow | Suporte aos 3 modos: `informational`, `partial` e `full`. |
| **Campos Dinâmicos de Cadastro** | Implementada | `backend/.../registration_fields.py`, `admin-web/.../RegistrationFields.tsx` | Pydantic, PostgreSQL, React | Validação de tipos, regex e preview interativo. |
| **Monitoramento de Saúde e Alertas** | Implementada | `backend/.../health.py`, `admin-web/.../SystemHealth.tsx`, `ToastContainer.tsx` | FastAPI, Web Audio API, React Context | Notificação visual Toast e alarme sonoro na detecção de erros críticos. |
| **Gestão Editorial de Versículos** | Implementada | `backend/.../verses.py`, `admin-web/.../Verses.tsx`, `DailyVerseScheduler.tsx` | SQLAlchemy, React | Agendamento diário e associação de versículos a emoções. |
| **Faturamento Google Play** | Parcial | `app/.../core/billing/BillingProvider.kt`, `backend/.../billing.py` | Google Play Billing Client, FastAPI | Validação server-side implementada; compras usam mock token no app em modo dev. |
| **Notificações Push FCM** | Parcial | `backend/.../fcm_user_push_service.py`, `admin-web/.../NotificationsHub.tsx` | Firebase Admin SDK | Disparo real requer injeção do arquivo de credenciais da conta de serviço. |
| **Banners Promocionais** | Implementada | `backend/.../banners.py`, `admin-web/.../Banners.tsx`, `app/.../HomeScreen.kt` | SQLAlchemy, React, Compose | Exibição de banners na tela inicial com controle de datas e prioridade. |

---

## 6. Frontend

### 6.1 Aplicativo Android Nativo
* **Telas Existentes:** `HomeScreen`, `ExploreScreen`, `SearchScreen`, `FavoritesScreen`, `SettingsProfileScreen`, `VerseReaderScreen`, `DevotionalDetailScreen`, `OnboardingScreen`, `PremiumPaywallScreen`, `HelpSupportScreen`, `NewTicketScreen`, `MyTicketsScreen`, `TicketDetailScreen`, `NotificationsScreen`.
* **Componentes:** `TestModeBanner`, `ShareVerseDialog`, botões acessíveis com touch target mínimo de 48dp, cartões de versículos com Material 3.
* **Navegação:** `NavHost` declarativo com `Screen` sealed class e transições suaves (`fadeIn`/`fadeOut`).
* **Gerenciamento de Estado:** `MainViewModel` expondo `StateFlow` coletados nas telas via `collectAsState()`.
* **Responsividade:** Layouts fluidos adaptados para orientação vertical com preenchimento seguro de barras de sistema (`WindowInsets`).

### 6.2 Painel Web Administrativo
* **Telas Existentes (18 páginas):** `Dashboard`, `Verses`, `DailyVerseScheduler`, `ThemesEmotions`, `Devotionals`, `Banners`, `RegistrationFields`, `MonetizationHub`, `Users`, `UserProfilePage`, `Tickets`, `MultiAppConfig`, `NotificationsHub`, `Experiments`, `SystemHealth`, `AuditLogs`, `AdminsTeam`, `Login`.
* **Componentes Centrais:** `AdminLayout`, `Header`, `Sidebar`, `MaintenanceAlertBanner`, `ToastContainer`, `SystemHealthWatcher`.
* **Autenticação:** Proteção por `AuthContext` com persistência de token JWT em `localStorage` e redirecionamento automático para `/login`.

---

## 7. Backend

* **APIs Públicas (`/api/v1`):**
  * `/app/config`: Consulta de flags operacionais e estado de manutenção.
  * `/verses`, `/verses/daily`, `/verses/search`: Consulta e leitura de textos sagrados.
  * `/auth/register`, `/auth/login`, `/auth/anonymous`: Ciclo de vida de autenticação.
  * `/me/sync`: Sincronização em lote de favoritos e histórico.
  * `/support/tickets`: Abertura e consulta de chamados de suporte.
  * `/billing/verify`: Validação de recibos de compra.
  * `/banners`: Consulta de banners ativos.
* **APIs Administrativas (`/api/v1/admin`):**
  * Rotas protegidas por permissões RBAC para gestão de administradores, métricas financeiras, catálogo bíblico, agendamento, tickets, experimentos A/B e auditoria.
  * `/admin/health`: Diagnóstico consolidado com testes de latência para PostgreSQL, FCM, Play Billing, AdMob, Play Integrity e UMP.
  * `/admin/health/critical-check`: Endpoint leve para o poller de notificações Toast.
  * `/admin/health/simulate-critical-error`: Endpoint para teste de disparo de alertas críticos.

---

## 8. Banco de Dados

* **Gerenciador:** PostgreSQL 15+ (produção) com fallback transparente para SQLite.
* **Tabelas Principais (28 tabelas):**
  1. `apps` e `app_configs`
  2. `feature_flags`
  3. `users` (com suporte a soft delete `is_deleted` e campos dinâmicos `custom_fields`)
  4. `user_push_devices`
  5. `admin_users`, `admin_roles`, `admin_permissions` e tabelas associativas
  6. `admin_audit_logs`
  7. `bible_books`, `bible_chapters`, `bible_verses`
  8. `daily_verses`
  9. `themes`, `emotions`, `verse_themes`, `verse_emotions`
  10. `reflections`, `devotionals`
  11. `user_favorites`, `user_reading_history`
  12. `support_tickets` e `support_ticket_messages` (com sequence PostgreSQL nativa `support_ticket_number_seq`)
  13. `banners`
  14. `registration_field_definitions`
  15. `subscriptions`, `in_app_purchases`, `billing_products`
  16. `fcm_campaigns`
* **Migrações Alembic:** 10 revisões lineares estritas:
  * `001_initial_schema` até `010_registration_fields`.
* **Seed de Dados:** `backend/app/db/seed.py` popula automaticamente permissões padrão, papéis administrativos, usuário admin mestre e acervo inicial de versículos e devocionais na primeira execução.

---

## 9. Dependências e Configurações

* **Android (`app/build.gradle.kts`):**
  * Android Gradle Plugin 8.9.0, Kotlin 2.0.21, Compose BOM 2024.09.00.
  * Room 2.6.1, Retrofit 2.11.0, Moshi 1.15.1, OkHttp 4.12.0, Firebase BOM 33.1.0.
* **Backend (`backend/requirements.txt`):**
  * FastAPI >= 0.111.0, SQLAlchemy >= 2.0.30, Alembic >= 1.13.0, Pydantic >= 2.7.0, Passlib >= 1.7.4, Pytest >= 8.2.0.
* **Admin Web (`admin-web/package.json`):**
  * React 18.3.1, React Router DOM 6.23.1, Recharts 2.12.7, Lucide React 0.395.0, Tailwind CSS 3.4.4.
* **Segurança de Configurações:** Todas as URLs de produção e segredos são carregados via variáveis de ambiente (`.env` ou `BuildConfig`). Nenhuma chave privada ou senha real está fixada no código-fonte.

---

## 10. Testes Automatizados

* **Android:**
  * Testes Unitários e de Integração: `app/src/test/java/com/example/`
    * `AppConfigTest.kt` (validação de URLs e ambiente).
    * `PremiumSecurityTest.kt` (proteção de rotas e entitlements).
    * `ProductionEndpointAuditTest.kt` (auditoria de segurança de endpoints de rede).
    * `SyncAndNetworkTest.kt` (fila de sincronização offline e tratamento de falhas).
    * `ExampleRobolectricTest.kt` e `GreetingScreenshotTest.kt`.
  * **Resultado da Execução:** `gradle :app:testDebugUnitTest` executado com sucesso (**BUILD SUCCESSFUL em 40s**).
* **Backend:**
  * Testes automatizados em `backend/tests/`:
    * `test_alembic_migrations.py` (validação da árvore de migrações).
    * `test_audit_and_readiness.py` (probes de saúde e trilha de auditoria).
    * `test_auth_governance.py` (regras de bloqueio de registro e manutenção).
    * `test_banners_system.py` (ciclo de vida de banners).
    * `test_fcm_user_push.py` (serviço de mensageria).

---

## 11. Problemas e Riscos Identificados

### 11.1 Problemas Confirmados
1. **Ambiente Local do Container (Node.js global vs node_modules):** A pasta `admin-web/node_modules` não está presente no container do sandbox (o comando `npm run build` falha localmente com `tsc: not found` no container porque as dependências do admin web não foram instaladas dentro da imagem). **Impacto:** Não afeta a compilação do applet Android nem a execução do backend, mas exige `npm install` caso o painel web seja executado localmente fora da nuvem.
2. **Mock Token em Compras Android:** O método `purchasePlan` em `BillingProvider.kt` gera tokens simulados (`play_token_...`) em vez de conectar com a biblioteca nativa `com.android.billingclient:billing-ktx` da Google Play Store.

### 11.2 Possíveis Problemas
1. **Credenciais FCM em Produção:** Se as variáveis `FCM_SERVICE_ACCOUNT_PATH` ou `FCM_CREDENTIALS_JSON` não forem preenchidas em produção, as tentativas de disparo de notificações push entrarão silenciosamente em modo simulação sem notificar os usuários reais.

### 11.3 Itens para Investigação
1. **Política de Expiração de Conexões do Pool de Banco:** O arquivo `database.py` usa `pool_size=10` e `max_overflow=20`. Deve ser avaliado se picos simultâneos do app Android exigirão a implementação de um PgBouncer à frente do PostgreSQL.

---

## 12. Próximos Passos Técnicos

1. **Substituição do Mock de Faturamento no Android:**
   * **Onde:** `app/src/main/java/com/example/core/billing/BillingProvider.kt` e `app/build.gradle.kts`.
   * **O que fazer:** Adicionar a dependência oficial `com.android.billingclient:billing-ktx:7.0.0` e substituir a geração do token simulado pela chamada do fluxo oficial `BillingClient.launchBillingFlow`.
   * **Critério de Conclusão:** O app abre a folha de pagamento nativa da Google Play Store quando o usuário seleciona um plano.
2. **Configuração de Credenciais Reais do Firebase:**
   * **Onde:** Painel de Secrets da infraestrutura e variável `FCM_SERVICE_ACCOUNT_PATH`.
   * **O que fazer:** Fazer upload da chave JSON da conta de serviço do Firebase para permitir o envio real de notificações push.
   * **Critério de Conclusão:** Notificações disparadas pelo `NotificationsHub.tsx` chegam a dispositivos físicos cadastrados.
3. **Pipeline de Deploy e Automação de Migrações:**
   * **Onde:** Dockerfile / script de inicialização de produção.
   * **O que fazer:** Garantir que o comando `alembic upgrade head` seja executado automaticamente antes de iniciar os workers do Gunicorn.

---

## 13. Histórico e Reconstrução do Desenvolvimento

* **Fase 1 (Inicial):** Scaffolding do projeto Android nativo em Kotlin/Compose, estruturação do banco local Room e desenvolvimento da interface básica de leitura bíblica.
* **Fase 2 (Intermediária):** Criação do backend em FastAPI, modelagem das tabelas do acervo bíblico e devocionais, criação das primeiras migrações Alembic e criação do painel SPA em React.
* **Fase 3 (Consolidação de Governança):** Implementação do sistema de tickets de suporte, controle remoto de versões e manutenção em 3 níveis (`007_app_remote_governance`), e bloqueio de compras e cadastros pelo servidor.
* **Fase 4 (Recente):** Criação do gerenciador de campos dinâmicos de cadastro (`010_registration_fields`), central de banners, telemetria de saúde com diagnósticos dos 7 provedores vitais e sistema de alertas sonoros Toast em tempo real no painel administrativo.

---

## 14. HANDOFF PARA OUTRA IA

### Contexto Operacional para Continuidade Imediata

* **O que já está pronto e validado:**
  * O aplicativo Android compila perfeitamente sem nenhum erro no Gradle. Todos os testes unitários (`gradle :app:testDebugUnitTest`) estão passando.
  * O backend FastAPI está com todas as rotas registradas em `backend/app/main.py`, incluindo schemas Pydantic e 10 revisões Alembic estruturadas.
  * O painel administrativo possui 18 telas completas, roteamento no `App.tsx` e sistema de monitoramento Toast com som integrado via Web Audio API.
* **Arquivos Mais Importantes:**
  * `app/src/main/java/com/example/core/billing/BillingProvider.kt`: Ponto focal para transição do faturamento de mock para Google Play Billing real.
  * `backend/app/core/database.py`: Ponto focal de conexão do banco e verificação de integridade (possui fallback automático para SQLite).
  * `backend/app/api/admin/health.py`: Ponto focal do diagnóstico de saúde da infraestrutura.
  * `admin-web/src/context/ToastContext.tsx`: Ponto focal do sistema de alertas flutuantes e áudio de incidentes.
* **Cuidados Especiais:**
  * **NÃO ALTERE** o `applicationId` em `app/build.gradle.kts` nem a chave `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` em `metadata.json`.
  * **NÃO APAGUE** as migrações Alembic existentes; novas alterações estruturais de banco de dados devem ser feitas via nova migração sequencial `011_...py`.
  * O backend aceita tanto PostgreSQL quanto SQLite local; nunca assuma que apenas o PostgreSQL estará rodando no ambiente de homologação.
