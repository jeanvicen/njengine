# NJENGINE

Versão estática do NJENGINE: uma única página HTML com abertura cinematográfica, três menus e carrossel horizontal. Não depende do app React anterior, de APIs ou de banco de dados.

## Uso

- `index.html` é a página inicial e contém a interface e a lógica do launcher.
- As 12 baias ficam vazias até Jean cadastrar jogos. A ficha permite salvar título, descrição, gênero, plataforma, ano, capa, trailer e um link HTTP(S) de Play.
- Os dados continuam no armazenamento local deste navegador (`njengines.bays.v1`); não são enviados a um servidor nem sincronizados entre aparelhos.
- O PWA usa `public/__grok/manifest.webmanifest`, os ícones NJENGINE em 180/192/512 px e `sw.js` para abrir a página já visitada sem conexão.
- O `scripts/build-static.mjs` publica somente a página, o service worker, o manifesto e os ícones.

Nenhum jogo demonstrativo, destino inventado ou envio de servidor simulado vem incluído.
