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

No celular, as seções do jogo ficam numa barra embaixo da tela, e as tarefas do quadro mudam de coluna pelos botões de seta do cartão.

**Os dados ficam em cada aparelho/navegador.** O que você escreve no celular não aparece sozinho no PC (nem o contrário). Para levar de um para o outro, use **Dados e backup > Exportar backup (.json)** de um lado e **Importar backup...** do outro.

## Onde ficam os dados

Tudo é salvo automaticamente no próprio navegador (armazenamento local). Os dados ficam presos àquele navegador, naquele sistema. O Windows e o Linux do dual-boot **não** compartilham os dados entre si, e Chrome e Firefox também não.

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
