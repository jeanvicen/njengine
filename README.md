# NJENGINE

Versão estática do NJENGINE: uma única página HTML com abertura cinematográfica, três menus e carrossel horizontal. A interface mantém os cards vazios para jogos futuros e não inclui formulário ou botão para cadastrar jogos.

## Uso

- `index.html` é a página inicial e contém a interface do launcher.
- A aba Jogos mostra 12 baias reservadas. A Biblioteca mostra apenas jogos já disponíveis; sem jogos, mostra seu estado vazio.
- Jogos existentes no armazenamento local (`njengines.bays.v1`) continuam sendo lidos neste navegador. Só links HTTP(S) cadastrados podem ser abertos.
- O PWA usa `public/__grok/manifest.webmanifest`, os ícones NJENGINE em 180/192/512 px e `sw.js` para abrir a página já visitada sem conexão.
- O `scripts/build-static.mjs` publica somente a página, o service worker, o manifesto e os ícones.

Não há jogos de demonstração, cadastro pela interface, destinos inventados ou envio de servidor simulado.
