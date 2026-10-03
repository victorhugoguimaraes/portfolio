import { useState, type ReactNode } from 'react'
import Ouvindo from './components/Ouvindo'
import Recomendador from './components/Recomendador'
import Sim from './components/Sim'
import ThemeToggle from './components/ThemeToggle'
import {
  agora,
  cursos,
  dadosAbertura,
  leituras,
  outrosProjetos,
  perfil,
  projetoDados,
  projetoFutebol,
  robocup,
  sobre,
  type Projeto,
} from './data/content'
import type { DadosLetterboxd, DadosSpotify } from './data/tipos'
import letterboxdBruto from './data/letterboxd.json'
import spotifyBruto from './data/spotify.json'

// Os JSON vêm de `bun run sincronizar`. Sem o cast, um arquivo ainda vazio
// faz o TypeScript inferir `never` para os campos.
const letterboxd = letterboxdBruto as DadosLetterboxd
const spotify = spotifyBruto as DadosSpotify

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="fio mt-12 pt-6">
      <h2 className="font-display mb-5 text-[15px] leading-none">{titulo}</h2>
      {children}
    </section>
  )
}

/** Uma ficha de projeto: período na coluna da esquerda, conteúdo na direita. */
function FichaProjeto({ p }: { p: Projeto }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
      <span className="font-display text-[12px] leading-6 text-muted">{p.periodo}</span>
      <div className="max-w-[64ch]">
        <h3 className="font-display text-[15px] leading-6">
          <a href={p.link} target="_blank" rel="noreferrer noopener">
            {p.nome}
          </a>
        </h3>
        <p className="mt-1 text-pretty">{p.resumo}</p>
        <p className="font-display mt-2 text-[12px] leading-none text-muted">{p.tags.join(', ')}</p>
        {p.demo && (
          <p className="mt-2 text-[13px]">
            <a href={p.demo} target="_blank" rel="noreferrer noopener">
              ver funcionando
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

/** Nota do Letterboxd: 4.5 vira "★ 4,5". */
function Estrela({ nota }: { nota: number | null }) {
  if (nota === null) return null
  return (
    <span className="text-ball tabular-nums" title={`Nota ${nota} de 5`}>
      ★ {nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </span>
  )
}

/** Capa do filme. Se o Letterboxd bloquear o link direto, some sem quebrar o layout. */
function Capa({ filme }: { filme: { titulo: string; ano: number | null; capa: string | null } }) {
  const [falhou, setFalhou] = useState(false)
  if (!filme.capa || falhou) {
    return <div aria-hidden="true" className="aspect-[2/3] w-full border border-rule bg-rule/25" />
  }
  return (
    <img
      src={filme.capa}
      alt={`Cartaz de ${filme.titulo}${filme.ano ? ` (${filme.ano})` : ''}`}
      // Sem lazy: os cartazes ficam abaixo da dobra e apareciam como caixas
      // vazias até alguém rolar até eles. São 6 imagens de ~35 KB.
      // Sem referrer: evita bloqueio por hotlink no CDN do Letterboxd.
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFalhou(true)}
      className="aspect-[2/3] w-full border border-rule bg-rule/25 object-cover"
    />
  )
}

export default function App() {
  const filmes = letterboxd.filmes ?? []

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-12 sm:px-8 sm:py-16">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-[20px] leading-none">{perfil.nome}</h1>
          <p className="font-display mt-2 text-[12px] leading-none text-muted">{perfil.resumo}</p>
        </div>
        <ThemeToggle />
      </header>

      <main>
        {/* ---------------- sobre ---------------- */}
        <Secao titulo="sobre">
          <div className="max-w-[68ch] space-y-4 text-pretty">
            {sobre.map((paragrafo) => (
              <p key={paragrafo.slice(0, 24)}>{paragrafo}</p>
            ))}
          </div>
        </Secao>

        {/* ---------------- formação ---------------- */}
        <Secao titulo="formação">
          <p>Engenharia de Redes de Comunicação</p>
          <p className="text-[13px] text-muted">Universidade de Brasília, em andamento</p>

          <p className="font-display mb-3 mt-7 text-[12px] leading-none text-muted">
            cursos e certificações
          </p>
          <ul className="max-w-[68ch] space-y-1.5">
            {cursos.map((c) => (
              <li key={c.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
                <span>{c.nome}</span>
                <span className="font-display text-[12px] text-muted">{c.emissor}</span>
              </li>
            ))}
          </ul>
        </Secao>

        {/* ---------------- contato ---------------- */}
        <Secao titulo="contato">
          <ul className="font-display space-y-2 text-[15px] leading-none">
            <li>
              <a href={`mailto:${perfil.email}`}>{perfil.email}</a>
            </li>
            <li>
              <a href={perfil.github} target="_blank" rel="noreferrer noopener">
                github.com/{perfil.githubUsuario}
              </a>
            </li>
            <li>
              <a href={perfil.linkedin} target="_blank" rel="noreferrer noopener">
                linkedin
              </a>
            </li>
            <li>
              <a href={perfil.curriculo} download="VictorHugoGuimaraesNascimento-Curriculo.pdf">
                baixar currículo (PDF)
              </a>
            </li>
          </ul>
        </Secao>

        {/* ---------------- agora ---------------- */}
        <Secao titulo="agora">
          <ul className="space-y-1">
            {agora.map((linha) => (
              <li key={linha} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.62em] h-[5px] w-[5px] shrink-0 bg-field" />
                <span className="max-w-[64ch]">{linha}</span>
              </li>
            ))}
          </ul>
        </Secao>

        {/* ---------------- projeto de dados ---------------- */}
        <Secao titulo="o projeto de dados">
          <div className="max-w-[64ch]">
            <p className="font-display text-[26px] leading-[1.12] tracking-tight sm:text-[38px]">
              {dadosAbertura.titulo.map((linha) => (
                <span key={linha} className="block">
                  {linha}
                </span>
              ))}
            </p>
            <p className="mt-6 text-pretty">{dadosAbertura.texto}</p>
          </div>
          <div className="mt-10">
            <Recomendador />
          </div>
          <div className="fio mt-10 pt-6">
            <FichaProjeto p={projetoDados} />
          </div>
        </Secao>

        {/* ---------------- futebol simulado ---------------- */}
        <Secao titulo="o futebol simulado">
          <div className="grid gap-8 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:items-start sm:gap-10">
            <Sim />
            <div className="max-w-[46ch] space-y-3 text-pretty">
              {robocup.texto.map((paragrafo) => (
                <p key={paragrafo.slice(0, 24)}>{paragrafo}</p>
              ))}
            </div>
          </div>
          <div className="fio mt-10 pt-6">
            <FichaProjeto p={projetoFutebol} />
          </div>
        </Secao>

        {/* ---------------- outros projetos ---------------- */}
        <Secao titulo="outros projetos">
          <ul className="divide-y divide-rule">
            {outrosProjetos.map((p) => (
              <li key={p.nome} className="py-5">
                <FichaProjeto p={p} />
              </li>
            ))}
          </ul>
        </Secao>

        {/* ---------------- consumindo ---------------- */}
        <Secao titulo="consumindo">
          {/* Empilhado em vez de duas colunas: as colunas laterais tinham
              alturas muito diferentes e sobrava um branco grande embaixo. */}
          <p className="font-display mb-3 text-[12px] leading-none text-muted">lendo</p>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            {leituras.map((l) => (
              <li key={l.titulo}>
                <p className="leading-snug">{l.titulo}</p>
                <p className="mt-0.5 text-[13px] text-muted">{l.autor}</p>
                <p className="font-display mt-1.5 text-[11px] leading-none text-muted">
                  {l.situacao}, {l.assunto}
                </p>
              </li>
            ))}
          </ul>

          <p className="font-display mb-3 mt-8 text-[12px] leading-none text-muted">assistindo</p>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6 sm:gap-x-4">
            {filmes.slice(0, 6).map((f) => (
              <li key={f.link}>
                <a
                  href={f.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block no-underline"
                >
                  <Capa filme={f} />
                  {/* Altura mínima igual em todos: sem isso os títulos de
                      duas e três linhas desalinham as fileiras da grade. */}
                  <p className="mt-1.5 line-clamp-3 min-h-[2.7rem] text-[11px] leading-tight">
                    {f.titulo}
                  </p>
                  <p className="font-display text-[10px] leading-tight text-muted">
                    {f.ano} <Estrela nota={f.nota} />
                  </p>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-muted">
            Direto do meu{' '}
            <a
              href={`https://letterboxd.com/${letterboxd.usuario}/`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Letterboxd
            </a>
            , sincronizado por um script.
          </p>

          <Ouvindo dados={spotify} />
        </Secao>
      </main>

      <footer className="fio font-display mt-16 flex items-baseline justify-between gap-4 pb-4 pt-6 text-[12px] leading-none text-muted">
        <span>{perfil.nome}</span>
        <span>2026</span>
      </footer>
    </div>
  )
}
