import { useEffect, useMemo, useRef, useState } from 'react'
import {
  filmes,
  maisSimilares,
  projetar2D,
  vetorizarTodos,
  type Filme,
  type Ponto,
  type Vizinho,
} from '../sim/recomendador'

/* ------------------------------------------------------------------------
   O recomendador, desenhado.

   Cada filme é um ponto. A posição vem de uma projeção 2D dos vetores
   TF-IDF de gênero: perto no plano significa parecido. Quando a consulta
   muda, as arestas para os cinco mais próximos se desenham.

   Filmes com o MESMO conjunto de gêneros têm o mesmo vetor, logo o mesmo
   ponto. Em vez de empilhar bolinhas invisíveis, agrupamos: um ponto só,
   com contagem, e o rótulo diz "(+2)".
   ------------------------------------------------------------------------ */

const CONSULTAS = [
  'Pulp Fiction',
  'Spirited Away',
  'Blade Runner',
  'La La Land',
  'The Godfather',
  'Mad Max: Fury Road',
]

const INTERVALO_MS = 6500
const DURACAO_ENTRADA_MS = 700
const MARGEM = 0.13

type Cores = { campo: string; tinta: string; papel: string; bola: string; regra: string; muted: string }

function lerCores(el: HTMLElement): Cores {
  const s = getComputedStyle(el)
  const ler = (n: string, alt: string) => s.getPropertyValue(n).trim() || alt
  return {
    campo: ler('--field', '#2e6b4f'),
    tinta: ler('--ink', '#17181a'),
    papel: ler('--paper', '#f6f5f2'),
    bola: ler('--ball', '#c98a2e'),
    regra: ler('--rule', '#dad9d4'),
    muted: ler('--muted', '#71726e'),
  }
}

/** Filmes que compartilham o mesmo vetor caem no mesmo ponto. */
type Grupo = { chave: string; filmes: Filme[]; pos: Ponto }

export default function Recomendador() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [indice, setIndice] = useState(0)

  const { vetores, grupos, gruposPorFilme } = useMemo(() => {
    const { vetores } = vetorizarTodos(filmes)
    const pontos = projetar2D(filmes, vetores)

    const porChave = new Map<string, Filme[]>()
    for (const f of filmes) {
      const chave = [...f.generos].sort().join('|')
      const atual = porChave.get(chave)
      if (atual) atual.push(f)
      else porChave.set(chave, [f])
    }

    const grupos: Grupo[] = []
    const gruposPorFilme = new Map<number, Grupo>()
    for (const [chave, lista] of porChave) {
      const g: Grupo = { chave, filmes: lista, pos: pontos.get(lista[0].id)! }
      grupos.push(g)
      for (const f of lista) gruposPorFilme.set(f.id, g)
    }

    return { vetores, grupos, gruposPorFilme }
  }, [])

  const consultas = useMemo(
    () =>
      CONSULTAS.map((n) => filmes.find((f) => f.nome.startsWith(n))).filter(
        (f): f is Filme => Boolean(f),
      ),
    [],
  )

  const alvo = consultas[indice % consultas.length]
  const vizinhos = useMemo(() => maisSimilares(alvo, filmes, vetores, 5), [alvo, vetores])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIndice((i) => i + 1), INTERVALO_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cores = lerCores(document.documentElement)
    let vivo = true
    let raf = 0
    let progressoAtual = 1
    const inicio = performance.now()

    let w = 0
    let h = 0

    /* Atribuir canvas.width zera o desenho e reseta o contexto, mesmo com o
       valor igual — e o ResizeObserver dispara logo depois do primeiro quadro.
       Sem esta guarda, o gráfico some. */
    const medir = () => {
      const dpr = window.devicePixelRatio || 1
      const r = canvas.getBoundingClientRect()
      const largura = Math.max(1, Math.round(r.width * dpr))
      const altura = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura
        canvas.height = altura
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      w = r.width
      h = r.height
    }
    medir()

    const xs = grupos.map((g) => g.pos.x)
    const ys = grupos.map((g) => g.pos.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const centroX = (minX + maxX) / 2
    const centroY = (minY + maxY) / 2
    const larg = maxX - minX || 1
    const alt = maxY - minY || 1

    const grupoAlvo = gruposPorFilme.get(alvo.id)!
    const idsVizinhos = new Set(vizinhos.map((v) => v.filme.id))

    const desenhar = (progresso: number) => {
      progressoAtual = progresso
      if (w <= 0 || h <= 0) return

      const fator = Math.min(w / larg, h / alt) * (1 - MARGEM * 2)
      const pos = (p: Ponto) => ({
        x: w / 2 + (p.x - centroX) * fator,
        y: h / 2 - (p.y - centroY) * fator,
      })

      ctx.clearRect(0, 0, w, h)
      ctx.font = '11px "Commit Mono", ui-monospace, monospace'
      ctx.textBaseline = 'middle'

      const pAlvo = pos(grupoAlvo.pos)

      // Arestas até os cinco mais próximos.
      for (const v of vizinhos) {
        const g = gruposPorFilme.get(v.filme.id)!
        const p = pos(g.pos)
        if (p.x === pAlvo.x && p.y === pAlvo.y) continue
        ctx.beginPath()
        ctx.moveTo(pAlvo.x, pAlvo.y)
        ctx.lineTo(pAlvo.x + (p.x - pAlvo.x) * progresso, pAlvo.y + (p.y - pAlvo.y) * progresso)
        ctx.strokeStyle = cores.campo
        ctx.globalAlpha = (0.3 + v.similaridade * 0.5) * progresso
        ctx.lineWidth = 0.7 + v.similaridade * 2.2
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Pontos comuns.
      for (const g of grupos) {
        if (g === grupoAlvo || [...idsVizinhos].some((id) => gruposPorFilme.get(id) === g)) continue
        const p = pos(g.pos)
        ctx.beginPath()
        ctx.arc(p.x, p.y, g.filmes.length > 1 ? 3.4 : 2.8, 0, Math.PI * 2)
        ctx.fillStyle = cores.regra
        ctx.fill()
      }

      // Vizinhos.
      for (const v of vizinhos) {
        const g = gruposPorFilme.get(v.filme.id)!
        const p = pos(g.pos)
        const r = (4.2 + v.similaridade * 2.6) * progresso
        if (r <= 0) continue
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = cores.campo
        ctx.globalAlpha = progresso
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // A consulta: o único ponto quente.
      ctx.beginPath()
      ctx.arc(pAlvo.x, pAlvo.y, 6.4, 0, Math.PI * 2)
      ctx.fillStyle = cores.bola
      ctx.fill()
      ctx.beginPath()
      ctx.arc(pAlvo.x, pAlvo.y, 11, 0, Math.PI * 2)
      ctx.strokeStyle = cores.bola
      ctx.globalAlpha = 0.45 * progresso
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.globalAlpha = 1

      // ---- rótulos ----------------------------------------------------
      // Escrever o nome dos cinco vizinhos no gráfico virava uma pilha
      // ilegível. Em vez disso, cada vizinho recebe o NÚMERO que ele ocupa na
      // lista ao lado: uma casa decimal de tinta não colide com nada, e a
      // correspondência com a lista é imediata.
      const comHalo = (txt: string, x: number, y: number, cor: string, alinhamento: CanvasTextAlign) => {
        ctx.textAlign = alinhamento
        ctx.lineJoin = 'round'
        ctx.lineWidth = 3.5
        ctx.strokeStyle = cores.papel
        ctx.globalAlpha = progresso
        ctx.strokeText(txt, x, y)
        ctx.fillStyle = cor
        ctx.fillText(txt, x, y)
        ctx.globalAlpha = 1
      }

      // Vários vizinhos podem cair no MESMO ponto (gêneros idênticos). Se cada
      // um escrevesse no mesmo lugar, só o último apareceria — foi o que
      // escondeu os números 2 e 3. Aqui eles são empilhados lado a lado.
      const porPonto = new Map<Grupo, number[]>()
      vizinhos.forEach((v, i) => {
        const g = gruposPorFilme.get(v.filme.id)!
        if (g === grupoAlvo) return
        const lista = porPonto.get(g)
        if (lista) lista.push(i)
        else porPonto.set(g, [i])
      })

      for (const [g, indices] of porPonto) {
        const p = pos(g.pos)
        const paraEsquerda = p.x > w / 2
        const px = p.x + (paraEsquerda ? -13 : 13)
        indices.forEach((indice, k) => {
          const py = p.y + (k - (indices.length - 1) / 2) * 13
          comHalo(String(indice + 1), px, py, cores.campo, paraEsquerda ? 'right' : 'left')
        })
      }

      // O nome do filme escolhido, esse sim por extenso.
      const extraAlvo = grupoAlvo.filmes.length > 1 ? ` +${grupoAlvo.filmes.length - 1}` : ''
      const acima = pAlvo.y > h * 0.22
      comHalo(
        `${alvo.nome}${extraAlvo}`,
        pAlvo.x,
        acima ? pAlvo.y - 19 : pAlvo.y + 19,
        cores.tinta,
        'center',
      )
    }

    // Desenha o estado final de saída, antes de qualquer coisa assíncrona.
    desenhar(1)

    const obsTam = new ResizeObserver(() => {
      medir()
      desenhar(progressoAtual)
    })
    obsTam.observe(canvas)

    const obsTema = new MutationObserver(() => {
      cores = lerCores(document.documentElement)
      desenhar(progressoAtual)
    })
    obsTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const limpar = () => {
      vivo = false
      cancelAnimationFrame(raf)
      obsTam.disconnect()
      obsTema.disconnect()
    }

    if (semMovimento) return limpar

    const quadro = (agora: number) => {
      if (!vivo) return
      const progresso = Math.min(1, (agora - inicio) / DURACAO_ENTRADA_MS)
      desenhar(1 - Math.pow(1 - progresso, 3))
      if (progresso < 1) raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)

    return limpar
  }, [alvo, vizinhos, grupos, gruposPorFilme])

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] sm:items-center sm:gap-9">
      <figure className="m-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Plano com ${grupos.length} posições de filmes. O filme ${alvo.nome} está destacado e ligado aos cinco mais parecidos: ${vizinhos.map((v) => v.filme.nome).join(', ')}.`}
          className="block h-full w-full"
          style={{ aspectRatio: '1 / 1' }}
        />
        <figcaption className="mt-2 text-[12px] leading-relaxed text-muted">
          Cada ponto é um filme; a posição vem dos gêneros, então perto significa parecido.
          O ponto <span className="text-ball">laranja</span> é o filme escolhido, as linhas vão
          para os cinco mais próximos e cada número é a linha correspondente na lista ao lado.
          Quando dois filmes têm os mesmos gêneros, dividem o mesmo ponto — o <span className="font-display">+1</span> avisa
          quantos mais estão ali.
        </figcaption>
      </figure>

      <div>
        <p className="font-display text-[12px] leading-none text-muted">você escolheu</p>
        <p className="font-display mt-2 text-[17px] leading-tight">
          {alvo.nome} <span className="text-muted">({alvo.ano})</span>
        </p>
        <p className="font-display mt-1 text-[12px] leading-none text-muted">
          {alvo.generos.join(', ')}
        </p>

        <p className="font-display mt-6 text-[12px] leading-none text-muted">o modelo responde</p>
        <ul className="mt-2">
          {vizinhos.map((v: Vizinho, i) => (
            <li
              key={v.filme.id}
              className="grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-[3px]"
            >
              <span className="font-display text-[12px] text-muted">{i + 1}</span>
              <span className="truncate leading-snug">
                {v.filme.nome}
                <span className="text-muted"> ({v.filme.ano})</span>
              </span>
              <span className="font-display text-[12px] tabular-nums text-field">
                {v.similaridade.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Similaridade de cosseno entre vetores TF-IDF de gênero, com o peso ×4 do projeto
          original. {filmes.length} filmes, {grupos.length} posições — os que compartilham todos
          os gêneros caem no mesmo ponto.
        </p>
      </div>
    </div>
  )
}
