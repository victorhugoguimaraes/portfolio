import { describe, expect, test } from 'bun:test'
import {
  CAMPO,
  GOL,
  JOGADORES_POR_TIME,
  estadoInicial,
  norma,
  passo,
  type Estado,
} from './motor'

/** Gerador determinístico: sem ele o teste fica instável. */
function rng(semente = 1) {
  let s = semente >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0x100000000
  }
}

function avancar(e: Estado, n: number, r = rng()): Estado {
  let atual = e
  for (let i = 0; i < n; i++) atual = passo(atual, r)
  return atual
}

describe('formação inicial', () => {
  test('cada time tem o número certo de jogadores', () => {
    const e = estadoInicial()
    expect(e.jogadores.filter((j) => j.time === 0)).toHaveLength(JOGADORES_POR_TIME)
    expect(e.jogadores.filter((j) => j.time === 1)).toHaveLength(JOGADORES_POR_TIME)
  })

  test('o time 0 defende a esquerda e o time 1 a direita', () => {
    // Se este teste falhar, o bug é o espelhamento da formação:
    // o time 0 ataca o gol direito, então precisa COMEÇAR à esquerda.
    const e = estadoInicial()
    const time0 = e.jogadores.filter((j) => j.time === 0)
    const time1 = e.jogadores.filter((j) => j.time === 1)
    expect(Math.max(...time0.map((j) => j.pos.x))).toBeLessThan(0)
    expect(Math.min(...time1.map((j) => j.pos.x))).toBeGreaterThan(0)
  })

  test('todos começam dentro do campo', () => {
    const e = estadoInicial()
    for (const j of e.jogadores) {
      expect(Math.abs(j.pos.x)).toBeLessThanOrEqual(CAMPO.x)
      expect(Math.abs(j.pos.y)).toBeLessThanOrEqual(CAMPO.y)
    }
  })
})

describe('avanço da simulação', () => {
  test('o ciclo incrementa a cada passo', () => {
    const e = avancar(estadoInicial(), 250)
    expect(e.ciclo).toBe(250)
  })

  test('a bola sai do repouso e se move', () => {
    // Mede o deslocamento MÁXIMO ao longo da partida, não o do último
    // ciclo: se um gol cair bem no fim, a bola volta para o centro e o
    // teste falharia por acaso.
    let e = estadoInicial()
    const r = rng(1)
    let maior = 0
    for (let i = 0; i < 400; i++) {
      e = passo(e, r)
      maior = Math.max(maior, Math.hypot(e.bola.x, e.bola.y))
    }
    expect(maior).toBeGreaterThan(1)
  })

  test('a velocidade da bola nunca passa da força máxima do chute', () => {
    let e = estadoInicial()
    const r = rng(7)
    for (let i = 0; i < 6000; i++) {
      e = passo(e, r)
      expect(norma(e.bolaVel)).toBeLessThanOrEqual(3.8)
    }
  })
})

describe('integridade ao longo do tempo', () => {
  test('nada vira NaN e ninguém fica preso fora do campo', () => {
    let e = estadoInicial()
    const r = rng(42)
    for (let i = 0; i < 6000; i++) {
      e = passo(e, r)
      expect(Number.isFinite(e.bola.x)).toBe(true)
      expect(Number.isFinite(e.bola.y)).toBe(true)
      for (const j of e.jogadores) {
        expect(Number.isFinite(j.pos.x)).toBe(true)
        expect(Math.abs(j.pos.x)).toBeLessThanOrEqual(CAMPO.x + 2.001)
        expect(Math.abs(j.pos.y)).toBeLessThanOrEqual(CAMPO.y + 1.001)
      }
    }
  })

  test('a bola nunca fica dentro do gol sem o placar registrar', () => {
    let e = estadoInicial()
    const r = rng(99)
    for (let i = 0; i < 6000; i++) {
      e = passo(e, r)
      const dentroDoGol = Math.abs(e.bola.x) > CAMPO.x && Math.abs(e.bola.y) < GOL
      expect(dentroDoGol).toBe(false)
    }
  })

  test('em uma partida longa sai gol', () => {
    const e = avancar(estadoInicial(), 6000, rng(3))
    expect(e.placar[0] + e.placar[1]).toBeGreaterThan(0)
  })
})
