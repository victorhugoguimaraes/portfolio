import { describe, expect, test } from 'bun:test'
import {
  PESO_GENERO,
  cosseno,
  filmes,
  maisSimilares,
  projetar2D,
  vetorizar,
  vetorizarTodos,
} from './recomendador'

const { vetores } = vetorizarTodos(filmes)
const porNome = (n: string) => filmes.find((f) => f.nome.startsWith(n))!

describe('vetorização', () => {
  test('todo filme tem vetor', () => {
    expect(vetores.size).toBe(filmes.length)
  })

  test('os vetores estão normalizados em L2', () => {
    for (const v of vetores.values()) {
      let soma = 0
      for (const x of v.values()) soma += x * x
      expect(Math.sqrt(soma)).toBeCloseTo(1, 6)
    }
  })

  test('o peso do gênero é o mesmo do projeto original', () => {
    expect(PESO_GENERO).toBe(4)
  })

  test('gênero raro pesa mais que gênero comum', () => {
    const { vocab } = vetorizarTodos(filmes)
    // Western aparece em 3 filmes, Drama em 27: o IDF tem que refletir isso.
    expect(vocab.idf.get('Western')!).toBeGreaterThan(vocab.idf.get('Drama')!)
  })
})

describe('similaridade de cosseno', () => {
  test('um filme é idêntico a si mesmo', () => {
    for (const f of filmes) {
      expect(cosseno(vetores.get(f.id)!, vetores.get(f.id)!)).toBeCloseTo(1, 6)
    }
  })

  test('é simétrica', () => {
    const a = vetores.get(porNome('Pulp Fiction').id)!
    const b = vetores.get(porNome('GoodFellas').id)!
    expect(cosseno(a, b)).toBeCloseTo(cosseno(b, a), 10)
  })

  test('fica entre 0 e 1 (os valores do TF-IDF são positivos)', () => {
    const lista = [...vetores.values()]
    for (let i = 0; i < 40; i++) {
      const s = cosseno(lista[i % lista.length], lista[(i * 7 + 3) % lista.length])
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1.0000001)
    }
  })
})

describe('recomendações', () => {
  test('nunca recomenda o próprio filme', () => {
    for (const f of filmes) {
      const v = maisSimilares(f, filmes, vetores, 5)
      expect(v.every((x) => x.filme.id !== f.id)).toBe(true)
    }
  })

  test('vem ordenado da maior para a menor similaridade', () => {
    for (const f of filmes.slice(0, 20)) {
      const v = maisSimilares(f, filmes, vetores, 5)
      for (let i = 1; i < v.length; i++) {
        expect(v[i - 1].similaridade).toBeGreaterThanOrEqual(v[i].similaridade)
      }
    }
  })

  test('o que é parecido de verdade fica junto', () => {
    // Ghibli com Ghibli
    const ghibli = maisSimilares(porNome('Spirited Away'), filmes, vetores, 3)
    const nomes = ghibli.map((v) => v.filme.nome)
    expect(nomes.some((n) => n.includes('Totoro') || n.includes('Kiki') || n.includes('Ponyo'))).toBe(true)

    // Ficção científica com ficção científica
    const scifi = maisSimilares(porNome('Blade Runner'), filmes, vetores, 5)
    const temScifi = scifi.some((v) => v.filme.generos.includes('Science Fiction'))
    expect(temScifi).toBe(true)

    // Faroeste com faroeste
    const faroeste = maisSimilares(porNome('The Good, the Bad'), filmes, vetores, 3)
    expect(faroeste.every((v) => v.filme.generos.includes('Western'))).toBe(true)
  })

  test('filmes sem nenhum gênero em comum não entram na lista', () => {
    const v = maisSimilares(porNome('The Good, the Bad'), filmes, vetores, 10)
    expect(v.every((x) => x.similaridade > 0)).toBe(true)
  })
})

describe('projeção em 2D', () => {
  const pontos = projetar2D(filmes, vetores)

  test('todo filme ganha uma coordenada finita', () => {
    expect(pontos.size).toBe(filmes.length)
    for (const p of pontos.values()) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  test('a nuvem está centrada na origem', () => {
    const xs = [...pontos.values()].map((p) => p.x)
    const ys = [...pontos.values()].map((p) => p.y)
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(0, 6)
    expect(ys.reduce((a, b) => a + b, 0) / ys.length).toBeCloseTo(0, 6)
  })

  test('a nuvem tem espalhamento — não colapsou num ponto', () => {
    const xs = [...pontos.values()].map((p) => p.x)
    const ys = [...pontos.values()].map((p) => p.y)
    const amplitude = (v: number[]) => Math.max(...v) - Math.min(...v)
    expect(amplitude(xs)).toBeGreaterThan(0.1)
    expect(amplitude(ys)).toBeGreaterThan(0.1)
  })

  test('perto no plano significa parecido no cosseno', () => {
    // O escalonamento multidimensional só é útil se preservar a estrutura:
    // distância no plano deve acompanhar a similaridade.
    const ids = filmes.map((f) => f.id)
    const plano: number[] = []
    const coss: number[] = []
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pontos.get(ids[i])!
        const b = pontos.get(ids[j])!
        plano.push(Math.hypot(a.x - b.x, a.y - b.y))
        coss.push(cosseno(vetores.get(ids[i])!, vetores.get(ids[j])!))
      }
    }
    // Correlação de Pearson entre distância e (1 - similaridade).
    const n = plano.length
    const mDist = plano.reduce((a, b) => a + b, 0) / n
    const mSim = coss.reduce((a, b) => a + b, 0) / n
    let cov = 0
    let vd = 0
    let vs = 0
    for (let i = 0; i < n; i++) {
      const dd = plano[i] - mDist
      const ss = coss[i] - mSim
      cov += dd * ss
      vd += dd * dd
      vs += ss * ss
    }
    const correlacao = cov / Math.sqrt(vd * vs)
    // Distância e similaridade devem andar em sentidos opostos.
    expect(correlacao).toBeLessThan(-0.5)
  })
})

describe('integridade dos dados', () => {
  test('todo filme tem nome, ano, nota e ao menos um gênero', () => {
    for (const f of filmes) {
      expect(f.nome.length).toBeGreaterThan(0)
      expect(f.ano).toBeGreaterThan(1900)
      expect(f.nota).toBeGreaterThan(0)
      expect(f.generos.length).toBeGreaterThan(0)
    }
  })

  test('não há id repetido', () => {
    expect(new Set(filmes.map((f) => f.id)).size).toBe(filmes.length)
  })

  test('"Science Fiction" está reunido num gênero só', () => {
    // O pipeline original quebrava por espaço e criava "Science" e "Fiction"
    // como tokens separados; a coleta de dados já corrigiu isso.
    for (const f of filmes) {
      expect(f.generos).not.toContain('Science')
      expect(f.generos).not.toContain('Fiction')
    }
  })

  test('vetorizar aceita um filme isolado', () => {
    const { vocab } = vetorizarTodos(filmes)
    const v = vetorizar(filmes[0], vocab)
    expect(v.size).toBe(filmes[0].generos.length)
  })
})
