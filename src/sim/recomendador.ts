/* ------------------------------------------------------------------------
   Recomendador — lógica pura, sem DOM.

   É uma versão reduzida do recomendador de filmes do Letterboxd, que rodava
   em Python com TF-IDF + similaridade de cosseno sobre ~72.500 filmes.
   Aqui os dados são 58 filmes e o texto do documento são só os GÊNEROS.

   O modelo completo usava gênero × 4, tema × 2 e diretor × 1, e depois
   combinava 70% de similaridade com 30% de um score de qualidade. Como o
   banco publicado não guarda temas nem diretores, esta versão usa apenas os
   gêneros — e por isso o peso × 4 vira uma escala uniforme, que some na
   normalização. O que sobra é TF-IDF padrão sobre gêneros.

   A física da partida 2D está em ./motor.ts, com a mesma separação.
   ------------------------------------------------------------------------ */

import dados from '../data/filmes.json'

export type Filme = {
  id: number
  nome: string
  ano: number
  nota: number
  generos: string[]
}

export type Vetor = Map<string, number>

export const filmes: Filme[] = dados.filmes

/** Peso que o projeto original dava ao gênero no texto do TF-IDF. */
export const PESO_GENERO = 4

export type Vocabulario = {
  idf: Map<string, number>
  n: number
}

/** IDF de cada gênero: log(N / em quantos filmes ele aparece). */
export function calcularIdf(lista: Filme[]): Vocabulario {
  const df = new Map<string, number>()
  for (const f of lista) {
    for (const g of new Set(f.generos)) df.set(g, (df.get(g) ?? 0) + 1)
  }
  const n = lista.length
  const idf = new Map<string, number>()
  for (const [g, contagem] of df) {
    // O +1 no numerador evita IDF zero para gênero presente em todos.
    idf.set(g, Math.log((n + 1) / (contagem + 1)) + 1)
  }
  return { idf, n }
}

/** Vetor TF-IDF do filme, normalizado em L2. */
export function vetorizar(filme: Filme, vocab: Vocabulario): Vetor {
  const bruto = new Map<string, number>()
  for (const g of filme.generos) {
    bruto.set(g, (bruto.get(g) ?? 0) + PESO_GENERO)
  }
  const v = new Map<string, number>()
  let soma = 0
  for (const [g, tf] of bruto) {
    const valor = tf * (vocab.idf.get(g) ?? 0)
    v.set(g, valor)
    soma += valor * valor
  }
  const norma = Math.sqrt(soma) || 1
  for (const [g, valor] of v) v.set(g, valor / norma)
  return v
}

export function vetorizarTodos(lista: Filme[]): { vocab: Vocabulario; vetores: Map<number, Vetor> } {
  const vocab = calcularIdf(lista)
  const vetores = new Map<number, Vetor>()
  for (const f of lista) vetores.set(f.id, vetorizar(f, vocab))
  return { vocab, vetores }
}

/** Similaridade de cosseno. Os vetores já estão normalizados, então é o produto interno. */
export function cosseno(a: Vetor, b: Vetor): number {
  const [menor, maior] = a.size <= b.size ? [a, b] : [b, a]
  let soma = 0
  for (const [g, valor] of menor) {
    const outro = maior.get(g)
    if (outro) soma += valor * outro
  }
  return soma
}

export type Vizinho = { filme: Filme; similaridade: number }

/** Os N filmes mais parecidos com o informado, excluindo ele mesmo. */
export function maisSimilares(
  alvo: Filme,
  lista: Filme[],
  vetores: Map<number, Vetor>,
  quantos = 5,
): Vizinho[] {
  const va = vetores.get(alvo.id)
  if (!va) return []
  return lista
    .filter((f) => f.id !== alvo.id)
    .map((f) => ({ filme: f, similaridade: cosseno(va, vetores.get(f.id)!) }))
    .filter((v) => v.similaridade > 0)
    .sort((a, b) => b.similaridade - a.similaridade || a.filme.id - b.filme.id)
    .slice(0, quantos)
}

/* ------------------------------------------------------------------------
   Projeção em 2D — escalonamento multidimensional clássico.

   Os filmes viram pontos num plano preservando ao máximo as distâncias
   angulares entre seus vetores. É a mesma ideia que um analista usa para
   enxergar agrupamento em dados de alta dimensão: aqui, 17 gêneros viram
   duas coordenadas.
   ------------------------------------------------------------------------ */

export type Ponto = { x: number; y: number }

function autovetorDominante(B: number[][], n: number, iteracoes = 400): { vetor: number[]; valor: number } {
  // Vetor inicial determinístico: com Math.random o layout mudaria a cada
  // carregamento da página, e pontos de dados não devem dançar sozinhos.
  let v = Array.from({ length: n }, (_, i) => Math.sin((i + 1) * 12.9898) * 43758.5453)
  let norma = Math.hypot(...v)
  v = v.map((x) => x / (norma || 1))

  for (let it = 0; it < iteracoes; it++) {
    const w = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) {
      let soma = 0
      const linha = B[i]
      for (let j = 0; j < n; j++) soma += linha[j] * v[j]
      w[i] = soma
    }
    const nw = Math.hypot(...w)
    if (nw < 1e-12) break
    for (let i = 0; i < n; i++) w[i] /= nw
    v = w
  }

  // Valor próprio de Rayleigh: vᵀ B v
  let valor = 0
  for (let i = 0; i < n; i++) {
    let soma = 0
    for (let j = 0; j < n; j++) soma += B[i][j] * v[j]
    valor += v[i] * soma
  }
  return { vetor: v, valor }
}

export function projetar2D(lista: Filme[], vetores: Map<number, Vetor>): Map<number, Ponto> {
  const n = lista.length
  const ids = lista.map((f) => f.id)

  // Matriz de Gram: produto interno entre todos os pares (já é a similaridade).
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const s = cosseno(vetores.get(ids[i])!, vetores.get(ids[j])!)
      G[i][j] = s
      G[j][i] = s
    }
  }

  // Centralização dupla — transforma o Gram numa matriz de distâncias centradas.
  const mediasLinha = G.map((linha) => linha.reduce((a, b) => a + b, 0) / n)
  const mediaGeral = mediasLinha.reduce((a, b) => a + b, 0) / n
  const B: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => G[i][j] - mediasLinha[i] - mediasLinha[j] + mediaGeral),
  )

  const primeiro = autovetorDominante(B, n)
  const raiz1 = Math.sqrt(Math.max(primeiro.valor, 1e-9))

  // Deflação: remove a direção já encontrada para achar a segunda.
  const B2: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => B[i][j] - primeiro.valor * primeiro.vetor[i] * primeiro.vetor[j]),
  )
  const segundo = autovetorDominante(B2, n)
  const raiz2 = Math.sqrt(Math.max(segundo.valor, 1e-9))

  const pontos = new Map<number, Ponto>()
  for (let i = 0; i < n; i++) {
    pontos.set(ids[i], { x: primeiro.vetor[i] * raiz1, y: segundo.vetor[i] * raiz2 })
  }
  return pontos
}
