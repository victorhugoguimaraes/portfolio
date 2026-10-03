import { useState } from 'react'
import type { DadosSpotify, Faixa } from '../data/tipos'

/* ------------------------------------------------------------------------
   O que está tocando no Spotify.

   A lista crua não dizia nada. Agora cada faixa vem com a capa do álbum, o
   que dá peso visual e deixa a seção parecida com a prateleira de filmes
   logo acima. Tudo linka para o Spotify.
   ------------------------------------------------------------------------ */

function Capa({ faixa, classe }: { faixa: Faixa; classe: string }) {
  const [falhou, setFalhou] = useState(false)
  const base = `${classe} shrink-0 border border-rule bg-rule/25 object-cover`
  const capas = (faixa.capas ?? []).filter((c) => c && c.url)
  if (!capas.length || falhou) return <span aria-hidden="true" className={base} />

  const maior = capas[capas.length - 1]
  // Se nenhum álbum vier com largura declarada, o srcset seria inválido
  // ("0w"); nesse caso usa só o src.
  const medidas = capas.filter((c) => c.w > 0)
  return (
    <img
      src={maior.url}
      // O Spotify oferece 64 px (3,7 KB) e 300 px (54 KB). Com srcset o
      // navegador baixa a pequena em tela comum e a grande só no retina.
      srcSet={medidas.length > 1 ? medidas.map((c) => `${c.url} ${c.w}w`).join(', ') : undefined}
      sizes={medidas.length > 1 ? '44px' : undefined}
      alt=""
      // Sem lazy: a seção fica abaixo da dobra e as capas apareciam vazias.
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFalhou(true)}
      className={base}
    />
  )
}

function Item({ faixa, destaque = false }: { faixa: Faixa; destaque?: boolean }) {
  return (
    <a
      href={faixa.link}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 no-underline"
    >
      <Capa faixa={faixa} classe="h-11 w-11" />
      <span className="min-w-0">
        <span className="block truncate leading-snug">{faixa.faixa}</span>
        <span className="block truncate text-[13px] text-muted">{faixa.artistas}</span>
        {destaque && (
          <span className="font-display mt-1 flex items-center gap-1.5 text-[11px] leading-none text-ball">
            <span aria-hidden="true" className="h-[5px] w-[5px] bg-ball" />
            tocando agora
          </span>
        )}
      </span>
    </a>
  )
}

export default function Ouvindo({ dados }: { dados: DadosSpotify }) {
  const temAlgo = Boolean(dados.tocandoAgora) || (dados.recentes?.length ?? 0) > 0
  if (!temAlgo) return null

  return (
    <>
      <p className="font-display mb-3 mt-8 text-[12px] leading-none text-muted">ouvindo</p>

      {dados.tocandoAgora && (
        <div className="mb-4 border-l-2 border-ball pl-3">
          <Item faixa={dados.tocandoAgora} destaque />
        </div>
      )}

      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {dados.recentes.slice(0, 6).map((f) => (
          <li key={f.link}>
            <Item faixa={f} />
          </li>
        ))}
      </ul>

      {dados.perfil?.url && (
        <p className="mt-4 text-[12px] text-muted">
          Direto do meu{' '}
          <a href={dados.perfil.url} target="_blank" rel="noreferrer noopener">
            Spotify
          </a>
          , sincronizado por um script.
        </p>
      )}
    </>
  )
}
