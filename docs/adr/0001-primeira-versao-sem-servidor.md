# A primeira versão não tem servidor

A primeira versão (modo solo) é só arquivos estáticos num Cloudflare Worker com Static Assets, mais uma PWA que funciona sem internet. O computador e as regras rodam no celular. O Durable Object por sala só entra com o multiplayer. Assim a primeira versão sai mais cedo, custa zero e não depende de rede.

Para o multiplayer funcionar depois sem reescrever nada, as regras ficam num módulo TypeScript puro, sem tela e sem rede. O modo solo usa esse módulo hoje; a sala do multiplayer vai usar o mesmo módulo dentro do Durable Object.

Ver [Escolher a tecnologia](https://github.com/tharso/trunfo/issues/10) e [Tecnologia na Cloudflare](https://github.com/tharso/trunfo/issues/6).
