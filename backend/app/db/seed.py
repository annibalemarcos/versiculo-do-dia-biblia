import os
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db, engine, is_production
from app.core.config import settings
from app.models import Base
from app.core.security import get_password_hash
from app.models.app import App, AppConfig, FeatureFlag
from app.models.auth import AdminUser, Role, Permission, RolePermission, AdminUserRole
from app.models.bible import (
    BibleTranslation, Book, Verse, Theme, Emotion, VerseTheme, VerseEmotion,
    DailyVerse, Reflection, Devotional, DevotionalDay
)
from app.models.monetization import (
    Entitlement, PremiumProduct, AdPlacement, AdConfig
)
from app.models.notification import NotificationTemplate, UserNotification
from app.models.experiment import Experiment, ExperimentVariant
from app.models.analytics import AnalyticsDailyAggregate
from app.models.user import User, UserPreference, Favorite
from app.models.ticket import SupportTicket, TicketMessage, TicketHistory

logger = logging.getLogger("uvicorn.error")

def run_bootstrap(
    db: Session,
    now: datetime,
    is_prod: bool,
    admin_email: Optional[str] = None,
    admin_password: Optional[str] = None
) -> None:
    """
    Executes essential bootstrap data required for the application to function.
    Safe for production and development. Idempotent.
    """
    print("-> Executando bootstrap essencial...")

    # 1. Apps
    app = db.query(App).filter(App.id == "verse_daily").first()
    if not app:
        app = App(
            id="verse_daily",
            name="Versículo do Dia & Bíblia",
            package_id="com.aistudio.versiculododia",
            platform="android",
            status="active",
            default_language="pt-BR",
            description="Aplicativo principal de versículos diários, devocionais e estudo bíblico."
        )
        db.add(app)
        db.flush()

        cfg = AppConfig(
            app_id=app.id,
            app_mode="PRODUCTION" if is_prod else "TEST",
            maintenance_mode=False,
            maintenance_message="O aplicativo está temporariamente em manutenção.",
            minimum_supported_version=1,
            latest_version=1,
            force_update=False,
            store_url="https://play.google.com/store/apps/details?id=com.aistudio.versiculododia",
            custom_settings={"daily_verse_hour": 8, "enable_audio_narration": True}
        )
        db.add(cfg)

        # Feature Flags
        flags = [
            FeatureFlag(app_id=app.id, key="feature_audio_narration", enabled=True, description="Narração em áudio dos versículos"),
            FeatureFlag(app_id=app.id, key="feature_community_prayer", enabled=False, description="Mural comunitário de oração"),
            FeatureFlag(app_id=app.id, key="feature_daily_quiz", enabled=True, description="Quiz diário de conhecimento bíblico"),
            FeatureFlag(app_id=app.id, key="feature_reading_plans", enabled=True, description="Planos de leitura bíblica avançados"),
            FeatureFlag(app_id=app.id, key="feature_ai_devotional_insights", enabled=False, description="Reflexões e insights teológicos gerados por IA"),
        ]
        for f in flags:
            db.add(f)
        db.flush()
        print("✓ App principal (verse_daily), configurações e feature flags criados.")

    # 2. Permissions (RBAC)
    permissions_data = [
        ("dashboard.read", "Visualizar Dashboard", "dashboard", "Permite acessar métricas agregadas e KPIs do painel"),
        ("content.read", "Visualizar Conteúdo", "content", "Acesso de leitura a versículos, devocionais e temas"),
        ("content.write", "Editar Conteúdo", "content", "Criação e edição de versículos, devocionais e temas"),
        ("content.delete", "Excluir Conteúdo", "content", "Exclusão permanente de versículos e devocionais"),
        ("monetization.read", "Visualizar Monetização", "monetization", "Acesso aos produtos e métricas de receita"),
        ("monetization.write", "Gerenciar Monetização", "monetization", "Alterar produtos, preços e ad placements"),
        ("users.read", "Visualizar Usuários", "users", "Acesso à lista e perfil de usuários do app"),
        ("users.block", "Bloquear/Moderar Usuários", "users", "Bloquear e desbloquear usuários do aplicativo"),
        ("apps.read", "Visualizar Apps", "apps", "Visualizar configurações e metadados de apps"),
        ("apps.write", "Gerenciar Apps", "apps", "Cadastrar e alterar configurações e metadados de apps"),
        ("feature_flags.read", "Visualizar Feature Flags", "feature_flags", "Consultar status de feature flags"),
        ("feature_flags.write", "Alterar Feature Flags", "feature_flags", "Habilitar e desabilitar feature flags"),
        ("notifications.read", "Visualizar Notificações", "notifications", "Consultar templates e histórico de push"),
        ("notifications.write", "Gerenciar Notificações", "notifications", "Criar e editar templates e campanhas push"),
        ("notifications.send", "Disparar Push Notifications", "notifications", "Permissão para enviar disparos em massa"),
        ("experiments.read", "Visualizar Testes A/B", "experiments", "Consultar métricas de experimentos ativos"),
        ("experiments.write", "Gerenciar Testes A/B", "experiments", "Criar, pausar e concluir experimentos A/B"),
        ("analytics.read", "Visualizar Relatórios e Analytics", "analytics", "Exportar relatórios de audiência e receita"),
        ("audit.read", "Consultar Logs de Auditoria", "audit", "Acesso irrestrito a logs de auditoria do sistema"),
        ("system.health", "Monitorar Saúde do Sistema", "system", "Acesso ao painel de infraestrutura e conectividade"),
        ("staff.view", "Visualizar Equipe", "staff", "Visualizar membros da equipe e seus papéis"),
        ("staff.request_create", "Solicitar Criação de Membro", "staff", "Solicitar cadastro de novo colaborador"),
        ("staff.request_role_change", "Solicitar Troca de Perfil", "staff", "Solicitar alteração de papel de colaborador"),
        ("staff.request_promotion", "Solicitar Promoção a Master", "staff", "Solicitar elevação para cargo de liderança"),
        ("staff.approve_request", "Aprovar Solicitações de Equipe", "staff", "Aprovar ou rejeitar solicitações de equipe"),
        ("staff.manage_department", "Gerenciar Departamento", "staff", "Editar e organizar membros do próprio departamento"),
        ("tickets.view", "Visualizar Chamados de Suporte", "tickets", "Acessar tickets de atendimento"),
        ("tickets.create", "Criar Chamados Internos", "tickets", "Abrir chamados de suporte pelo painel"),
        ("tickets.reply", "Responder Chamados", "tickets", "Enviar mensagens públicas e respostas ao usuário"),
        ("tickets.assign", "Atribuir Chamados", "tickets", "Designar responsável pelo ticket"),
        ("tickets.add_participant", "Adicionar Participantes", "tickets", "Adicionar colaboradores no chamado"),
        ("tickets.remove_participant", "Remover Participantes", "tickets", "Remover colaboradores do chamado"),
        ("tickets.edit", "Editar Tickets", "tickets", "Alterar prioridade e categoria"),
        ("tickets.resolve", "Resolver Tickets", "tickets", "Marcar chamado como resolvido"),
        ("tickets.close", "Encerrar Tickets", "tickets", "Fechar chamado em definitivo"),
        ("tickets.internal_notes", "Gerenciar Notas Internas", "tickets", "Adicionar e ler anotações confidenciais da equipe"),
        ("notifications.view", "Visualizar Notificações de Equipe", "notifications", "Acessar central interna de notificações"),
        ("notifications.mark_read", "Gerenciar Leitura de Notificações", "notifications", "Marcar notificações de equipe como lidas"),
    ]

    perm_objects = {}
    for p_id, p_name, p_mod, p_desc in permissions_data:
        p = db.query(Permission).filter(Permission.id == p_id).first()
        if not p:
            p = Permission(id=p_id, name=p_name, module=p_mod, description=p_desc)
            db.add(p)
        perm_objects[p_id] = p
    db.flush()

    # 3. Roles with Department and Hierarchy
    roles_data = [
        ("super_admin", "Administrador Master", "Acesso irrestrito a todos os módulos, aprovação de equipe e autoridade máxima", True, "management", 3, True, True, False, None, list(perm_objects.keys())),
        ("admin", "Administrador Geral", "Acesso operacional a conteúdo, usuários, apps, relatórios e equipe", True, "management", 2, True, True, False, "super_admin", [
            "dashboard.read", "content.read", "content.write", "content.delete",
            "monetization.read", "monetization.write", "users.read", "users.block",
            "apps.read", "apps.write", "feature_flags.read", "feature_flags.write",
            "notifications.read", "notifications.write", "notifications.send",
            "experiments.read", "experiments.write", "analytics.read", "audit.read", "system.health",
            "staff.view", "staff.request_create", "staff.request_role_change", "staff.request_promotion", "staff.manage_department",
            "tickets.view", "tickets.create", "tickets.reply", "tickets.assign", "tickets.add_participant", "tickets.remove_participant", "tickets.edit", "tickets.resolve", "tickets.close", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("editor_master", "Editor Master de Conteúdo", "Líder editorial do departamento de conteúdo bíblico", True, "content", 2, True, True, False, "super_admin", [
            "dashboard.read", "content.read", "content.write", "content.delete",
            "notifications.read", "notifications.write", "staff.view", "staff.request_create", "staff.request_role_change", "staff.manage_department",
            "tickets.view", "tickets.reply", "tickets.add_participant", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("editor", "Editor de Conteúdo", "Gestão de versículos, devocionais, temas e reflexões", True, "content", 1, False, False, True, "editor_master", [
            "dashboard.read", "content.read", "content.write", "notifications.read",
            "tickets.view", "tickets.reply", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("monetization_master", "Master de Monetização", "Líder de estratégia de monetização, ads e produtos", True, "monetization", 2, True, True, False, "super_admin", [
            "dashboard.read", "monetization.read", "monetization.write", "experiments.read", "experiments.write", "analytics.read",
            "staff.view", "staff.request_create", "staff.request_role_change", "staff.manage_department",
            "tickets.view", "tickets.reply", "tickets.add_participant", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("monetization_manager", "Gestor de Monetização", "Operação de produtos, campanhas de ads e simulações", True, "monetization", 1, False, False, True, "monetization_master", [
            "dashboard.read", "monetization.read", "experiments.read", "analytics.read",
            "tickets.view", "tickets.reply", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("support_master", "Master / Supervisor de Suporte", "Líder da equipe de atendimento e suporte ao usuário", True, "support", 2, True, True, False, "super_admin", [
            "dashboard.read", "users.read", "users.block", "audit.read",
            "staff.view", "staff.request_create", "staff.request_role_change", "staff.manage_department",
            "tickets.view", "tickets.create", "tickets.reply", "tickets.assign", "tickets.add_participant", "tickets.remove_participant", "tickets.edit", "tickets.resolve", "tickets.close", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
        ("support_agent", "Agente de Suporte ao Usuário", "Atendimento de tickets de suporte e resposta aos usuários", True, "support", 1, False, False, True, "support_master", [
            "dashboard.read", "users.read",
            "tickets.view", "tickets.reply", "tickets.resolve", "tickets.internal_notes",
            "notifications.view", "notifications.mark_read"
        ]),
    ]

    for r_id, r_name, r_desc, r_sys, r_dept, r_level, r_master, r_manage, r_req, r_parent, r_perms in roles_data:
        role = db.query(Role).filter(Role.id == r_id).first()
        if not role:
            role = Role(
                id=r_id,
                name=r_name,
                description=r_desc,
                is_system=r_sys,
                department=r_dept,
                hierarchy_level=r_level,
                is_department_master=r_master,
                can_manage_staff=r_manage,
                requires_master_approval=r_req,
                parent_role_id=r_parent
            )
            db.add(role)
            db.flush()
        else:
            role.name = r_name
            role.description = r_desc
            role.department = r_dept
            role.hierarchy_level = r_level
            role.is_department_master = r_master
            role.can_manage_staff = r_manage
            role.requires_master_approval = r_req
            role.parent_role_id = r_parent

        for perm_id in r_perms:
            if perm_id in perm_objects:
                exists = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm_id
                ).first()
                if not exists:
                    db.add(RolePermission(role_id=role.id, permission_id=perm_id))
    db.flush()
    print("✓ Permissões e Perfis (RBAC) cadastrados.")

    # 4. Super Admin User
    # Production security rule: Never create default admin with hardcoded password.
    # Read from explicit environment variables or arguments.
    eff_admin_email = (admin_email or settings.INITIAL_ADMIN_EMAIL or os.getenv("INITIAL_ADMIN_EMAIL", "")).strip()
    eff_admin_password = (admin_password or settings.INITIAL_ADMIN_PASSWORD or os.getenv("INITIAL_ADMIN_PASSWORD", "")).strip()

    if is_prod:
        if eff_admin_email and eff_admin_password:
            existing_admin = db.query(AdminUser).filter(AdminUser.email == eff_admin_email).first()
            if not existing_admin:
                admin_user = AdminUser(
                    email=eff_admin_email,
                    name="Administrador Master",
                    hashed_password=get_password_hash(eff_admin_password),
                    is_active=True,
                    is_super_admin=True,
                    department="management",
                    approval_status="APPROVED"
                )
                db.add(admin_user)
                db.flush()
                db.add(AdminUserRole(admin_user_id=admin_user.id, role_id="super_admin"))
                logger.info(f"Initial super administrator created for production: {eff_admin_email}")
                print(f"✓ Super Admin inicial criado com sucesso: {eff_admin_email}")
            else:
                existing_admin.is_active = True
                existing_admin.is_super_admin = True
                existing_admin.department = "management"
                existing_admin.approval_status = "APPROVED"
        else:
            print("[AVISO DE SEGURANÇA - PRODUÇÃO] INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD não configurados.")
            print("[AVISO DE SEGURANÇA - PRODUÇÃO] Nenhum usuário administrador padrão foi criado em produção.")
    else:
        # Development / Local testing
        dev_email = eff_admin_email if eff_admin_email else "admin@versiculododia.com"
        dev_pass = eff_admin_password if eff_admin_password else "Admin@123456"

        admin_user = db.query(AdminUser).filter(AdminUser.email == dev_email).first()
        if not admin_user:
            admin_user = AdminUser(
                email=dev_email,
                name="Administrador Master",
                hashed_password=get_password_hash(dev_pass),
                is_active=True,
                is_super_admin=True,
                department="management",
                approval_status="APPROVED"
            )
            db.add(admin_user)
            db.flush()
            db.add(AdminUserRole(admin_user_id=admin_user.id, role_id="super_admin"))
            print(f"✓ Usuário Super Admin de desenvolvimento criado: {dev_email}")
        else:
            admin_user.department = "management"
            admin_user.approval_status = "APPROVED"

    # 5. Bible Translations
    translations = [
        BibleTranslation(id="NVI", name="Nova Versão Internacional", language="pt-BR", is_public_domain=False, is_default=True, is_active=True),
        BibleTranslation(id="ACF", name="Almeida Corrigida Fiel", language="pt-BR", is_public_domain=True, is_default=False, is_active=True),
        BibleTranslation(id="KJV", name="King James Version", language="en-US", is_public_domain=True, is_default=False, is_active=True),
    ]
    for t in translations:
        if not db.query(BibleTranslation).filter(BibleTranslation.id == t.id).first():
            db.add(t)

    # 6. Bible Books
    books_data = [
        ("GEN", 1, "Gênesis", "VT", 50),
        ("EXO", 2, "Êxodo", "VT", 40),
        ("LEV", 3, "Levítico", "VT", 27),
        ("NUM", 4, "Números", "VT", 36),
        ("DEU", 5, "Deuteronômio", "VT", 34),
        ("JOS", 6, "Josué", "VT", 24),
        ("PSA", 19, "Salmos", "VT", 150),
        ("PRO", 20, "Provérbios", "VT", 31),
        ("ISA", 23, "Isaías", "VT", 66),
        ("JER", 24, "Jeremias", "VT", 52),
        ("MAT", 40, "Mateus", "NT", 28),
        ("MAR", 41, "Marcos", "NT", 16),
        ("LUK", 42, "Lucas", "NT", 24),
        ("JOH", 43, "João", "NT", 21),
        ("ACT", 44, "Atos", "NT", 28),
        ("ROM", 45, "Romanos", "NT", 16),
        ("1CO", 46, "1 Coríntios", "NT", 16),
        ("2CO", 47, "2 Coríntios", "NT", 13),
        ("GAL", 48, "Gálatas", "NT", 6),
        ("EPH", 49, "Efésios", "NT", 6),
        ("PHP", 50, "Filipenses", "NT", 4),
        ("COL", 51, "Colossenses", "NT", 4),
        ("1TH", 52, "1 Tessalonicenses", "NT", 5),
        ("2TI", 55, "2 Timóteo", "NT", 4),
        ("HEB", 58, "Hebreus", "NT", 13),
        ("JAM", 59, "Tiago", "NT", 5),
        ("1PE", 60, "1 Pedro", "NT", 5),
        ("1JO", 62, "1 João", "NT", 5),
        ("REV", 66, "Apocalipse", "NT", 22),
    ]
    for b_id, b_num, b_name, b_test, b_chaps in books_data:
        if not db.query(Book).filter(Book.id == b_id).first():
            db.add(Book(id=b_id, number=b_num, name=b_name, testament=b_test, chapters_count=b_chaps, language="pt-BR"))

    # 7. Themes
    themes_data = [
        ("paz", "Paz", "paz", "Versículos que acalmam a alma e trazem tranquilidade.", "Peace", "#2A9D8F", 1),
        ("fe", "Fé", "fe", "Mensagens que fortalecem a confiança no Senhor.", "Faith", "#D4AF37", 2),
        ("esperanca", "Esperança", "esperanca", "Palavras de ânimo e renovação para o futuro.", "Hope", "#E76F51", 3),
        ("amor", "Amor", "amor", "O amor incondicional de Deus e ao próximo.", "Heart", "#E63946", 4),
        ("gratidao", "Gratidão", "gratidao", "Agradecendo pelas bênçãos diárias recebidas.", "Sparkles", "#F4A261", 5),
        ("sabedoria", "Sabedoria", "sabedoria", "Direcionamento bíblico para decisões importantes.", "Lightbulb", "#457B9D", 6),
        ("cura", "Cura e Restauração", "cura", "Promessas de alívio físico, emocional e espiritual.", "Shield", "#1D3557", 7),
        ("familia", "Família", "familia", "Bênçãos para o lar, casamento e filhos.", "Home", "#8338EC", 8),
    ]
    for t_id, t_name, t_slug, t_desc, t_icon, t_color, t_order in themes_data:
        if not db.query(Theme).filter(Theme.id == t_id).first():
            db.add(Theme(id=t_id, name=t_name, slug=t_slug, description=t_desc, icon_name=t_icon, color_hex=t_color, sort_order=t_order, app_id="verse_daily"))

    # 8. Emotions
    emotions_data = [
        ("ansioso", "Ansioso", "ansioso", "Para momentos de inquietação e aflição.", "Compass", "#3A86FF", 1),
        ("agradecido", "Agradecido", "agradecido", "Para expressar gratidão e louvor.", "Smile", "#38B000", 2),
        ("com_medo", "Com Medo", "com-medo", "Quando a insegurança tenta dominar o coração.", "ShieldAlert", "#9D0208", 3),
        ("cansado", "Cansado e Sobrecarregado", "cansado", "Descanso espiritual para a alma cansada.", "Moon", "#6A4C93", 4),
        ("feliz", "Feliz e Vitorioso", "feliz", "Celebrando as vitórias do Senhor na sua vida.", "Sun", "#FFB703", 5),
        ("triste", "Triste", "triste", "Consolo e acolhimento nas horas de perda e dor.", "CloudRain", "#4682B4", 6),
        ("em_duvida", "Em Dúvida", "em-duvida", "Buscando direção clara para os próximos passos.", "HelpCircle", "#7209B7", 7),
    ]
    for e_id, e_name, e_slug, e_desc, e_icon, e_color, e_order in emotions_data:
        if not db.query(Emotion).filter(Emotion.id == e_id).first():
            db.add(Emotion(id=e_id, name=e_name, slug=e_slug, description=e_desc, icon_name=e_icon, color_hex=e_color, sort_order=e_order, app_id="verse_daily"))

    db.flush()

    # 9. Rich Verses
    verses_seed = [
        ("PHP", 4, 6, "Filipenses 4:6-7", "Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, e com ação de graças, apresentem seus pedidos a Deus. E a paz de Deus, que excede todo o entendimento, guardará os seus corações e as suas mentes em Cristo Jesus.", ["paz", "fe"], ["ansioso", "em_duvida"]),
        ("PSA", 23, 1, "Salmos 23:1", "O Senhor é o meu pastor; de nada terei falta.", ["paz", "fe", "esperanca"], ["cansado", "com_medo"]),
        ("ISA", 41, 10, "Isaías 41:10", "Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o segurarei com a minha mão direita vitoriosa.", ["fe", "cura"], ["com_medo", "cansado"]),
        ("JER", 29, 11, "Jeremias 29:11", "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.", ["esperanca", "fe"], ["ansioso", "em_duvida"]),
        ("MAT", 11, 28, "Mateus 11:28", "Venham a mim, todos os que estão cansados e sobrecarregados, e eu darei descanso a vocês.", ["paz", "cura"], ["cansado", "triste"]),
        ("JOH", 14, 27, "João 14:27", "Deixo a paz a vocês; a minha paz dou a vocês. Não a dou como o mundo a dá. Não se perturbe o seu coração, nem tenham medo.", ["paz"], ["ansioso", "com_medo"]),
        ("ROM", 8, 28, "Romanos 8:28", "Sabemos que Deus age em todas as coisas para o bem daqueles que o amam, dos que foram chamados de acordo com o seu propósito.", ["fe", "esperanca"], ["triste", "em_duvida"]),
        ("1CO", 13, 13, "1 Coríntios 13:13", "Assim, permanecem agora estes três: a fé, a esperança e o amor. O maior deles, porém, é o amor.", ["amor", "fe", "esperanca"], ["agradecido", "feliz"]),
        ("PSA", 91, 1, "Salmos 91:1-2", "Aquele que habita no abrigo do Altíssimo e descansa à sombra do Todo-poderoso pode dizer ao Senhor: Tu és o meu refúgio e a minha fortaleza, o meu Deus, em quem confio.", ["fe", "paz"], ["com_medo", "ansioso"]),
        ("PRO", 3, 5, "Provérbios 3:5-6", "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento; reconheça o Senhor em todos os seus caminhos, e ele endireitará as suas veredas.", ["sabedoria", "fe"], ["em_duvida", "ansioso"]),
        ("PSA", 46, 1, "Salmos 46:1", "Deus é o nosso refúgio e a nossa fortaleza, auxílio sempre presente na adversidade.", ["fe", "paz"], ["com_medo", "triste"]),
        ("2CO", 12, 9, "2 Coríntios 12:9", "Mas ele me disse: A minha graça é suficiente para você, pois o meu poder se aperfeiçoa na fraqueza.", ["fe", "cura"], ["cansado", "triste"]),
        ("GAL", 5, 22, "Gálatas 5:22-23", "Mas o fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade, mansidão e domínio próprio.", ["amor", "paz", "sabedoria"], ["feliz", "agradecido"]),
        ("PHP", 4, 13, "Filipenses 4:13", "Tudo posso naquele que me fortalece.", ["fe", "esperanca"], ["cansado", "em_duvida"]),
        ("1PE", 5, 7, "1 Pedro 5:7", "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.", ["paz", "fe"], ["ansioso", "cansado"]),
    ]

    created_verses = []
    for b_id, ch, vn, ref, txt, t_ids, e_ids in verses_seed:
        v = db.query(Verse).filter(Verse.reference == ref).first()
        if not v:
            v = Verse(
                book_id=b_id,
                translation="NVI",
                chapter=ch,
                verse_number=vn,
                reference=ref,
                text=txt,
                language="pt-BR",
                status="published",
                app_id="verse_daily"
            )
            db.add(v)
            db.flush()
            for tid in t_ids:
                db.add(VerseTheme(verse_id=v.id, theme_id=tid))
            for eid in e_ids:
                db.add(VerseEmotion(verse_id=v.id, emotion_id=eid))
        created_verses.append(v)
    db.flush()
    print(f"✓ {len(created_verses)} Versículos bíblicos estruturados.")

    # 10. Daily Verses Schedule (Today + next 14 days)
    today = date.today()
    for idx in range(15):
        d_date = today + timedelta(days=idx)
        verse_idx = idx % len(created_verses)
        chosen_verse = created_verses[verse_idx]

        existing_dv = db.query(DailyVerse).filter(DailyVerse.target_date == d_date, DailyVerse.app_id == "verse_daily").first()
        if not existing_dv:
            dv = DailyVerse(
                target_date=d_date,
                verse_id=chosen_verse.id,
                reflection_title="Cuidado Divino e Esperança",
                reflection_text="Que esta palavra traga paz ao seu coração. Lembre-se que Deus está no controle de todas as situações da sua vida.",
                prayer_text="Senhor Deus, entrego este dia em Tuas mãos. Que a Tua paz guarde a minha mente e a minha família. Em nome de Jesus, amém.",
                theme_id="paz",
                status="scheduled" if idx > 0 else "published",
                app_id="verse_daily"
            )
            db.add(dv)
    print("✓ Calendário de Versículo do Dia agendado para os próximos 15 dias.")

    # 11. Devotionals
    devotional = db.query(Devotional).filter(Devotional.id == "paz_interior_7_dias").first()
    if not devotional:
        devotional = Devotional(
            id="paz_interior_7_dias",
            title="7 Dias de Paz Interior",
            slug="7-dias-de-paz-interior",
            description="Um plano devocional transformador para encontrar serenidade e descanso em meio aos desafios do cotidiano.",
            total_days=7,
            is_premium=False,
            language="pt-BR",
            status="published",
            app_id="verse_daily"
        )
        db.add(devotional)
        db.flush()

        dev_days = [
            (1, "Entregando as Preocupações", "Filipenses 4:6-7", "Não andem ansiosos por coisa alguma...", "Hoje o convite de Deus é para respirar fundo e entregar toda ansiedade.", "Pai, coloco minhas preocupações diante de Ti.", "Filipenses 4"),
            (2, "O Bom Pastor", "Salmos 23:1", "O Senhor é o meu pastor; de nada terei falta.", "Quando o Senhor é nosso pastor, temos a certeza do suprimento espiritual.", "Obrigado Senhor por ser meu pastor e guia.", "Salmos 23"),
            (3, "Refúgio Seguro", "Salmos 91:1-2", "Aquele que habita no abrigo do Altíssimo...", "Encontre no Senhor o abrigo secreto onde nenhum mal pode prevalecer.", "Tu és o meu refúgio e a minha fortaleza.", "Salmos 91"),
            (4, "Descanso para a Alma", "Mateus 11:28", "Venham a mim, todos os que estão cansados...", "Jesus não nos oferece um alívio passageiro, mas um descanso eterno.", "Jesus, entro na Tua presença para receber o Teu descanso.", "Mateus 11"),
            (5, "A Paz que Excede o Entendimento", "João 14:27", "Deixo a paz a vocês...", "A paz de Cristo não depende das circunstâncias ao nosso redor.", "Enche meu lar com a Tua paz sobrenatural.", "João 14"),
            (6, "Fortalecidos na Graça", "Isaías 41:10", "Não tema, pois estou com você...", "Deus nos sustenta com Sua mão direita forte e vitoriosa.", "Renova a minha fé e coragem.", "Isaías 41"),
            (7, "Vitória e Gratidão", "Romanos 8:28", "Todas as coisas cooperam para o bem...", "Termine esta semana agradecendo, pois Deus está trabalhando no seu futuro.", "Obrigado por Teu amor infinito. Amém.", "Romanos 8"),
        ]
        for day_num, d_title, d_ref, d_txt, d_reflec, d_pray, d_pass in dev_days:
            db.add(
                DevotionalDay(
                    devotional_id=devotional.id,
                    day_number=day_num,
                    title=d_title,
                    verse_reference=d_ref,
                    verse_text=d_txt,
                    reflection=d_reflec,
                    prayer=d_pray,
                    reading_passage=d_pass
                )
            )
        print("✓ Plano Devocional '7 Dias de Paz Interior' cadastrado.")

    # 12. Monetization Products & Entitlements
    entitlements = [
        Entitlement(id="premium", name="Acesso Premium Total", description="Desbloqueia todos os recursos do aplicativo"),
        Entitlement(id="ad_free", name="Sem Anúncios", description="Remove banners e anúncios intersticiais"),
        Entitlement(id="unlimited_favorites", name="Favoritos Ilimitados", description="Permite salvar versículos ilimitados"),
        Entitlement(id="premium_devotionals", name="Devocionais Exclusivos", description="Acesso a planos de leitura aprofundados"),
    ]
    for ent in entitlements:
        if not db.query(Entitlement).filter(Entitlement.id == ent.id).first():
            db.add(ent)

    products = [
        PremiumProduct(
            id="premium_monthly",
            app_id="verse_daily",
            product_id="subs_premium_monthly",
            base_plan_id="monthly-plan",
            product_type="subs",
            title="Premium Mensal",
            description="Acesso ilimitado, sem anúncios e devocionais exclusivos.",
            reference_price="R$ 14,90/mês",
            status="active",
            entitlements=["premium", "ad_free", "unlimited_favorites", "premium_devotionals"]
        ),
        PremiumProduct(
            id="premium_yearly",
            app_id="verse_daily",
            product_id="subs_premium_yearly",
            base_plan_id="yearly-plan",
            product_type="subs",
            title="Premium Anual (Melhor Oferta)",
            description="Economize mais de 40% com o plano anual completo.",
            reference_price="R$ 99,90/ano",
            status="active",
            entitlements=["premium", "ad_free", "unlimited_favorites", "premium_devotionals"]
        ),
        PremiumProduct(
            id="premium_lifetime",
            app_id="verse_daily",
            product_id="inapp_premium_lifetime",
            product_type="inapp",
            title="Acesso Vitalício",
            description="Pagamento único para acesso permanente a todas as atualizações.",
            reference_price="R$ 199,90",
            status="active",
            entitlements=["premium", "ad_free", "unlimited_favorites", "premium_devotionals"]
        ),
    ]
    for p in products:
        if not db.query(PremiumProduct).filter(PremiumProduct.id == p.id).first():
            db.add(p)

    # 13. Ad Placements
    placements = [
        AdPlacement(app_id="verse_daily", name="home_after_daily_verse", provider="admob", platform="android", format="banner", enabled=True, min_interval_seconds=60, max_per_session=5, free_only=True),
        AdPlacement(app_id="verse_daily", name="explore_between_sections", provider="admob", platform="android", format="native", enabled=True, min_interval_seconds=90, max_per_session=3, free_only=True),
        AdPlacement(app_id="verse_daily", name="verse_bottom", provider="admob", platform="android", format="banner", enabled=True, min_interval_seconds=45, max_per_session=10, free_only=True),
        AdPlacement(app_id="verse_daily", name="devotional_end", provider="admob", platform="android", format="interstitial", enabled=True, min_interval_seconds=180, max_per_session=2, free_only=True),
    ]
    for pl in placements:
        existing_pl = db.query(AdPlacement).filter(AdPlacement.app_id == pl.app_id, AdPlacement.name == pl.name).first()
        if not existing_pl:
            db.add(pl)

    ad_cfg = db.query(AdConfig).filter(AdConfig.app_id == "verse_daily").first()
    if not ad_cfg:
        ad_cfg = AdConfig(
            app_id="verse_daily",
            ads_global_enabled=True,
            admob_app_id_masked="ca-app-pub-3940256099942544~3347511713",
            ump_consent_required=True,
            test_mode=True
        )
        db.add(ad_cfg)
    print("✓ Catálogo de Monetização e Anúncios AdMob populados.")

    # 14. Push Notification Templates
    templates = [
        NotificationTemplate(
            id="daily_verse_morning",
            name="Versículo do Dia Matinal",
            title_template="Versículo do Dia: {{reference}}",
            body_template="{{text}}",
            deep_link="app://verse/daily",
            category="daily"
        ),
        NotificationTemplate(
            id="devotional_reminder",
            name="Lembrete de Devocional",
            title_template="Seu Momento com Deus",
            body_template="Continue sua leitura do plano '{{devotional_title}}' hoje.",
            deep_link="app://devotionals/active",
            category="devotional"
        )
    ]
    for tmpl in templates:
        if not db.query(NotificationTemplate).filter(NotificationTemplate.id == tmpl.id).first():
            db.add(tmpl)

    print("✓ Bootstrap essencial concluído com sucesso.")

def run_demo_seed(db: Session, now: datetime) -> None:
    """
    Executes mock/demonstration data for local development testing (tickets, aggregates, demo campaigns).
    STRICTLY FORBIDDEN IN PRODUCTION.
    """
    print("-> Executando carga de dados demonstrativos (somente desenvolvimento)...")

    # 1. Initial A/B Experiment
    exp = db.query(Experiment).filter(Experiment.id == "paywall_pricing_v1").first()
    if not exp:
        exp = Experiment(
            id="paywall_pricing_v1",
            app_id="verse_daily",
            name="Teste de Preço Paywall (Destaque Anual vs Mensal)",
            description="Testando conversão destacando o plano anual no paywall de abertura.",
            status="running",
            start_date=now,
            target_metric="purchase_completed"
        )
        db.add(exp)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp.id, key="variant_a", name="Destaque Mensal", traffic_percentage=50, config_json={"highlight": "monthly"}, impressions_count=1240, conversions_count=28))
        db.add(ExperimentVariant(experiment_id=exp.id, key="variant_b", name="Destaque Anual (com badge -40%)", traffic_percentage=50, config_json={"highlight": "yearly"}, impressions_count=1280, conversions_count=49))

    # 2. Analytics Daily Aggregates (last 30 days)
    today = date.today()
    for i in range(30, 0, -1):
        d = today - timedelta(days=i)
        existing_agg = db.query(AnalyticsDailyAggregate).filter(AnalyticsDailyAggregate.date == d, AnalyticsDailyAggregate.app_id == "verse_daily").first()
        if not existing_agg:
            dau = 8500 + (30 - i) * 220
            wau = int(dau * 2.5)
            mau = int(dau * 4.2)
            ads_rev_cents = int((dau * 2.8 / 1000.0) * 750)
            subscribers = 320 + (30 - i) * 12
            prem_rev_cents = int((subscribers * 1490) / 30)
            mrr_cents = subscribers * 1490
            arr_cents = mrr_cents * 12

            agg = AnalyticsDailyAggregate(
                date=d,
                app_id="verse_daily",
                platform="android",
                dau=dau,
                wau=wau,
                mau=mau,
                new_users=80 + (30 - i) * 4,
                active_users=dau,
                total_users=12000 + (30 - i) * 90,
                sessions_count=int(dau * 2.4),
                verse_views=dau * 3,
                daily_verse_views=int(dau * 0.85),
                favorites_added=int(dau * 0.12),
                shares_count=int(dau * 0.08),
                searches_count=int(dau * 0.15),
                devotionals_started=int(dau * 0.05),
                devotionals_completed=int(dau * 0.03),
                active_subscribers=subscribers,
                new_subscriptions=3 + (30 - i) % 4,
                canceled_subscriptions=(30 - i) % 2,
                ad_requests=dau * 4,
                ad_impressions=int(dau * 2.8),
                revenue_ads_cents=ads_rev_cents,
                revenue_premium_cents=prem_rev_cents,
                revenue_total_cents=ads_rev_cents + prem_rev_cents,
                mrr_cents=mrr_cents,
                arr_cents=arr_cents
            )
            db.add(agg)

    # 3. Support Tickets Initial Demo Seed
    if db.query(SupportTicket).count() == 0:
        user_sample = db.query(User).filter(User.email != None).first()
        user_id_val = user_sample.id if user_sample else None
        admin_sample = db.query(AdminUser).first()
        admin_id_val = admin_sample.id if admin_sample else None

        sample_tickets_data = [
            {
                "num": "TKT-000001",
                "subject": "Dificuldade para restaurar assinatura anual",
                "desc": "Troquei de aparelho Android e ao clicar em 'Restaurar Compras' na tela de configurações o app não identifica meu plano Premium.",
                "category": "PREMIUM_PAYMENT",
                "priority": "HIGH",
                "status": "WAITING_USER",
                "first_resp": True
            },
            {
                "num": "TKT-000002",
                "subject": "Sugestão: Adicionar versão Almeida Corrigida Fiel (ACF)",
                "desc": "Gostaria muito de ver a tradução ACF disponível para leitura dos devocionais diários.",
                "category": "SUGGESTION",
                "priority": "LOW",
                "status": "OPEN",
                "first_resp": False
            },
            {
                "num": "TKT-000003",
                "subject": "Falha na reprodução de áudio do versículo",
                "desc": "Ao clicar no botão de play para ouvir o áudio do versículo, o som fica mudo ou apresenta ruído intermitente.",
                "category": "TECHNICAL",
                "priority": "URGENT",
                "status": "IN_PROGRESS",
                "first_resp": True
            },
            {
                "num": "TKT-000004",
                "subject": "Notificação do versículo não está tocando no horário agendado",
                "desc": "Configurei o horário para as 07:00 da manhã, mas a notificação chega apenas após abrir o app.",
                "category": "TECHNICAL",
                "priority": "NORMAL",
                "status": "RESOLVED",
                "first_resp": True
            }
        ]

        for item in sample_tickets_data:
            t = SupportTicket(
                ticket_number=item["num"],
                app_id="verse_daily",
                user_id=user_id_val,
                guest_email="contato@usuarioexemplo.com" if not user_id_val else None,
                guest_name="Carlos Eduardo" if not user_id_val else None,
                subject=item["subject"],
                description=item["desc"],
                category=item["category"],
                priority=item["priority"],
                status=item["status"],
                assigned_admin_id=admin_id_val if item["status"] in ["IN_PROGRESS", "WAITING_USER"] else None,
                first_response_at=(now - timedelta(hours=2)) if item["first_resp"] else None,
                resolved_at=(now - timedelta(hours=1)) if item["status"] == "RESOLVED" else None,
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(minutes=30)
            )
            db.add(t)
            db.flush()

            msg1 = TicketMessage(
                ticket_id=t.id,
                sender_type="USER",
                sender_user_id=user_id_val,
                sender_name="Carlos Eduardo",
                message=item["desc"],
                is_internal_note=False,
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5)
            )
            db.add(msg1)

            if item["first_resp"]:
                msg2 = TicketMessage(
                    ticket_id=t.id,
                    sender_type="ADMIN",
                    sender_admin_id=admin_id_val,
                    sender_name="Equipe de Suporte",
                    message="Olá! Já localizamos sua transação na Google Play. Por favor, confirme se você está conectado com a mesma conta Google no dispositivo.",
                    is_internal_note=False,
                    created_at=now - timedelta(hours=2),
                    updated_at=now - timedelta(hours=2)
                )
                db.add(msg2)

                note = TicketMessage(
                    ticket_id=t.id,
                    sender_type="ADMIN",
                    sender_admin_id=admin_id_val,
                    sender_name="Equipe de Suporte",
                    message="Nota interna: Verificado no Google Play Developer Console, compra ativa com token GPA.3341.",
                    is_internal_note=True,
                    created_at=now - timedelta(hours=1, minutes=50),
                    updated_at=now - timedelta(hours=1, minutes=50)
                )
                db.add(note)

            hist = TicketHistory(
                ticket_id=t.id,
                action="created",
                new_value=t.status,
                created_at=now - timedelta(hours=5)
            )
            db.add(hist)

        print("✓ Tickets de suporte de demonstração cadastrados.")

    # 4. Broadcast User Notifications (Central de Notificações)
    if db.query(UserNotification).count() == 0:
        notifs = [
            UserNotification(
                id="notif_welcome_1",
                app_id="verse_daily",
                title="Seja bem-vindo ao Versículo do Dia! 📖",
                message="Que a palavra de Deus renove suas forças e guie os seus passos diariamente.",
                type="system",
                deep_link="daily_verse",
                is_read=False,
                created_at=now - timedelta(hours=3)
            ),
            UserNotification(
                id="notif_devotional_1",
                app_id="verse_daily",
                title="Novo Plano Devocional Disponível 🕊️",
                message="O plano 'Paz em Meio à Tempestade' já está disponível para sua edificação espiritual.",
                type="devotional",
                deep_link="devotional",
                is_read=False,
                created_at=now - timedelta(hours=1)
            ),
            UserNotification(
                id="notif_verse_today",
                app_id="verse_daily",
                title="Versículo de Hoje: Salmos 23:1",
                message="O Senhor é o meu pastor; de nada terei falta. Toque para meditar e orar hoje.",
                type="verse",
                deep_link="daily_verse",
                is_read=False,
                created_at=now - timedelta(minutes=30)
            )
        ]
        for n in notifs:
            db.add(n)
        print("✓ Notificações de demonstração do aplicativo cadastradas.")

def run_seed(
    include_demo_data: Optional[bool] = None,
    db: Optional[Session] = None,
    admin_email: Optional[str] = None,
    admin_password: Optional[str] = None
) -> None:
    """
    Main seed entry point.
    In production:
      - Never runs create_all().
      - Never includes demo data (forced to False).
      - Admin created only if explicit credentials provided via env vars/args.
    In development/testing:
      - Can create tables and optionally include demo data.
    """
    # Safe UTC reference defined upfront - fixes 'now' variable scoping bug
    now = datetime.now(timezone.utc)

    is_prod = is_production or settings.APP_ENV.lower() in ("production", "prod") or os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")

    if is_prod:
        # Strict Production rules:
        include_demo_data = False
        print("[SEED PRODUÇÃO] Iniciando bootstrap controlado para produção...")
    else:
        if not is_prod:
            # Safe table creation for dev convenience
            init_db()
        if include_demo_data is None:
            include_demo_data = True
        print(f"[SEED DEV] Iniciando seed (demo_data={include_demo_data})...")

    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True

    try:
        run_bootstrap(
            db=db,
            now=now,
            is_prod=is_prod,
            admin_email=admin_email,
            admin_password=admin_password
        )

        if include_demo_data and not is_prod:
            run_demo_seed(db=db, now=now)

        db.commit()
        print("✓ Seed concluído com sucesso total!")
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao rodar seed do banco: {e}", exc_info=True)
        print(f"❌ Erro ao rodar seed do banco: {e}")
        raise e
    finally:
        if own_session:
            db.close()

if __name__ == "__main__":
    run_seed()
