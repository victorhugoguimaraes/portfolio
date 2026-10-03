/* ------------------------------------------------------------------------
   Pega o refresh token do Spotify — rode isto UMA vez.

   Uso:  bun run spotify:login

   O que acontece:
     1. Este script abre uma página de autorização do Spotify no navegador.
     2. Você autoriza; o Spotify devolve um código para 127.0.0.1:8888.
     3. O código vira um refresh token, que é gravado em .env.local.
     4. A partir daí, `bun run sincronizar` usa esse token sem pedir nada.

   Antes de rodar, crie um app em https://developer.spotify.com/dashboard e
   adicione EXATAMENTE esta Redirect URI:

       http://127.0.0.1:8888/callback

   ATENÇÃO: precisa ser o IP 127.0.0.1, e não "localhost". Desde fevereiro de
   2025 o Spotify exige HTTPS em todas as Redirect URIs; a única exceção são
   endereços de loopback literais. "localhost" é recusado com a mensagem
   "This redirect URI is not secure".
   https://developer.spotify.com/documentation/web-api/concepts/redirect_uri

   Depois ponha as credenciais em .env.local (ou exporte no terminal):

       SPOTIFY_CLIENT_ID=...
       SPOTIFY_CLIENT_SECRET=...
   ------------------------------------------------------------------------ */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const RAIZ = join(import.meta.dir, '..')
const ENV = join(RAIZ, '.env.local')
const PORTA = 8888
const HOST = '127.0.0.1'
const REDIRECT = `http://${HOST}:${PORTA}/callback`
const ESCOPOS = ['user-read-currently-playing', 'user-read-recently-played'].join(' ')

async function lerEnv(): Promise<Record<string, string>> {
  try {
    const txt = await readFile(ENV, 'utf8')
    const env: Record<string, string> = {}
    for (const linha of txt.split('\n')) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return env
  } catch {
    return {}
  }
}

const env = await lerEnv()
const clientId = process.env.SPOTIFY_CLIENT_ID ?? env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? env.SPOTIFY_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error(`
Faltam credenciais.

1. Crie um app em https://developer.spotify.com/dashboard
   Em "Which API/SDKs are you planning to use?", marque apenas: Web API
2. Em "Redirect URIs", adicione exatamente (com 127.0.0.1, NAO localhost):

     ${REDIRECT}

3. Crie o arquivo .env.local na raiz do projeto com:

     SPOTIFY_CLIENT_ID=seu_id
     SPOTIFY_CLIENT_SECRET=seu_segredo

4. Rode de novo:  bun run spotify:login
`)
  process.exit(1)
}

// Já autorizado? Então não faz sentido refazer o fluxo — e, se alguém abrir a
// URL de autorização sem este script rodando, o navegador mostra
// "não foi possível conectar a 127.0.0.1:8888", porque o servidor temporário
// só existe enquanto o script está vivo. Melhor avisar antes.
const forcar = process.argv.includes('--forcar')

if (env.SPOTIFY_REFRESH_TOKEN && !forcar) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const teste = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  })

  if (teste.ok) {
    console.log(`
Você já está autorizado — o refresh token do .env.local continua válido.

Para atualizar os dados do site, use:

    bun run sincronizar

Para autorizar de novo do zero (trocar de conta, por exemplo):

    bun run spotify:login --forcar
`)
    process.exit(0)
  }

  console.log('O token guardado não vale mais. Vou pedir uma nova autorização.\n')
}

const autorizar =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT,
    scope: ESCOPOS,
  })

let encerrar: (() => void) | undefined
const pronto = new Promise<void>((resolve) => {
  encerrar = resolve
})

const servidor = Bun.serve({
  port: PORTA,
  // Só aceita conexões da própria máquina. O Spotify exige loopback para
  // desenvolvimento, e isso mantém o servidor temporário fechado na rede.
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname !== '/callback') {
      return new Response('Aguardando a autorização do Spotify…', { status: 200 })
    }

    const erro = url.searchParams.get('error')
    const code = url.searchParams.get('code')

    if (erro || !code) {
      encerrar?.()
      return new Response(`Autorização negada: ${erro ?? 'sem código'}`, { status: 400 })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const resposta = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
    })

    if (!resposta.ok) {
      const texto = await resposta.text()
      encerrar?.()
      return new Response(`Falha ao trocar o código por token:\n${texto}`, { status: 500 })
    }

    const dados = (await resposta.json()) as { refresh_token?: string }

    if (!dados.refresh_token) {
      encerrar?.()
      return new Response('O Spotify não devolveu refresh_token. Revogue o acesso do app e tente de novo.', { status: 500 })
    }

    // Preserva o que já existia no arquivo e só troca o refresh token.
    const novo = {
      ...env,
      SPOTIFY_CLIENT_ID: clientId!,
      SPOTIFY_CLIENT_SECRET: clientSecret!,
      SPOTIFY_REFRESH_TOKEN: dados.refresh_token,
    }
    const conteudo =
      '# Gerado por `bun run spotify:login`. Não versione este arquivo.\n' +
      Object.entries(novo)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') +
      '\n'

    await writeFile(ENV, conteudo, 'utf8')

    encerrar?.()
    return new Response(
      `<html lang="pt-BR"><meta charset="utf-8"><body style="font:16px/1.6 monospace;padding:3rem;max-width:40rem">
       <h1 style="font-size:1.1rem">Pronto</h1>
       <p>Refresh token salvo em <code>.env.local</code>.</p>
       <p>Agora rode <code>bun run sincronizar</code> e o bloco "ouvindo" aparece no site.</p>
       <p>Pode fechar esta aba.</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  },
})

console.log(`
Abrindo a autorização do Spotify no seu navegador…

Se não abrir sozinho, cole este endereço:

${autorizar}

Aguardando o retorno em ${REDIRECT} …
`)

if (process.platform === 'win32') {
  Bun.spawn(['cmd', '/c', 'start', '', autorizar], { stdout: 'ignore', stderr: 'ignore' })
} else {
  Bun.spawn(['xdg-open', autorizar], { stdout: 'ignore', stderr: 'ignore' })
}

await pronto
servidor.stop(true)
console.log('\nTudo certo. Rode: bun run sincronizar')
