import { useEffect, useRef, useState } from 'react'
import {
  AREA,
  CAMPO,
  CIRCULO,
  CICLO_MS,
  GOL,
  estadoInicial,
  passo,
  type Estado,
} from '../sim/motor'

/* ------------------------------------------------------------------------
   Desenha o campo. Toda a física vive em ../sim/motor.ts, que é testado
   por ../sim/motor.test.ts — aqui só há apresentação.
   ------------------------------------------------------------------------ */

type Paleta = {
  campo: string
  tinta: string
  papel: string
  bola: string
}

function lerPaleta(el: HTMLElement): Paleta {
  const s = getComputedStyle(el)
  const ler = (n: string, alt: string) => s.getPropertyValue(n).trim() || alt
  return {
    campo: ler('--field', '#2e6b4f'),
    tinta: ler('--ink', '#17181a'),
    papel: ler('--paper', '#f6f5f2'),
    bola: ler('--ball', '#c98a2e'),
  }
}

function desenhar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  anterior: Estado,
  atual: Estado,
  t: number,
  p: Paleta,
) {
  const escala = Math.min(w / (CAMPO.x * 2 + 8), h / (CAMPO.y * 2 + 6))
  const cx = w / 2
  const cy = h / 2
  const px = (v: number) => cx + v * escala
  const py = (v: number) => cy + v * escala
  const misturar = (a: number, b: number) => a + (b - a) * t

  ctx.clearRect(0, 0, w, h)

  // ---------- gramado ----------
  ctx.fillStyle = p.campo
  ctx.globalAlpha = 0.13
  ctx.fillRect(px(-CAMPO.x), py(-CAMPO.y), CAMPO.x * 2 * escala, CAMPO.y * 2 * escala)
  ctx.globalAlpha = 1

  // ---------- linhas ----------
  ctx.strokeStyle = p.campo
  ctx.globalAlpha = 0.6
  ctx.lineWidth = Math.max(1, escala * 0.22)
  ctx.beginPath()
  ctx.rect(px(-CAMPO.x), py(-CAMPO.y), CAMPO.x * 2 * escala, CAMPO.y * 2 * escala)
  ctx.moveTo(px(0), py(-CAMPO.y))
  ctx.lineTo(px(0), py(CAMPO.y))
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px(0), py(0), CIRCULO * escala, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  for (const lado of [-1, 1]) {
    ctx.rect(
      px(lado === -1 ? -CAMPO.x : CAMPO.x - AREA.x),
      py(-AREA.y),
      AREA.x * escala,
      AREA.y * 2 * escala,
    )
    ctx.rect(px(lado * CAMPO.x), py(-GOL), lado * escala * 1.6, GOL * 2 * escala)
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  // ---------- jogadores ----------
  const r = Math.max(3, escala * 1.15)
  for (let i = 0; i < atual.jogadores.length; i++) {
    const a = anterior.jogadores[i]
    const b = atual.jogadores[i]
    if (!a || !b) continue

    const x = px(misturar(a.pos.x, b.pos.x))
    const y = py(misturar(a.pos.y, b.pos.y))
    const pescoco = misturar(a.pescoco, b.pescoco)

    // Corpo: o time 0 em tinta, o time 1 no verde do campo. A distinção
    // entre os dois precisa sobreviver a um raio de poucos pixels.
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = b.time === 0 ? p.tinta : p.campo
    ctx.fill()

    // Pescoço: para onde o jogador está olhando. É a marca característica
    // da RoboCup 2D — corpo e pescoço giram independentes.
    const nx = x + Math.cos(pescoco) * r * 0.72
    const ny = y + Math.sin(pescoco) * r * 0.72
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nx, ny)
    ctx.strokeStyle = p.papel
    ctx.lineWidth = Math.max(1, r * 0.34)
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(nx, ny, Math.max(1, r * 0.26), 0, Math.PI * 2)
    ctx.fillStyle = p.papel
    ctx.fill()
  }

  // ---------- rastro da bola ----------
  ctx.beginPath()
  ctx.moveTo(px(anterior.bola.x), py(anterior.bola.y))
  ctx.lineTo(px(atual.bola.x), py(atual.bola.y))
  ctx.strokeStyle = p.bola
  ctx.globalAlpha = 0.45
  ctx.lineWidth = Math.max(1.5, escala * 0.5)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1

  // ---------- bola ----------
  ctx.beginPath()
  ctx.arc(
    px(misturar(anterior.bola.x, atual.bola.x)),
    py(misturar(anterior.bola.y, atual.bola.y)),
    Math.max(2, escala * 0.55),
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = p.bola
  ctx.fill()
}

export default function Sim() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [leitura, setLeitura] = useState({
    ciclo: 0,
    velocidade: 0,
    placar: [0, 0] as [number, number],
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let anterior = estadoInicial()
    let atual = anterior
    let ultimoPasso = performance.now()
    let ultimaLeitura = -1000 // força o readout já no primeiro quadro
    let raf = 0
    let vivo = true
    let paleta = lerPaleta(document.documentElement)

    const medir = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const largura = Math.max(1, Math.round(rect.width * dpr))
      const altura = Math.max(1, Math.round(rect.height * dpr))
      // Atribuir canvas.width zera o desenho e reseta o contexto, mesmo com o
      // valor igual. Sem esta guarda, cada disparo do ResizeObserver apagaria
      // o quadro — aqui o loop contínuo esconde o problema, mas o desperdício
      // de recomputar tudo é real.
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura
        canvas.height = altura
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      return { w: rect.width, h: rect.height }
    }

    let { w, h } = medir()

    const observador = new ResizeObserver(() => {
      const m = medir()
      w = m.w
      h = m.h
    })
    observador.observe(canvas)

    // O tema pode mudar a qualquer momento: relê os tokens quando isso acontece.
    const observadorTema = new MutationObserver(() => {
      paleta = lerPaleta(document.documentElement)
    })
    observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const contar = (e: Estado) => ({
      ciclo: e.ciclo,
      velocidade: Math.hypot(e.bolaVel.x, e.bolaVel.y),
      placar: e.placar,
    })

    if (semMovimento) {
      // Sem animação: um único quadro congelado, já com a partida em
      // andamento. O readout precisa refletir esse estado — senão fica
      // mostrando "ciclo 0" para quem pediu menos movimento.
      for (let i = 0; i < 240; i++) {
        anterior = atual
        atual = passo(atual)
      }
      desenhar(ctx, w, h, atual, atual, 0, paleta)
      setLeitura(contar(atual))
      return () => {
        observador.disconnect()
        observadorTema.disconnect()
      }
    }

    const quadro = (agora: number) => {
      if (!vivo) return

      // Passos fixos de 100 ms — exatamente como o servidor faz.
      while (agora - ultimoPasso >= CICLO_MS) {
        anterior = atual
        atual = passo(atual)
        ultimoPasso += CICLO_MS
        // Aba em segundo plano: não tenta recuperar o tempo perdido.
        if (agora - ultimoPasso > 1000) ultimoPasso = agora
      }

      const t = Math.min(1, Math.max(0, (agora - ultimoPasso) / CICLO_MS))
      desenhar(ctx, w, h, anterior, atual, t, paleta)

      if (agora - ultimaLeitura > 250) {
        ultimaLeitura = agora
        setLeitura(contar(atual))
      }

      raf = requestAnimationFrame(quadro)
    }

    raf = requestAnimationFrame(quadro)

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      observador.disconnect()
      observadorTema.disconnect()
    }
  }, [])

  return (
    <figure className="m-0">
      {/* Sem `h-full`: num item de grade esticado (o padrão no celular), o
          canvas ocuparia a caixa toda do figure e a legenda transbordaria
          para fora, ficando por baixo do bloco seguinte. */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Simulação de uma partida de futebol 2D: dez círculos se movem perseguindo uma bola."
        className="block w-full"
        style={{ aspectRatio: '105 / 68' }}
      />
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted tabular-nums">
        <span>ciclo {leitura.ciclo.toLocaleString('pt-BR')}</span>
        <span>bola {leitura.velocidade.toFixed(2)} m/ciclo</span>
        <span>
          victor {leitura.placar[0]}–{leitura.placar[1]} adversário
        </span>
      </figcaption>
    </figure>
  )
}
