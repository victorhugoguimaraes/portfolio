/* ------------------------------------------------------------------------
   Sincroniza os dados "ao vivo" do site.

   Letterboxd: usa o RSS público, não precisa de senha nem chave de API.
   Spotify:    precisa de credenciais OAuth (veja o LEIA-ME no fim do arquivo).

   Uso:  bun run sincronizar
   ------------------------------------------------------------------------ */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const RAIZ = join(import.meta.dir, '..')
const USUARIO_LETTERBOXD = 'vguima10'
const QUANTOS_FILMES = 10

type Filme = {
  titulo: string
  ano: number | null
  nota: number | null
  assistido: string
  capa: string | null
  link: string
}

function textoDe(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  if (!m) return ''
  return m[1]
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .trim()
}

function numeral(v: string): number | null {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

async function sincronizarLetterboxd() {
  const url = `https://letterboxd.com/${USUARIO_LETTERBOXD}/rss/`
  console.log(`Letterboxd: buscando ${url}`)

  const resposta = await fetch(url, {
    headers: { 'User-Agent': 'portfolio-victorhugo/1.0' },
  })
  if (!resposta.ok) throw new Error(`Letterboxd respondeu ${resposta.status}`)

  const xml = await resposta.text()
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1])
  console.log(`  ${itens.length} itens no feed`)

  const filmes: Filme[] = []
  for (const item of itens) {
    const titulo = textoDe(item, 'letterboxd:filmTitle')
    if (!titulo) continue

    // A capa vem dentro do HTML da descrição.
    const descricao = textoDe(item, 'description')
    const capa = descricao.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null

    filmes.push({
      titulo,
      ano: numeral(textoDe(item, 'letterboxd:filmYear')),
      nota: numeral(textoDe(item, 'letterboxd:memberRating')),
      assistido: textoDe(item, 'letterboxd:watchedDate'),
      capa,
      link: textoDe(item, 'link'),
    })
    if (filmes.length >= QUANTOS_FILMES) break
  }

  await writeFile(
    join(RAIZ, 'src/data/letterboxd.json'),
    JSON.stringify({ usuario: USUARIO_LETTERBOXD, atualizado: new Date().toISOString(), filmes }, null, 1),
    'utf8',
  )
  console.log(`  [ok] ${filmes.length} filmes gravados em src/data/letterboxd.json`)
}

/* ------------------------------------------------------------------------
   Spotify

   A API do Spotify exige OAuth: não existe endpoint público de "tocando
   agora". Para ligar isto você precisa de um app no Spotify for Developers
   (gratuito) e rodar UMA vez o login para obter um refresh token.

   1. https://developer.spotify.com/dashboard  ->  Create app
      Em "Which API/SDKs are you planning to use?", marque apenas: Web API
   2. Em Redirect URIs, adicione exatamente (com 127.0.0.1, NAO localhost):
      http://127.0.0.1:8888/callback
   3. Copie o Client ID e o Client Secret para um arquivo .env.local:

        SPOTIFY_CLIENT_ID=...
        SPOTIFY_CLIENT_SECRET=...
        SPOTIFY_REFRESH_TOKEN=...

   4. Para obter o refresh token, rode:  bun run scripts/spotify-login.ts

   Enquanto o .env.local não existir, esta parte é ignorada sem quebrar nada.
   ------------------------------------------------------------------------ */
async function sincronizarSpotify() {
  const id = process.env.SPOTIFY_CLIENT_ID
  const segredo = process.env.SPOTIFY_CLIENT_SECRET
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN

  if (!id || !segredo || !refresh) {
    console.log('Spotify: credenciais ausentes — pulando (veja o cabeçalho do script)')
    return
  }

  const auth = Buffer.from(`${id}:${segredo}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!r.ok) throw new Error(`Spotify token: ${r.status} ${await r.text()}`)
  const { access_token } = (await r.json()) as { access_token: string }

  const buscar = async (caminho: string) => {
    const res = await fetch(`https://api.spotify.com/v1/me/player/${caminho}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    // "currently-playing" responde 204 SEM CORPO quando nada está tocando.
    // Chamar .json() nisso estoura "Unexpected end of JSON input" — foi o que
    // derrubou a sincronização no GitHub Actions enquanto aqui funcionava.
    if (!res.ok || res.status === 204) return null
    const corpo = await res.text()
    if (!corpo.trim()) return null
    try {
      return JSON.parse(corpo)
    } catch {
      throw new Error(`Spotify devolveu algo que não é JSON em /${caminho}: ${corpo.slice(0, 120)}`)
    }
  }

  const agora = (await buscar('currently-playing')) as {
    is_playing?: boolean
    item?: { name: string; artists: { name: string }[]; album: { images: { url: string }[] }; external_urls: { spotify: string } }
  } | null

  // Pede 20 e não 6: depois de tirar as repetidas ainda sobram faixas
  // suficientes para preencher a seção.
  const recentesBrutos = (await buscar('recently-played?limit=20')) as {
    items?: {
      track: { name: string; artists: { name: string }[]; album: { images: { url: string }[] }; external_urls: { spotify: string } }
    }[]
  } | null

  // Endpoint separado: não é /me/player/..., então não passa pelo `buscar`.
  const eu = (await (
    await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
  ).json()) as { external_urls?: { spotify?: string } }

  // A capa vem em 640, 300 e 64 px (198 KB, 54 KB e 3,7 KB). Guardamos as duas
  // menores e montamos um srcset: o navegador baixa 3,7 KB em tela comum e
  // 54 KB em tela retina, em vez de 198 KB sempre. Se algum álbum vier só com
  // um tamanho, usamos o que houver — melhor uma capa grande que nenhuma.
  const TAMANHOS = [64, 300]
  const capas = (imagens: { url: string; width?: number }[] | undefined) => {
    const todas = (imagens ?? []).filter((i) => i.url)
    const preferidas = todas.filter((i) => TAMANHOS.includes(i.width ?? 0))
    return (preferidas.length ? preferidas : todas)
      .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
      .map((i) => ({ url: i.url, w: i.width ?? 0 }))
  }

  const enxugar = (t: {
    name: string
    artists: { name: string }[]
    album: { images: { url: string; width?: number }[] }
    external_urls: { spotify: string }
  }) => ({
    faixa: t.name,
    artistas: t.artists.map((a) => a.name).join(', '),
    capas: capas(t.album.images),
    link: t.external_urls.spotify,
  })

  const tocandoAgora = agora?.is_playing && agora.item ? enxugar(agora.item) : null

  // O Spotify devolve a MESMA faixa mais de uma vez quando ela toca repetida:
  // numa consulta vi 50 itens com apenas 49 faixas distintas. E a que está
  // tocando agora também aparece na lista. Sem filtrar, a seção mostrava o
  // mesmo disco duas vezes e o React recebia chaves repetidas.
  const vistos = new Set<string>()
  const recentes: ReturnType<typeof enxugar>[] = []
  for (const item of recentesBrutos?.items ?? []) {
    const f = enxugar(item.track)
    if (!f.link || f.link === tocandoAgora?.link || vistos.has(f.link)) continue
    vistos.add(f.link)
    recentes.push(f)
    if (recentes.length >= 8) break
  }

  const dados = {
    atualizado: new Date().toISOString(),
    perfil: { url: eu.external_urls?.spotify ?? null },
    tocandoAgora,
    recentes,
  }

  await writeFile(join(RAIZ, 'src/data/spotify.json'), JSON.stringify(dados, null, 1), 'utf8')
  console.log(`  [ok] Spotify: ${dados.tocandoAgora ? 'tocando agora' : 'nada tocando'} + ${dados.recentes.length} recentes`)
}

// Uma fonte pode falhar sem derrubar a outra: se o Spotify cair, o Letterboxd
// ainda é gravado. Mas o processo termina com erro se ALGUMA falhar, para o
// workflow ficar vermelho em vez de passar em silêncio — foi assim que uma
// falha do Spotify passou despercebida por uma execução inteira.
let falhou = false

try {
  await sincronizarLetterboxd()
} catch (e) {
  console.error('ERRO Letterboxd:', e instanceof Error ? e.message : e)
  falhou = true
}

try {
  await sincronizarSpotify()
} catch (e) {
  console.error('ERRO Spotify:', e instanceof Error ? e.message : e)
  falhou = true
}

if (falhou) process.exit(1)
