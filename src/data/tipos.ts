/* Tipos dos arquivos gerados por `bun run sincronizar`.
   Sem eles o TypeScript infere `never` a partir dos JSON vazios. */

export type Faixa = {
  faixa: string
  artistas: string
  /** A mesma capa em tamanhos diferentes, para montar o srcset. */
  capas: { url: string; w: number }[]
  link: string
}

export type DadosSpotify = {
  atualizado: string | null
  perfil: { url: string | null }
  tocandoAgora: Faixa | null
  recentes: Faixa[]
}

export type FilmeLetterboxd = {
  titulo: string
  ano: number | null
  nota: number | null
  assistido: string
  capa: string | null
  link: string
}

export type DadosLetterboxd = {
  usuario: string
  atualizado: string
  filmes: FilmeLetterboxd[]
}
