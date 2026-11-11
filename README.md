# Prancheta

App local e offline para planejar a criação de jogos: visão geral, caderno de design (GDD), mecânicas, personagens e criaturas, mundo e níveis, arte e áudio, técnica, produção (quadro de tarefas e marcos) e caixa de ideias.

Não precisa de internet, conta, servidor nem instalação.

## Como abrir

- **Windows:** dê dois cliques em `Abrir no Windows.bat` (ou abra o `index.html` no navegador).
- **Linux Mint:** dê dois cliques em `Abrir no Linux.sh` e escolha "Executar" (ou, no terminal, rode `./"Abrir no Linux.sh"`; ou abra o `index.html` no navegador). Se não executar: botão direito > Propriedades > Permissões > "Permitir executar como programa".

## Instalar no Android (app pelo navegador)

A Prancheta também funciona como app no celular (PWA). Para instalar, ela precisa estar publicada num endereço **https://** (abrir o arquivo `index.html` direto no celular não permite instalar).

1. No celular, abra o endereço da Prancheta no **Chrome**.
2. Toque no botão **Instalar app** no topo (se aparecer) ou no menu **⋮** do Chrome > **Instalar app** / **Adicionar à tela inicial**.
3. Pronto: o ícone da Prancheta aparece na tela inicial, abre em tela cheia e funciona **sem internet** depois da primeira abertura.

No celular, as seções principais ficam numa barra embaixo da tela (o resto em **Mais**), o botão **+** adiciona jogo, tarefa ou ideia, e o quadro de Produção mostra uma coluna por vez (abas **A fazer / Em andamento / Feito**); as tarefas mudam de coluna pelos botões do cartão.

Quando sair uma versão nova, o app avisa **Nova versão disponível**: toque em **Atualizar**.

**Os dados ficam em cada aparelho/navegador.** O que você escreve no celular não aparece sozinho no PC (nem o contrário). Para levar de um para o outro, use **Dados e backup > Exportar backup (.json)** de um lado e **Importar backup...** do outro.

## Assistente IA

Em cada jogo há a seção **IA** (na barra de baixo do celular; no PC, no menu lateral) e, na tela inicial, o atalho **Assistente IA**.

**Conectar (1 minuto):** na primeira vez abre o assistente **Conectar IA** em 3 passos: escolha o provedor (o **Google Gemini** é o recomendado e grátis), toque em **Abrir Google AI Studio**, crie a chave e toque em **Colar**. O app reconhece o provedor pelo começo da chave (`AIza` Gemini, `gsk_` Groq, `sk-or-` OpenRouter, `sk-` OpenAI, `hf_` Hugging Face), testa sozinho, escolhe o melhor modelo disponível e mostra **Conectado · modelo** no topo. Os erros vêm explicados (chave inválida, sem créditos/402, limite de uso/429 — com nova tentativa automática —, sem internet).

> A assinatura do app Gemini (Google AI Pro) não inclui API; a chave do AI Studio é separada e tem uso grátis, na mesma conta Google.

Também funciona com Groq (grátis), OpenRouter (modelos `:free`), Hugging Face (precisa de créditos), OpenAI (pago), qualquer serviço compatível com a API da OpenAI e o **Ollama** do PC (sem chave; só no computador onde o Ollama roda; aberto pelo site, rode `OLLAMA_ORIGINS=https://rafaelytofc7-spec.github.io ollama serve`). A engrenagem abre a configuração avançada (URL e modelo manuais).

**Conversa e Modo agente:** na conversa ele responde e propõe mudanças. No **Modo agente** você diz um objetivo (ex.: "Planeje a pré-produção do Zona Zero") e ele trabalha em até 8 passos — lê o jogo, resume o progresso, busca, planeja — mostrando a linha do tempo dos passos, e no fim entrega **um lote** de mudanças com caixas de seleção: marque o que quiser e toque em **Aplicar selecionados** (dá para **Desfazer**). Ele cria tarefas, marcos com tarefas, mecânicas, personagens, ideias, texto do GDD, move e edita tarefas (a prioridade vai na primeira linha das notas). O agente **nunca apaga** nada. "Aplicar mudanças automaticamente" vem desligado.

**Privacidade:** a chave fica salva só neste aparelho e navegador. Ela não vai para o backup exportado nem para o GitHub. Ao conversar, a mensagem e os dados do jogo que a IA lê são enviados ao provedor escolhido (no plano grátis do Gemini, o Google pode usar as conversas para melhorar os produtos dele). O assistente precisa de internet (menos o Ollama). As conversas ficam salvas neste aparelho e podem ser apagadas no ícone de lixeira.

## Sincronizar com GitHub e falar com o Grok Bot

Em **Dados e backup → Sincronizar com GitHub…** a Prancheta guarda os jogos no repositório **privado** `rafaelytofc7-spec/prancheta-dados` (arquivo `dados/prancheta.json`, no mesmo formato do backup):

1. Toque em **Criar token no GitHub** (abre https://github.com/settings/personal-access-tokens/new).
2. Nome "Prancheta"; em *Repository access* escolha **Only select repositories → prancheta-dados**; em *Permissions → Repository permissions* dê **Contents: Read and write**.
3. Gere o token (começa com `github_pat_`), cole no app e toque em **Conectar e sincronizar**.

O app baixa as mudanças ao abrir e envia sozinho alguns segundos depois de cada mudança (ou use **Enviar agora / Baixar agora**). A mesclagem é por jogo, pelo `updatedAt`: se o mesmo jogo mudar nos dois lados, fica o mais recente e o app avisa; a outra versão fica guardada no aparelho. O chip no topo mostra o estado. O token fica só no aparelho e não entra no backup.

Com os jogos sincronizados, **Falar com o Grok Bot** (no topo do Assistente IA ou no painel **Mais**) copia um pedido pronto como "Grok, abre a Prancheta (rafaelytofc7-spec/prancheta-dados) e …" para você colar na conversa com o Grok Bot. Ele não roda dentro do app: lê e edita o arquivo no GitHub, e a Prancheta traz as mudanças na próxima abertura (ou em **Baixar agora**).

## Onde ficam os dados

Tudo é salvo automaticamente no próprio navegador (armazenamento local). Os dados ficam presos àquele navegador, naquele sistema (a não ser que você ligue a sincronização com GitHub). O Windows e o Linux do dual-boot **não** compartilham os dados entre si, e Chrome e Firefox também não.

Se limpar os dados de navegação do site ou de arquivos locais, ou mudar a pasta de lugar, os dados podem sumir. Faça backup.

## Backup (exportar / importar)

1. Botão **Dados e backup** no topo > **Exportar backup (.json)**. Baixa um arquivo `prancheta-backup-AAAA-MM-DD_HHhMM.json` na pasta Downloads.
2. Para levar os dados para outro navegador ou para o outro sistema: exporte de um lado e use **Importar backup...** do outro.
3. Importar **substitui** os dados atuais daquele navegador (o app pede confirmação antes).
4. **Restaurar jogos de exemplo** recria Zona Zero, Zona Vermelha e NACRE como vieram, sem mexer nos seus outros jogos (pede confirmação).

## Atalhos

- `/` na tela inicial: buscar jogos.
- Caixa de ideias: Enter guarda a ideia, Shift+Enter quebra a linha.
- Produção: arraste as tarefas entre as colunas ou use as setas do cartão (no celular, use as setas).
