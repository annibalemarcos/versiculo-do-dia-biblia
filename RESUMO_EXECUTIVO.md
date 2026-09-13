# Resumo Executivo: Versículo do Dia & Bíblia

**Data de Atualização:** Setembro de 2026  
**Status do Projeto:** Fase de Consolidação & Homologação Pré-Lançamento  
**Classificação:** Documento Técnico-Estratégico Executivo  

---

## 1. Sumário Executivo & Propósito do Produto

O **Versículo do Dia & Bíblia** é um ecossistema cristão multiplataforma de alta disponibilidade e retenção, concebido para transformar o hábito diário de leitura das Sagradas Escrituras em uma experiência personalizada, contextualizada e comunitária. O produto combina leitura bíblica offline-first, devocionais diários, busca por estado emocional, suporte humanizado ao fiel e governança operacional centralizada.

### 1.1 Proposta de Valor & Dores Resolvidas
1. **Resiliência Offline-First Contínua:** Eliminação da dependência de conectividade constante para oração e leitura bíblica. Todo o conteúdo litúrgico, notas, favoritos e planos são preservados localmente e sincronizados de forma transparente assim que há reconexão.
2. **Curadoria Editorial Dinâmica & Multi-App:** Controle centralizado de versículos diários, devocionais temáticos e temas emocionais via painel administrativo, permitindo atualização instantânea no app sem exigir novos lançamentos de APK na Google Play Store.
3. **Cuidado Pastoral & Suporte Humanizado:** Central de Helpdesk in-app com geração de protocolo sequencial (`TKT-XXXXXX`), chat bidirecional em tempo real e timeline de atendimento integrada ao perfil 360° do usuário.
4. **Monetização Híbrida & Sustentável:** Modelo de negócios equilibrado aliando planos de assinatura Premium (sem anúncios, temas exclusivos, fontes e áudio) e posicionamentos estratégicos de anúncios nativos/intersticiais com controle remoto de frequência.

---

## 2. Arquitetura Técnica Integrada

O ecossistema adota uma arquitetura em 3 camadas desacopladas, orientada a micro-serviços RESTful e contratos estritos de dados:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAMADA 1: CLIENTE MOBILE                        │
│  - Android Nativo (Kotlin 2.0+ / Jetpack Compose / Material Design 3)  │
│  - Room Database 2.6+ (SQLite Indexado Offline-First)                  │
│  - SyncManager (Fila de sincronização atômica bidirecional)           │
│  - Coroutines + StateFlow + MVVM / Clean Architecture                  │
│  - Retrofit 2 + Moshi + OkHttp3 com Interceptor de Token JWT          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / JWT Bearer Tokens
┌───────────────────────────────────▼────────────────────────────────────┐
│                   CAMADA 2: BACKEND CORE & SERVIÇOS                    │
│  - FastAPI (Python 3.11+) + Validação Pydantic v2                      │
│  - SQLAlchemy 2.0 + Alembic (Versionamento de Schemas)                 │
│  - PostgreSQL 15+ (com fallback transparente para SQLite)              │
│  - Segurança: Autenticação JWT (HS256), RBAC Granular e Auditoria      │
│  - LGPD Compliance: Anonimização de PII e exclusão voluntária de conta │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTPS / JWT Bearer Tokens
┌───────────────────────────────────┴────────────────────────────────────┐
│                    CAMADA 3: PAINEL ADMINISTRATIVO                     │
│  - Admin Web SPA (React 18 / TypeScript 5 / Vite / Tailwind CSS)       │
│  - Recharts: Gráficos de telemetria em tempo real e projeção financeira│
│  - Hubs: Editorial, Helpdesk, Monetização, Multi-App, Perfil 360°      │
│  - Governança: Controle de auditoria imutável (AdminAuditLog)          │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Especificação Detalhada dos Componentes

#### A. Aplicativo Android Nativo (`/app`)
* **Interface & UX:** 100% Jetpack Compose com suporte nativo a Material 3, tema dinâmico claro/escuro, tipografia bíblica configurável (serifada/sem serifa), tamanho de fonte ajustável e conformidade de acessibilidade (touch targets ≥ 48dp).
* **Persistência Local (Room):** `VerseDatabase` com DAOs especializados para versículos (`verses`), devocionais (`devotionals`), favoritos locais (`favorites`), histórico de leitura (`reading_history`), notificações (`notifications`) e tickets locais (`support_tickets`).
* **Sincronização (`SyncManager`):** Fila assíncrona tolerante a falhas que enfileira ações do usuário (favoritar, ler, marcar como lido) e sincroniza via `POST /me/sync` quando a conectividade é restabelecida.
* **Helpdesk Integrado:** Telas dedicadas para abertura de chamados com categorias litúrgicas/técnicas, visualização por protocolo copiado com 1 toque, chat de atendimento e bloqueio automático de novas mensagens em chamados concluídos (`CLOSED`).

#### B. Backend & API REST (`/backend`)
* **Framework & Desempenho:** FastAPI com documentação OpenAPI/Swagger interativa automática, injeção de dependência e tratamento global de exceções estruturadas.
* **Mecanismos de Segurança:** Senhas criptografadas com bcrypt, autenticação stateless via JWT Bearer Tokens, isolamento de inquilinos via `app_id` e RBAC granular (`admin`, `editor`, `support`, `finance`).
* **Banco de Dados:** Compatibilidade dual com PostgreSQL para ambientes de nuvem/produção e SQLite para desenvolvimento e testes automatizados. Migrações automáticas de esquemas gerenciadas por Alembic.
* **Trilha de Auditoria:** Gravação imutável de todas as mutações administrativas (`AdminAuditLog`) contendo `admin_id`, `ip_address`, `action`, `resource` e dados alterados (diff JSON).

#### C. Painel Web Administrativo (`/admin-web`)
* **Arquitetura Front-End:** React 18 SPA construído com TypeScript e Vite, estilizado com Tailwind CSS e biblioteca Lucide Icons.
* **Engajamento & Telemetria em Tempo Real:** Widget "User Engagement" integrado com alternador "Live Data" (pausa/retomada de polling sem recarregar a tela), visualização de usuários simultâneos por atividade e ranking de compartilhamentos virais (*Trending Verse Shares*).
* **Monetization Hub:** Centro de inteligência financeira com 5 abas ativas: Simulador Financeiro (LTV/CAC/Churn), Gerenciador de SKUs da Google Play, Posicionamento de Anúncios (Ad Placements remotos), Gestão de Assinantes e Validador de Webhooks.
* **Visão 360° do Fiel:** Modal unificado de atendimento permitindo consultar histórico de leitura, dispositivos conectados (FCM), chamados abertos e conceder benefícios manuais (*Entitlements*) com justificativa obrigatória.

---

## 3. Matriz de Status Atual de Desenvolvimento

| Camada / Módulo | Componente Técnico | Status | Cobertura & Detalhes |
|---|---|:---:|---|
| **Android** | Leitor Bíblico & Navegação | **Concluído (100%)** | Navegação por livros, capítulos e traduções, com controle de fonte e tema. |
| **Android** | Persistência Room & SyncManager | **Concluído (100%)** | Banco SQLite local indexado e sincronização atômica bidirecional com a nuvem. |
| **Android** | Suporte in-app (Helpdesk) | **Concluído (100%)** | Criação de chamados, protocolo com cópia rápida, histórico e chat sincronizado. |
| **Android** | Registro de Dispositivos (FCM) | **Concluído (100%)** | Captura de token push e registro associado à conta do usuário (`/me/devices`). |
| **Android** | Paywall & UI de Assinaturas | **Concluído (95%)** | Telas de conversão com destaques de benefícios e seleção de periodicidade. |
| **Backend** | Autenticação & Rotas Públicas | **Concluído (100%)** | Suporte a login anônimo (guest) e autenticado, geração e renovação de JWT. |
| **Backend** | Motor de Atendimento ao Cliente | **Concluído (100%)** | Geração atômica de protocolos sequenciais, transição de status e chat. |
| **Backend** | Telemetria & Analytics em Tempo Real | **Concluído (100%)** | Endpoints de engajamento ativo, picos por hora e métricas de viralidade. |
| **Backend** | Motor de Monetização & Webhooks | **Concluído (100%)** | CRUD de planos, produtos, regras de anúncios e receptor de notificações RTDN. |
| **Backend** | Perfil 360° & Auditoria | **Concluído (100%)** | Concessão auditada de planos e visão consolidada de eventos por usuário. |
| **Admin Web** | Gestão Editorial | **Concluído (100%)** | Agendador do Versículo do Dia, criação de devocionais e temas emocionais. |
| **Admin Web** | Fila de Helpdesk & Atendimento | **Concluído (100%)** | Triagem de chamados, chat com o usuário e fechamento com motivo documentado. |
| **Admin Web** | User Engagement & Live Data | **Concluído (100%)** | Gráficos Recharts em tempo real, ranking de versículos e controle Live Data. |
| **Admin Web** | Monetization Hub (5 Abas) | **Concluído (100%)** | Simulador financeiro, catálogo de SKUs, ad placements e controle de assinaturas. |

---

## 4. Funcionalidades Prioritárias Pendentes para Fechamento do Ciclo

Para finalizar a fase de consolidação e atingir 100% de prontidão para homologação e publicação comercial nas lojas de aplicativos, o plano de fechamento foca nas seguintes 4 frentes prioritárias:

```
┌────────────────────────────────────────────────────────────────────────────┐
│             ROADMAP DE CONSOLIDAÇÃO FINAL (4 FRENTES CRÍTICAS)             │
├────────────────────────────────────────────────────────────────────────────┤
│ 1. Ativação do Google Play Billing SDK 7.x no Android                      │
│    ├── Conectar com.android.billingclient:billing-ktx na PaywallScreen.kt   │
│    ├── Implementar PurchasesUpdatedListener para compra e restauração      │
│    └── Integrar handshake de validação de recibo no backend (/billing/verify)│
│                                                                            │
│ 2. Disparo Real de Notificações Push (Firebase Cloud Messaging)            │
│    ├── Implementar serviço de envio com Firebase Admin SDK no FastAPI      │
│    ├── Gatilho automático: Notificação matinal do Versículo do Dia agendado│
│    └── Gatilho de atendimento: Alerta ao usuário quando staff responder ticket│
│                                                                            │
│ 3. Player de Áudio Devocional em Background no Android                     │
│    ├── Integrar Media3 / ExoPlayer para reprodução de devocionais narrados │
│    └── Notificação de controle de mídia com reprodução/pausa na tela bloqueada│
│                                                                            │
│ 4. Bateria de Testes Automatizados & Conformidade de Lançamento            │
│    ├── Cobertura de testes unitários e Robolectric (CUJs de Sync e Billing)│
│    ├── Validação dos termos de consentimento e conformidade LGPD/GDPR      │
│    └── Checklist de conformidade com as diretrizes do Google Play Console  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento das Tarefas de Fechamento:

1. **Google Play Billing Nativo:**
   - Adicionar o fluxo de compra de assinaturas via `BillingClient`, garantindo que o usuário receba confirmação instantânea da compra e o backend atualize o status de *Entitlement* na tabela `subscriptions`.
2. **Push Notifications via FCM:**
   - Adicionar as credenciais de serviço Firebase no backend para permitir o envio real de mensagens aos tokens salvos em `user_push_devices`.
3. **Player de Áudio Devocional:**
   - Adicionar suporte a áudio-devocionais narrados através da biblioteca Jetpack Media3 (`androidx.media3:media3-exoplayer`), permitindo que os fiéis ouçam a mensagem do dia em segundo plano.
4. **Homologação & Qualidade:**
   - Execução de testes de estresse de sincronização offline para validar concorrência de escritas no banco de dados e testes de usabilidade em telas compactas e tablets.

---

## 5. Conclusão Executiva

O projeto **Versículo do Dia & Bíblia** consolidou uma infraestrutura moderna, escalável e de nível de produção em todas as suas camadas: cliente nativo Kotlin/Compose de alto desempenho, backend FastAPI robusto e seguro com suporte à LGPD, e um painel operacional em React rico em dados e recursos de governança.

A conclusão das frentes prioritárias (Google Play Billing, Firebase Push e Player de Áudio) posicionará o aplicativo como uma solução de referência e alto valor no segmento religioso e devocional.
