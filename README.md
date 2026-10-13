# NJENGINE

O site é publicado como uma página estática (`index.html`) com a introdução do console, um catálogo horizontal de jogos e uma biblioteca local por navegador. O catálogo mostra **Drifin Slot** (`https://car-pend.vercel.app/`) e **Corrida Lunar** (`https://backrooms-flax.vercel.app/`) na aba **Jogos**. Cada card tem capa própria; a de Corrida Lunar é um frame capturado do carro 3D que existe no jogo, sem geração de arte genérica.

Os jogos não são adicionados automaticamente à biblioteca. Ao escolher **Enviar para biblioteca**, o NJENGINE grava o título no `localStorage` do navegador; depois, **Jogar** abre a URL original dentro do `iframe` do console. O botão flutuante de voltar fecha o jogo e retorna à biblioteca. Para Corrida Lunar, a implementação do jogo e seus controles mobile continuam no repositório separado `jeanvicen/backrooms`; no NJENGINE ficam o card, a capa e o player incorporado.

A biblioteca é local a cada navegador/dispositivo, precisa de armazenamento habilitado e jogar os títulos remotos exige internet. O PWA usa `public/__grok/manifest.webmanifest`, os ícones do NJENGINE e `sw.js`. `scripts/build-static.mjs` inclui a página, capas e recursos necessários ao shell offline.

A sequência de inicialização usa o áudio original `public/sounds/njengine-boot.mp3`, reproduzido somente após o primeiro gesto do usuário. Os tons de navegação e seleção do menu permanecem separados; o áudio de abertura também está incluído no build estático e no cache do PWA.
