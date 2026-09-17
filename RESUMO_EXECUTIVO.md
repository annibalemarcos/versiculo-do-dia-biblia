# Resumo Executivo: Versículo do Dia & Bíblia

---

## 1. Sumário Executivo & Propósito do Produto

O **Versículo do Dia & Bíblia** é um ecossistema cristão multiplataforma de alta disponibilidade, desenhado para promover engajamento diário consistente com as Sagradas Escrituras por meio de leitura contextualizada, devocionais temáticos, busca orientada por emoções e suporte humanizado.

### Problemas Centrais Resolvidos
1. **Resiliência e Continuidade Offline-First:** Eliminação da dependência contínua de sinal de internet para leitura e meditação, sincronizando preferências, favoritos e históricos automaticamente em segundo plano.
2. **Governança Editorial Dinâmica e Segmentada:** Capacidade de programar versículos, publicar devocionais, categorizar emoções e disparar notificações push sem necessidade de compilar novas versões do app na Google Play Store.
3. **Atendimento Direto & Monetização Sustentável:** Central de chamados in-app (Helpdesk integrado com chat em tempo real e rastreabilidade total por protocolo), alinhada a um modelo híbrido de receita (planos Premium via Google Play Billing e posicionamentos estratégicos de anúncios).

---

## 2. Arquitetura Técnica Integrada

O projeto adota uma arquitetura em 3 camadas desacopladas e integradas via contratos REST com payloads tipados:

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENTE MOBILE                            │
│  - Android Nativo (Kotlin 2.0+ / Jetpack Compose / M3)          │
│  - Room Database (Offline-First) + StateFlow / Coroutines       │
│  - SyncManager (Fila de sincronização bidirecional resiliente)  │
│  - Retrofit 2 + Moshi / OkHttp3 com Interceptor de Token        │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS / JWT Bearer
┌────────────────────────────────▼────────────────────────────────┐
│                       BACKEND & CORE API                        │
│  - FastAPI (Python 3.11+) + Pydantic v2                         │
│  - SQLAlchemy 2.0 + Alembic (Migrações versionadas)             │
│  - PostgreSQL 15+ (com fallback transparente para SQLite local) │
│  - Autenticação JWT (HS256) + RBAC Granular + Trilha de Auditoria│
│  - LGPD Compliance (Anonimização e exclusão voluntária via API) │
└────────────────────────────────▲────────────────────────────────┘
                                 │ HTTPS / JWT Bearer
┌────────────────────────────────┴────────────────────────────────┐
│                       PAINEL DE CONTROLE                        │
│  - Admin Web SPA (React 18 / TypeScript / Vite / Tailwind CSS)  │
│  - Gestão Editorial (Versículos, Devocionais, Emoções)          │
│  - Perfil 360° do Usuário com concessão manual de benefícios    │
│  - Helpdesk com moderação de tickets e timeline de respostas    │
│  - Hub de Monetização (Simulador, Produtos, Ads e Assinaturas)  │
└─────────────────────────────────────────────────────────────────┘
```

### Especificações das Camadas:

#### A. Aplicativo Android Nativo (`/app`)
- **Interface Declarativa:** Jetpack Compose com Material Design 3, paleta com suporte a tema escuro/claro, tipografia adaptativa e touch targets mínimos de 48dp.
- **Persistência Local (Room):** `VerseDatabase` contendo entidades indexadas para versículos, devocionais, favoritos locais, histórico de leitura, notificações e preferências de leitura.
- **Isolamento de Sessão:** Suporte transparente a modo anônimo (guest) e autenticado, mantendo integridade de dados locais via transição atômica.
- **Helpdesk Integrado:** Telas dedicadas para abertura de chamados, visualização por protocolo (`TKT-XXXXXX`), cópia rápida para clipboard e chat em tempo real com indicador visual de bloqueio em chamados encerrados (`CLOSED`).

#### B. Serviços de Backend (`/backend`)
- **API Pública (`/api/public`):** Endpoints de autenticação, sincronização de perfil (`/me`), favoritos/histórico (`/me/sync`), listagem de versículos, devocionais, suporte ao cliente (`/support/tickets`) e registro de dispositivos push (`/me/devices`).
- **API Administrativa (`/api/admin`):** Endpoints restritos por permissões (RBAC: `admin`, `editor`, `support`), englobando moderação de conteúdo, agendador do Versículo do Dia, perfil 360° do usuário com concessões manuais de *Entitlements* e trilha de auditoria imutável (`AdminAuditLog`).
- **Resiliência de Banco:** Inicialização com auto-seed de permissões, administrador padrão e versículos de exemplo tanto no PostgreSQL de produção quanto no SQLite de desenvolvimento.

#### C. Painel Web Administrativo (`/admin-web`)
- **Stack & Tooling:** React 18, TypeScript, Vite e Tailwind CSS, consumindo a API com proxy reverso e interceptors de autorização.
- **Operação 360°:** Visualização unificada por abas no modal de usuário (Resumo cadastral, Versículos favoritados na nuvem, Histórico de leituras, Chamados de suporte vinculados, Notificações recebidas, Dispositivos FCM registrados e Estado da Assinatura Premium com auditoria de concessão).

---

## 3. Matriz de Status Atual de Desenvolvimento

| Frente | Módulo / Funcionalidade | Status | Detalhes Técnicos |
|---|---|:---:|---|
| **Android** | Leitor Bíblico & Navegação | **100% Concluído** | Leitura por livros, capítulos e traduções, com controle de fonte e tema. |
| **Android** | Persistência & Sincronização | **100% Concluído** | Room Database com `SyncManager` para sincronização com o backend. |
| **Android** | Helpdesk & Chat de Suporte | **100% Concluído** | Abertura de chamados, protocolo copiado em 1 clique, chat e trava de leitura em chamados `CLOSED`. |
| **Android** | Registro de Dispositivos (FCM) | **100% Concluído** | Integração em `BibleApiService`, `NotificationRepository` e `MainViewModel` (`POST /me/devices`). |
| **Backend** | Autenticação & Rotas Públicas | **100% Concluído** | Login anônimo/e-mail, JWT, endpoints de leitura e devocionais. |
| **Backend** | Motor de Tickets & Suporte | **100% Concluído** | Geração atômica de protocolo sequencial, histórico de alterações de status e bloqueio de novos anexos/mensagens para tickets fechados. |
| **Backend** | Perfil 360° & Auditoria | **100% Concluído** | Métricas agregadas por usuário e concessão manual de benefícios com justificativa obrigatória. |
| **Backend** | Registro de Dispositivos | **100% Concluído** | Modelagem `UserPushDevice`, endpoints com schema Pydantic e vinculação com usuário logado. |
| **Admin Web** | Gestão Editorial | **100% Concluído** | Versículos, agendador diário, devocionais e categorização de temas/emoções. |
| **Admin Web** | Perfil 360° do Usuário | **100% Concluído** | Abas dedicadas: Resumo, Favoritos, Histórico, Chamados, Notificações, Dispositivos e Benefícios. |
| **Admin Web** | Helpdesk Administrativo | **100% Concluído** | Fila de atendimento, filtros por status/prioridade, resposta direta e alteração de status. |

---

## 4. Funcionalidades Prioritárias Pendentes (Fechamento do Ciclo)

Para concluir o ciclo de consolidação e deixar o ecossistema 100% pronto para homologação e lançamento em larga escala:

```
┌───────────────────────────────────────────────────────────────────────────┐
│            ROADMAP CRÍTICO DE FECHAMENTO DE CICLO (4 ETAPAS)              │
├───────────────────────────────────────────────────────────────────────────┤
│ 1. Concluir MonetizationHub no Admin Web (5 Abas Interativas)             │
│    ├── Aba 1: Simulador Financeiro (LTV, Churn, Previsão de Faturamento) │
│    ├── Aba 2: Produtos Google Play (CRUD e sincronização de SKUs)        │
│    ├── Aba 3: Posicionamentos de Anúncio (Ad Placements remotos)         │
│    ├── Aba 4: Gestão de Assinaturas (Status, Renovação e Churn)          │
│    └── Aba 5: Diagnóstico e Validação de Webhooks Google Play            │
│                                                                           │
│ 2. Ativação Real do Google Play Billing no Android                        │
│    ├── Conectar com.android.billingclient:billing-ktx na PaywallScreen   │
│    └── Integrar verificação de recibos (POST /billing/verify) no Backend │
│                                                                           │
│ 3. Disparo Real de Push Notifications via Firebase Admin SDK              │
│    ├── Notificações de resposta de chamado (Staff -> Usuário)            │
│    └── Notificações automáticas do Versículo do Dia agendado             │
│                                                                           │
│ 4. Bateria de Testes Automatizados e Homologação Final                   │
│    ├── Testes unitários/Robolectric cobrindo CUJs de Suporte e Sync       │
│    └── Validação de conformidade das regras da Google Play Developer     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Conclusão e Próximos Passos
O ecossistema apresenta maturidade técnica expressiva, com código modular, separação clara de responsabilidades entre cliente mobile, core server e painel administrativo, e observância estrita a normas de segurança e privacidade (LGPD). 

O foco imediato para finalização completa reside na **conclusão do MonetizationHub no Admin Web** e na **vinculação dos fluxos de pagamento reais na Google Play Store**.
