# NJENGINE

O site é publicado como uma página estática (`index.html`) com a introdução do console, um catálogo horizontal de jogos e uma biblioteca local por navegador. O catálogo mostra **Drifin Slot** na aba **Jogos** e abre **Corrida Lunar** localmente em `/games/corrida-lunar/`, dentro do próprio console. A capa existente de Corrida Lunar é preservada.

Os jogos não são adicionados automaticamente à biblioteca. Ao escolher **Enviar para biblioteca**, o NJENGINE grava o título no `localStorage` do navegador; depois, **Jogar** abre a URL original dentro do `iframe` do console. O botão flutuante de voltar fecha o jogo e retorna à biblioteca. Para Corrida Lunar, a implementação do jogo e seus controles mobile continuam no repositório separado `jeanvicen/backrooms`; no NJENGINE ficam o card, a capa e o player incorporado.

A biblioteca é local a cada navegador/dispositivo e precisa de armazenamento habilitado. A Corrida Lunar é compilada a partir de `games/corrida-lunar/` e servida dentro do NJENGINE; o código-base é atribuído a [InnovatingTech/new-racer](https://github.com/InnovatingTech/new-racer), via fork [jeanvicen/new-racer](https://github.com/jeanvicen/new-racer). O PWA usa `public/__grok/manifest.webmanifest`, os ícones do NJENGINE e `sw.js`; o cache mantém o endereço do jogo separado da página principal.

A sequência de inicialização usa o áudio original `public/sounds/njengine-boot.mp3`, reproduzido somente após o primeiro gesto do usuário. Os tons de navegação e seleção do menu permanecem separados; o áudio de abertura também está incluído no build estático e no cache do PWA.
