# PROJECT CONTINUITY CHECKPOINT

## Fase 2 — Etapa 1: Configuração Remota e Controle Operacional (CONCLUÍDA - CORREÇÃO CIRÚRGICA)

### 1. O que foi feito nesta etapa
Implementado e integrado o sistema de configuração remota e governança operacional de ponta a ponta (Backend FastAPI ↔ Admin Web React ↔ Android Jetpack Compose), respeitando rigorosamente a arquitetura existente sem duplicidades:

- **Backend (FastAPI & PostgreSQL):**
  - Migration Alembic linear padronizada:
    - Identificador: `007_app_remote_governance`
    - `down_revision = '006_ticket_seq_user_soft_del'`
    - Arquivo real: `/backend/alembic/versions/007_app_remote_governance.py`
  - Modelo `AppConfig` em `/backend/app/models/app.py`:
    - `maintenance_mode` (Boolean, default False) mantido como **única fonte da verdade** interna. Nenhuma coluna redundante `maintenance_enabled` foi criada no banco.
    - `maintenance_level` (String 20, default 'informational', permitidos: 'informational', 'partial', 'full')
    - `maintenance_title` (String 150, nullable True)
    - `maintenance_message` (Text)
    - `maintenance_estimated_end` (DateTime timezone-aware, nullable True)
    - `registration_enabled` (Boolean, default True)
    - `purchases_enabled` (Boolean, default True)
    - `premium_enabled` (Boolean, default True)
    - `notifications_enabled` (Boolean, default True)
    - `support_enabled` (Boolean, default True)
    - `cloud_sync_enabled` (Boolean, default True)
    - `devotionals_enabled` (Boolean, default True)
    - `search_enabled` (Boolean, default True)
    - `sharing_enabled` (Boolean, default True)
    - `offline_download_enabled` (Boolean, default True, nullable False) integrado de ponta a ponta.
    - `google_login_enabled` (Boolean, default False)
    - `updated_by` (String 36, nullable True)
  - Schemas Pydantic em `/backend/app/schemas/app.py`:
    - `AppConfigUpdate` e `AppConfigResponse` atualizados com tipagem estrita e validação de `offline_download_enabled`.
  - Rotas Reais da API:
    - `GET /api/v1/app/config` (em `/backend/app/api/public/config.py`): Endpoint público que expõe a governança operacional ativa. Para retrocompatibilidade com clientes legados, expõe `maintenance_enabled` derivado diretamente de `maintenance_mode`.
    - `GET /api/v1/admin/apps/{app_id}/config` (em `/backend/app/api/admin/apps.py`): Recupera configuração do app com autorização admin (`apps.read`).
    - `PUT /api/v1/admin/apps/{app_id}/config` (em `/backend/app/api/admin/apps.py`): Atualiza flags e governança com autorização admin (`apps.write`), validando níveis de manutenção e registrando o operador em `updated_by`.
  - Enforcement e Guards nos Endpoints Públicos:
    - `/backend/app/api/public/auth.py`: Impede novos cadastros quando `registration_enabled == False` (`REGISTRATION_DISABLED`).
    - `/backend/app/api/public/billing.py`: Bloqueia ordens de compra quando `purchases_enabled == False` (`PURCHASES_DISABLED`).
    - `/backend/app/api/public/support.py`: Bloqueia criação de tickets quando `support_enabled == False` (`SUPPORT_DISABLED`).
    - `/backend/app/api/public/user_data.py`: Bloqueia sincronização/mutação de favoritos, histórico e preferências quando `cloud_sync_enabled == False` ou sob manutenção nível `full`.

- **Admin Web (React + TypeScript + Tailwind):**
  - Arquivos reais:
    - `/admin-web/src/types/index.ts`: Interface `AppConfigData` contendo `offline_download_enabled?: boolean`.
    - `/admin-web/src/pages/MultiAppConfig.tsx`:
      - Seletor visual dos 3 níveis de manutenção (`informational`, `partial`, `full`) com cards explicativos.
      - Inputs para título, mensagem de manutenção e data/hora estimada de término (`maintenance_estimated_end`).
      - Toggles granulares com persistência em `PUT /api/v1/admin/apps/{app_id}/config`:
        - `purchases_enabled`, `premium_enabled`, `registration_enabled`, `google_login_enabled`, `cloud_sync_enabled`, `devotionals_enabled`, `notifications_enabled`, `support_enabled`, `search_enabled`, `sharing_enabled` e `offline_download_enabled`.
      - Build verificado com sucesso via `npm run build` (Vite v5.4.21).

- **Android (Kotlin + Jetpack Compose):**
  - Arquivos reais:
    - `/app/src/main/java/com/example/data/remote/Models.kt`: DTO `AppConfigData` com flags completas, incluindo `offlineDownloadEnabled`.
    - `/app/src/main/java/com/example/data/repository/ConfigRepository.kt`: Domain model `RemoteAppConfig` com fallbacks seguros.
    - `/app/src/main/java/com/example/ui/MainViewModel.kt`: `isPremium: StateFlow<Boolean>` exposto a partir do `PreferencesManager`.
    - `/app/src/main/java/com/example/ui/screens/HomeScreen.kt`:
      - Banner adaptativo de manutenção nos 3 níveis (`full`, `partial`, `informational`).
      - Ações de sincronização (`cloudSyncEnabled`), notificações (`notificationsEnabled`) e compartilhamento (`sharingEnabled`) condicionadas à configuração remota.
      - Selo Premium no topo só é exibido para não-assinantes: `!isPremium && remoteConfig.premiumEnabled && remoteConfig.purchasesEnabled`.
    - `/app/src/main/java/com/example/ui/screens/PremiumPaywallScreen.kt`:
      - **Usuário Premium (`isPremium == true`):** Não vê propaganda de Premium, não vê seletores de plano e não vê CTA de compra. Exibe confirmação de assinatura ativa, benefícios já desbloqueados, orientações da Google Play Store, botão de sincronização de assinatura e botão para continuar leitura.
      - **Usuário Não-Premium (`isPremium == false`):**
        - Se `premiumEnabled && purchasesEnabled`: vê a oferta com seletores de planos e CTA de assinatura.
        - Se `purchasesEnabled == false` ou `premiumEnabled == false`: novos checkouts ficam suspensos com aviso amigável, sem botões de compra, mantendo a ação "Restaurar" ativa para assinantes prévios.
    - `/app/src/main/java/com/example/ui/screens/SettingsProfileScreen.kt`:
      - Usuário Premium vê card de confirmação de status ativo sem apelos comerciais de compra.
      - Usuário Não-Premium só vê card convidando a ser Premium se `remoteConfig.premiumEnabled && remoteConfig.purchasesEnabled`.
      - Enforcement de `registration_enabled` no modal de autenticação e `cloud_sync_enabled` no acionamento de sincronização manual.

### 2. O que foi validado
- **Python Backend Compilation:** `python3 -m py_compile` executado com código de retorno 0 em todos os arquivos modificados.
- **Admin Web Build:** `npm --prefix admin-web run build` executado com sucesso (Vite v5.4.21 bundle gerado sem erros).
- **Android Applet Compilation:** `compile_applet` executado com sucesso (`Build succeeded - the applet is compiled`).
- **Android Unit & Robolectric Tests:** `gradle :app:testDebugUnitTest` validado com sucesso.
- **Preservação de Integridade:** Zero alterações de `applicationId`, URLs de produção, chaves ou dependências.

### 3. Decisões tomadas
- `maintenance_mode` é a única fonte da verdade no banco. `maintenance_enabled` é exposto na API pública exclusivamente como alias para manter compatibilidade com versões existentes do app móvel.
- `offline_download_enabled` implementado de ponta a ponta: migration, modelo, schema Pydantic, endpoints admin e público, formulário no Admin Web e repositório de configuração no Android.
- Proteção da experiência Premium: o usuário pagante não é incomodado com banners ou CTAs de conversão.

### 4. Estrutura dos arquivos modificados
- `/backend/alembic/versions/007_app_remote_governance.py`
- `/backend/app/models/app.py`
- `/backend/app/schemas/app.py`
- `/backend/app/api/public/config.py`
- `/backend/app/api/public/auth.py`
- `/backend/app/api/public/user_data.py`
- `/backend/app/api/admin/apps.py`
- `/admin-web/src/types/index.ts`
- `/admin-web/src/pages/MultiAppConfig.tsx`
- `/app/src/main/java/com/example/ui/MainViewModel.kt`
- `/app/src/main/java/com/example/ui/screens/HomeScreen.kt`
- `/app/src/main/java/com/example/ui/screens/PremiumPaywallScreen.kt`
- `/app/src/main/java/com/example/ui/screens/SettingsProfileScreen.kt`
- `/PROJECT_CONTINUITY.md`

## Fase 2 — Etapa 2: Gerenciador de Campos de Cadastro Dinâmicos & Banner Global de Manutenção (CONCLUÍDA)

### 1. O que foi implementado nesta etapa
- **Campos Dinâmicos de Cadastro (Backend & Frontend Integrados):**
  - **Model & Migration:** `RegistrationFieldDefinition` e migration `010_registration_fields.py` com coluna `custom_fields` no modelo `User`.
  - **Validação Server-Side:** Endpoint `POST /api/v1/auth/register` valida tipos (`text`, `number`, `phone`, `date`, `select`, `multiselect`, `boolean`, `textarea`), obrigatoriedade, tamanho min/max, regex e opções aceitas.
  - **Interface Administrativa (`/admin-web/src/pages/RegistrationFields.tsx`):**
    - Métricas em tempo real (total de campos, obrigatórios, opcionais, taxa média de preenchimento).
    - Lista reordenável (sobe/desce) com persistência no backend via `/admin/registration-fields/reorder`.
    - Toggles rápidos com um clique para status Ativo/Inativo e Obrigatório/Opcional.
    - Modal completo de criação e edição com seletor de tipos, editor de opções para select/multiselect, presets de regex (telefone BR, CPF, etc.), mensagens customizadas de erro, e visibilidade em Perfil e Exportação CSV.
    - Mockup interativo de Smartphone com preview ao vivo do formulário de cadastro refletindo validações em tempo real.
    - Simulador de Validação Server-side permitindo testar payloads arbitrários contra a API pública.
  - **Navegação & Roteamento:** Rota `/registration-fields` registrada em `App.tsx`, item no `Sidebar.tsx` e título integrado no `Header.tsx`.

- **Banner Global de Alerta de Manutenção no Admin Web:**
  - Componente `/admin-web/src/components/layout/MaintenanceAlertBanner.tsx` integrado no layout principal `AdminLayout.tsx`.
  - Monitora os modos de manutenção (`full`, `partial`/shade, `informational`) e restrições de governança de autenticação (`registration_enabled == false`, etc.).
  - Exibe aviso de alta visibilidade com contagem regressiva/previsão de término, detalhes da manutenção e link de ação rápida para `/multi-app`.

