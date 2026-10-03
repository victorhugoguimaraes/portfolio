# portfólio

Site pessoal — Victor Hugo G. Nascimento.

**https://victorhugoguimaraes.github.io/portfolio/**

## O que tem

- **contato e currículo no cabeçalho** — e-mail, GitHub, LinkedIn e o PDF, visíveis sem rolar
- **sobre, formação e agora** — quem sou e o que estou fazendo
- **o projeto de dados** — recomendador de filmes com TF-IDF e similaridade de cosseno, calculado no navegador
- **o futebol simulado** — campo 2D com a física do simulador da RoboCup
- **outros projetos** — o resto do que está no meu GitHub
- **consumindo** — o que estou lendo, assistindo e ouvindo

Nada ali é número inventado: a similaridade, a projeção e a simulação são
calculadas de verdade e têm testes.

## Como foi feito

| | |
|---|---|
| Base | React 19 + Vite + TypeScript |
| Estilo | Tailwind CSS v4, sem biblioteca de componentes |
| Ambiente | Bun |
| Fontes | Departure Mono nos títulos, Commit Mono no texto |
| Dados | Letterboxd (RSS) e Spotify (API) |
| Publicação | GitHub Pages, pelo GitHub Actions |

## Rodar

```bash
bun install
bun dev          # http://localhost:5273
```

## Comandos

| Comando | O que faz |
|---|---|
| `bun dev` | Sobe o site na sua máquina |
| `bun test` | Roda os testes |
| `bun run build` | Gera o site em `dist/` |
| `bun run sincronizar` | Atualiza os dados do Letterboxd e do Spotify |
| `bun run spotify:login` | Autoriza o Spotify, uma vez só |

## Atualiza sozinho

O workflow **`publicar`** cuida de tudo:

- a cada **push** na `main`
- a cada **6 horas**
- ou quando você disparar na mão

Ele sincroniza o Letterboxd e o Spotify, roda os testes, gera o site e publica
no GitHub Pages. **Ele nunca commita nada** — o repositório guarda só o código,
e por isso não existe divergência entre a sua máquina e o remoto.

Os arquivos `src/data/letterboxd.json` e `spotify.json` ficam versionados apenas
como ponto de partida: em cada publicação eles são gerados de novo. Se o
Letterboxd ou o Spotify estiverem fora do ar, a publicação segue com os dados
anteriores e o workflow mostra um aviso.

As credenciais ficam fora do repositório: em `.env.local` na sua máquina
e nos *Secrets* do GitHub, que são criptografados e não podem ser lidos de
volta depois de salvos. O `.gitignore` cobre `.env`, `.env.*` e `*.local`.

## Currículo

O PDF fica em `public/curriculo.pdf` e vem do LaTeX, que mora em
`~/Documents/Curriculo/curriculo.tex`. Para atualizar:

```bash
cd ~/Documents/Curriculo
pdflatex -interaction=nonstopmode curriculo.tex
cp curriculo.pdf ~/dev/projects/portfolio/public/
```

## Créditos

[Departure Mono](https://github.com/rektdeckard/departure-mono) — Helena Zhang
e Tobias Fried, licença MIT.
