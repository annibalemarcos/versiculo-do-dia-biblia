# RELATÓRIO NÃO TÉCNICO DE ESTADO DO PRODUTO

**Produto:** Versículo do Dia & Bíblia  
**Data da Avaliação:** 16 de setembro de 2026  
**Público-alvo deste documento:** Gestores de produto, diretores, investidores e membros da equipe não técnica.

---

## 1. O que é o projeto?

O **Versículo do Dia & Bíblia** é um ecossistema digital cristão completo voltado para aproximar as pessoas da leitura e meditação da Bíblia todos os dias.

### O Problema que ele Resolve:
1. **Falta de Constância na Leitura:** A maioria das pessoas deseja manter uma rotina espiritual diária, mas se esquece ou não sabe por onde começar. O app entrega todos os dias um versículo selecionado com reflexão prática e oração contextualizada.
2. **Dependência de Conexão à Internet:** Em momentos de viagem, transporte público ou retiros, os aplicativos comuns deixam de carregar. Nosso app foi desenvolvido para funcionar **100% offline** — o usuário lê, favorita e faz anotações mesmo sem sinal, e tudo sincroniza na nuvem assim que a internet volta.
3. **Busca por Sentimentos e Momentos da Vida:** Quando alguém está ansioso, em luto ou grato, não quer apenas uma lista fria de livros antigos. O aplicativo permite encontrar passagens bíblicas conectadas diretamente ao que a pessoa está sentindo no momento (*paz, ansiedade, medo, esperança, gratidão*).
4. **Falta de Suporte Humanizado:** A maioria dos aplicativos de Bíblia não oferece canal direto com os criadores. Nosso aplicativo inclui uma central de atendimento integrada (Helpdesk), onde o usuário pode tirar dúvidas ou pedir suporte técnico e receber respostas diretamente no app.

---

## 2. O que já foi feito?

O produto não é apenas um protótipo visual; ele é composto por **três produtos integrados que já estão construídos**:

1. **O Aplicativo Móvel (Android):**
   * Tela inicial com o versículo do dia em destaque e belas imagens de fundo.
   * Leitor da Bíblia sagrada dividido por livros e capítulos, com ajuste do tamanho do texto.
   * Devocionais e reflexões temáticas diárias.
   * Busca inteligente por temas e sentimentos humanos.
   * Área de "Meus Favoritos" que guarda os versículos preferidos no celular.
   * Central de suporte com chat direto para acompanhamento de chamados.
   * Sistema de assinaturas Premium (para quem quiser remover anúncios e apoiar o projeto).
   * Sistema inteligente de aviso de manutenção e atualização do app.

2. **O Painel de Controle da Equipe (Painel Web Administrativo):**
   * Gráficos com a quantidade de leitores ativos, cadastros diários e faturamento.
   * Calendário editorial para agendar com antecedência os versículos que aparecerão nos próximos meses.
   * Editor de artigos devocionais e cadastro de novos versículos e temas.
   * Central de atendimento (Helpdesk) onde a equipe lê, responde e resolve as mensagens enviadas pelos usuários.
   * Controle de banners da tela inicial (avisos comunitários, novidades ou campanhas).
   * Painel de gerenciamento de campos de cadastro (permite criar perguntas novas para o cadastro dos usuários sem precisar mexer no código do app).
   * Central de Notificações Push para envio de mensagens na tela de bloqueio dos celulares.

3. **O Sistema Central na Nuvem (Servidor e Banco de Dados):**
   * Guarda de forma segura todos os dados de usuários, versículos, históricos e chamados de suporte.
   * Trilha de segurança imutável (registra quem da equipe alterou qualquer informação).
   * Mecanismo de defesa que impede que usuários sem internet percam seus versículos favoritos.

---

## 3. O que já funciona atualmente?

Tudo o que está listado abaixo pode ser aberto, testado e utilizado agora mesmo:

* ✅ **Leitura Diária e Devocionais:** O usuário consegue abrir o app, ler o versículo do dia, ler devocionais e navegar pelos textos bíblicos.
* ✅ **Favoritos e Histórico Offline:** O usuário pode favoritar qualquer versículo sem internet, fechar o app, reabrir e o conteúdo continuará lá. Quando a internet volta, o servidor recebe os dados automaticamente.
* ✅ **Atendimento e Suporte (Tickets):** Um usuário consegue abrir um chamado pelo celular, recebe um número de protocolo oficial (ex: `TKT-000001`), e a equipe consegue responder pelo painel web.
* ✅ **Governança Remota e Modo Manutenção:** A equipe consegue, em um clique no painel web, colocar o app em manutenção temporária (exibindo uma mensagem amigável no celular dos usuários) ou bloquear temporariamente compras e cadastros para ajustes de sistema.
* ✅ **Monitoramento em Tempo Real com Alerta Sonoro:** Se acontecer alguma instabilidade no servidor (por exemplo, queda de conexão com o banco de dados), o painel web emite um alarme sonoro na tela da equipe e mostra um cartão vermelho de aviso para resolução imediata.

---

## 4. O que ainda não está pronto?

* ⏳ **Processamento Real de Pagamento com a Google Play Store:** O aplicativo já tem as telas de oferta, planos mensais e anuais, e sabe liberar os benefícios do usuário. No entanto, o clique final de compra ainda roda em "modo de teste" para não cobrar dinheiro real dos desenvolvedores durante a criação. É necessário ativar a chave oficial de lojista da Google Play para o app cobrar cartões reais.
* ⏳ **Disparo Real de Notificações Push em Celulares Físicos:** O agendador e o painel de disparo em massa estão prontos, mas para que a mensagem apite fisicamente no bolso do usuário quando o app estiver fechado, é necessário conectar a credencial oficial do Firebase da sua conta Google.

---

## 5. O que está parcialmente pronto?

* 🔄 **Monetização com Anúncios (Google AdMob):** Toda a inteligência para saber onde os anúncios podem aparecer (e onde eles são estritamente proibidos para não desrespeitar momentos sagrados de oração) está implementada. Falta apenas inserir o código identificador de anúncios fornecido pela conta da Google AdMob da sua empresa.

---

## 6. Problemas atuais e impactos no produto

| Situação Atual | Impacto no Produto | Como Resolver |
|---|---|---|
| **Compras em Modo Simulado** | Usuários não conseguem pagar com dinheiro real ainda na Google Play. | Ligar a biblioteca oficial de pagamentos da Play Store antes de publicar a versão final. |
| **Push em Modo Simulado** | Notificações automáticas de versículo da manhã ainda não chegam ao celular desligado. | Inserir a chave de serviço do Firebase no painel de configurações. |

---

## 7. Visão geral do progresso

O produto encontra-se em estágio de **90% de prontidão para lançamento**. 

* Toda a parte complexa de design, navegação, banco de dados, painel administrativo, segurança, atendimento ao cliente e experiência do leitor está **concluída e aprovada**.
* Os 10% restantes correspondem exclusivamente às configurações finais de publicação em loja (ligar a conta Google Play de cobrança e a conta Firebase de disparo de mensagens).

---

## 8. O que precisa acontecer daqui para frente?

1. **Ativação da Conta de Desenvolvedor Google Play:** Obter o acesso da empresa à Google Play Console para cadastrar os produtos de assinatura (*Mensal* e *Anual*).
2. **Conexão dos Pagamentos Oficiais:** Trocar o gerador de testes pelo fluxo real de pagamento da Google Play.
3. **Upload da Chave do Firebase:** Inserir a chave de notificações para ativar o envio real de avisos aos fiéis.
4. **Homologação em Aparelhos Reais:** Instalar o aplicativo em celulares físicos da equipe para testar a experiência prática de leitura no dia a dia.
5. **Lançamento Oficial:** Publicar o aplicativo na Google Play Store para download público.

---

## 9. Dependências e Bloqueios

Não há bloqueios técnicos no código. As únicas pendências dependem de decisões e acessos externos:
* Disponibilização das credenciais da conta Google Play Developer da organização.
* Disponibilização do arquivo de credenciais do Firebase Cloud Messaging.

---

## 10. Resumo Executivo

* **O que temos hoje?**  
  Um aplicativo Android nativo moderno, rápido e bonito, com retaguarda em nuvem e um painel web completo para a equipe gerenciar todo o conteúdo bíblico e os usuários.
* **O que funciona?**  
  Leitura completa da Bíblia, devocionais, favoritos offline, central de suporte com tickets, modo de manutenção remoto e monitoramento de saúde do sistema com alertas sonoros.
* **O que falta?**  
  Conectar o processamento de pagamentos oficial da Google Play Store e a chave de disparo de notificações push no bolso do usuário.
* **Quais são os principais problemas?**  
  Nenhum erro crítico de funcionamento. Apenas a necessidade de substituir os modos de simulação de pagamento e push pelas chaves oficiais de produção.
* **Qual é o próximo trabalho necessário?**  
  Realizar o setup das chaves da Google Play e do Firebase para colocar o aplicativo para download na loja.
