# Arquitetura de Sincronização Offline-First (`SyncManager.kt`)

## 1. Princípios do Offline-First

1. **Leitura Instantânea:** Todo conteúdo acessado pelo usuário (versículo do dia, favoritos, temas, histórico) é servido primeiramente pelo banco local **Room SQLite**.
2. **Gravação Não-Bloqueante:** Ações de favoritar ou registrar histórico gravam imediatamente no Room e enfileiram na tabela `sync_queue` se o dispositivo estiver offline.
3. **Resolução de Conflitos (Merge Union):** Ao sincronizar favoritos com o backend, os itens do servidor e locais são combinados em união, preservando dados do usuário e enviando os pendentes.

## 2. Fila de Sincronização Pendente (`sync_queue`)

- **Tabela:** `sync_queue` (`id`, `action_type`, `payload_json`, `created_at`, `retry_count`)
- **Ações Tratadas:**
  - `ADD_FAVORITE`: Adiciona o versículo aos favoritos no servidor.
  - `REMOVE_FAVORITE`: Remove o versículo dos favoritos no servidor.
- **Processamento:** Executado no boot do app, em pull-to-refresh ou ao restabelecer conectividade.
