import { useState } from 'react'
import type { DadosSpotify, Faixa } from '../data/tipos'

/* ------------------------------------------------------------------------
   O que está tocando no Spotify.

   Mesma anatomia dos outros dois blocos de "consumindo": capa, título e uma
   linha de crédito — nada de lista horizontal, que era o que destoava dos
   filmes e dos livros.
   ------------------------------------------------------------------------ */

function Capa({ faixa, classe }: { faixa: Faixa; classe: string }) {
  const [falhou, setFalhou] = useState(false)
  const base = `${classe} border border-rule bg-rule/25 object-cover`
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
      sizes={medidas.length > 1 ? '140px' : undefined}
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

export default function Ouvindo({ dados }: { dados: DadosSpotify }) {
  const temAlgo = Boolean(dados.tocandoAgora) || (dados.recentes?.length ?? 0) > 0
  if (!temAlgo) return null

  const agora = dados.tocandoAgora

  return (
    <>
      <p className="font-display mb-3 mt-8 text-[12px] leading-none text-muted">ouvindo</p>

      {/* Tocando agora: uma faixa, destacada, no mesmo formato dos outros. */}
      {agora && (
        <a
          href={agora.link}
          target="_blank"
          rel="noreferrer noopener"
          className="mb-4 flex max-w-[68ch] items-center gap-3 border-l-2 border-ball pl-3 no-underline"
        >
          <Capa faixa={agora} classe="h-12 w-12 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate leading-snug">{agora.faixa}</span>
            <span className="block truncate text-[13px] text-muted">{agora.artistas}</span>
            <span className="font-display mt-1 flex items-center gap-1.5 text-[11px] leading-none text-ball">
              <span aria-hidden="true" className="h-[5px] w-[5px] bg-ball" />
              tocando agora
            </span>
          </span>
        </a>
      )}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
        {dados.recentes.slice(0, 6).map((f) => (
          <li key={f.link}>
            <a
              href={f.link}
              target="_blank"
              rel="noreferrer noopener"
              className="block no-underline"
            >
              <Capa faixa={f} classe="aspect-square w-full" />
              <p className="mt-1.5 line-clamp-2 min-h-[1.9rem] text-[12px] leading-tight">
                {f.faixa}
              </p>
              <p className="line-clamp-1 text-[11px] leading-tight text-muted">{f.artistas}</p>
            </a>
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
