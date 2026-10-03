/* ------------------------------------------------------------------------
   Motor da simulação 2D — lógica pura, sem DOM.

   Fica separado do componente de propósito: assim dá para testar
   (`bun test`) sem precisar de navegador. O canvas só desenha o
   resultado.

   Os números são os padrões do rcssserver, não estimativas:
   campo 105 × 68, gol 14,02 de largura, a bola perde 6% da velocidade
   por ciclo e o jogador perde 60%. Um ciclo dura 100 ms.
   ------------------------------------------------------------------------ */

export const CAMPO = { x: 52.5, y: 34 }
export const GOL = 7.01
export const CIRCULO = 9.15
export const AREA = { x: 16.5, y: 20.16 }

export const DECAIMENTO_BOLA = 0.94
export const DECAIMENTO_JOGADOR = 0.4
export const VEL_MAX = 1.05
export const ACEL = 1.0
export const RAIO_CHUTE = 1.3
export const CICLO_MS = 100
export const JOGADORES_POR_TIME = 5

export type V = { x: number; y: number }

export type Jogador = {
  time: 0 | 1
  pos: V
  vel: V
  casa: V
  corpo: number
  pescoco: number
}

export type Estado = {
  jogadores: Jogador[]
  bola: V
  bolaVel: V
  ciclo: number
  placar: [number, number]
  espera: number
}

export const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
export const norma = (v: V) => Math.hypot(v.x, v.y)

export function formacao(): Jogador[] {
  const jogadores: Jogador[] = []
  // Formação 1-2-2 espelhada entre os times. Os atacantes ficam logo
  // atrás da linha central: cada time começa no seu próprio campo.
  const linhas = [
    { x: -0.44, y: [0] },
    { x: -0.22, y: [-0.4, 0.4] },
    { x: -0.04, y: [-0.44, 0.44] },
  ]

  for (const time of [0, 1] as const) {
    // O time 0 ataca o gol direito (+x), então começa à esquerda.
    // Inverter isto coloca o zagueiro no ataque.
    const lado = time === 0 ? 1 : -1
    let n = 0
    for (const linha of linhas) {
      for (const fy of linha.y) {
        if (n >= JOGADORES_POR_TIME) break
        const casa = {
          x: limitar(linha.x * CAMPO.x * 2 * lado, -CAMPO.x * 0.8, CAMPO.x * 0.8),
          y: fy * CAMPO.y * 0.85 + (time === 0 ? -1 : 1) * 1.5,
        }
        jogadores.push({
          time,
          pos: { ...casa },
          vel: { x: 0, y: 0 },
          casa,
          corpo: time === 0 ? 0 : Math.PI,
          pescoco: time === 0 ? 0 : Math.PI,
        })
        n++
      }
    }
    while (n < JOGADORES_POR_TIME) {
      const casa = { x: lado * (10 + n * 6), y: (n % 2 ? 1 : -1) * (8 + n * 2) }
      jogadores.push({
        time,
        pos: { ...casa },
        vel: { x: 0, y: 0 },
        casa,
        corpo: time === 0 ? 0 : Math.PI,
        pescoco: time === 0 ? 0 : Math.PI,
      })
      n++
    }
  }
  return jogadores
}

export function estadoInicial(): Estado {
  return {
    jogadores: formacao(),
    bola: { x: 0, y: 0 },
    bolaVel: { x: 0, y: 0 },
    ciclo: 0,
    placar: [0, 0],
    espera: 12,
  }
}

/** Avança exatamente um ciclo do servidor (100 ms). Função pura. */
export function passo(e: Estado, aleatorio: () => number = Math.random): Estado {
  const jogadores = e.jogadores.map((j) => ({
    ...j,
    pos: { ...j.pos },
    vel: { ...j.vel },
  }))

  // ---- jogadores ------------------------------------------------------
  const maisProximo = [0, 1].map((time) => {
    let melhor = -1
    let dist = Infinity
    jogadores.forEach((j, i) => {
      if (j.time !== time || e.espera > 0) return
      const d = Math.hypot(j.pos.x - e.bola.x, j.pos.y - e.bola.y)
      if (d < dist) {
        dist = d
        melhor = i
      }
    })
    return melhor
  })

  const chutes: V[] = []

  jogadores.forEach((j, i) => {
    let alvo: V
    if (e.espera > 0) {
      alvo = j.casa
    } else if (maisProximo[j.time] === i) {
      alvo = { x: e.bola.x, y: e.bola.y }
    } else {
      alvo = { x: j.casa.x + e.bola.x * 0.25, y: j.casa.y + e.bola.y * 0.3 }
    }

    const dx = alvo.x - j.pos.x
    const dy = alvo.y - j.pos.y
    const d = Math.hypot(dx, dy)

    if (d > 0.15) {
      const escala = ACEL / d
      j.vel.x += dx * escala
      j.vel.y += dy * escala
    }

    const vel = norma(j.vel)
    if (vel > VEL_MAX) {
      j.vel.x = (j.vel.x / vel) * VEL_MAX
      j.vel.y = (j.vel.y / vel) * VEL_MAX
    }
    j.vel.x *= DECAIMENTO_JOGADOR
    j.vel.y *= DECAIMENTO_JOGADOR

    j.pos.x += j.vel.x
    j.pos.y += j.vel.y
    j.pos.x = limitar(j.pos.x, -CAMPO.x - 2, CAMPO.x + 2)
    j.pos.y = limitar(j.pos.y, -CAMPO.y - 1, CAMPO.y + 1)

    if (norma(j.vel) > 0.02) j.corpo = Math.atan2(j.vel.y, j.vel.x)
    j.pescoco = Math.atan2(e.bola.y - j.pos.y, e.bola.x - j.pos.x)

    // Chute: só o caçador do time, e só se a bola estiver lenta.
    if (e.espera === 0 && maisProximo[j.time] === i) {
      const dist = Math.hypot(j.pos.x - e.bola.x, j.pos.y - e.bola.y)
      if (dist < RAIO_CHUTE && norma(e.bolaVel) < 1.6) {
        const golX = j.time === 0 ? CAMPO.x : -CAMPO.x
        const ang = Math.atan2(0 - e.bola.y, golX - e.bola.x)
        const ruido = (aleatorio() - 0.5) * 0.55
        const forca = 2.6 + aleatorio() * 1.1
        chutes.push({ x: Math.cos(ang + ruido) * forca, y: Math.sin(ang + ruido) * forca })
      }
    }
  })

  // ---- bola -----------------------------------------------------------
  const bola = { ...e.bola }
  const bolaVel = {
    x: e.bolaVel.x * DECAIMENTO_BOLA,
    y: e.bolaVel.y * DECAIMENTO_BOLA,
  }
  for (const c of chutes) {
    bolaVel.x = c.x
    bolaVel.y = c.y
  }
  bola.x += bolaVel.x
  bola.y += bolaVel.y

  let placar = e.placar
  let espera = 0
  let gol = false

  if (Math.abs(bola.y) < GOL && Math.abs(bola.x) > CAMPO.x) {
    const quem = bola.x > 0 ? 0 : 1
    placar = quem === 0 ? [placar[0] + 1, placar[1]] : [placar[0], placar[1] + 1]
    espera = 26
    bola.x = 0
    bola.y = 0
    bolaVel.x = 0
    bolaVel.y = 0
    gol = true
  } else {
    if (Math.abs(bola.y) > CAMPO.y) {
      bola.y = Math.sign(bola.y) * CAMPO.y
      bolaVel.y *= -0.75
    }
    if (Math.abs(bola.x) > CAMPO.x && Math.abs(bola.y) >= GOL) {
      bola.x = Math.sign(bola.x) * CAMPO.x
      bolaVel.x *= -0.75
    }
  }

  if (!gol) espera = Math.max(0, e.espera - 1)

  return { jogadores, bola, bolaVel, ciclo: e.ciclo + 1, placar, espera }
}
