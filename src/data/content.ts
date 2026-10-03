// Todo o conteúdo estático do site fica aqui, separado da apresentação.
// Datas, links e números são reais; nada é decorativo.

export const perfil = {
  nome: 'victor guimaraes',
  resumo: 'dados · machine learning',
  email: 'victorguinascimento@gmail.com',
  github: 'https://github.com/victorhugoguimaraes',
  githubUsuario: 'victorhugoguimaraes',
  linkedin: 'https://www.linkedin.com/in/victor-hugo-guimar%C3%A3es-nascimento',
  // Caminho relativo: funciona tanto na raiz quanto em subpasta (GitHub Pages).
  curriculo: './curriculo.pdf',
} as const

/** Título e texto do projeto de dados — ficam dentro da seção dele, não no topo. */
export const dadosAbertura = {
  titulo: ['72.500 filmes.', 'Nenhum por acaso.'],
  texto:
    'Construí um sistema de recomendação que lê gênero, tema e diretor de 72.500 filmes do Letterboxd e responde qual assistir depois. O que está aqui é uma versão reduzida dele — 58 filmes, só gêneros — calculando de verdade no seu navegador.',
} as const

export const agora: string[] = [
  'Cursando Engenharia de Redes de Comunicação na UnB.',
  'Buscando estágio em dados: análise exploratória, pipelines e visualização.',
  'Membro da equipe técnica da UnBall, na categoria Simulação 2D da RoboCup.',
]

export type Projeto = {
  periodo: string
  nome: string
  resumo: string
  tags: string[]
  link: string
  demo?: string
}

/** O projeto que vem logo depois do "sobre". */
export const projetoDados: Projeto = {
  periodo: '2026',
  nome: 'Recomendador de Filmes',
  resumo:
    'Juntei os filmes que eu assistia num dataset e construí um sistema que responde qual ver depois. São ~72.500 filmes do Letterboxd: limpeza, filtros, TF-IDF sobre gênero, tema e diretor, similaridade de cosseno e um score de qualidade. As recomendações ficam pré-calculadas em SQLite e saem em milissegundos.',
  tags: ['Python', 'Scikit-learn', 'SQLite', 'Streamlit'],
  link: 'https://github.com/victorhugoguimaraes/recomendador-filmes-letterboxd',
  demo: 'https://recomendador-letterboxd.streamlit.app',
}

/** O time. Vem depois do projeto de dados. */
export const projetoFutebol: Projeto = {
  periodo: '2026',
  nome: 'UnBall Manager2D',
  resumo:
    'Ferramenta gráfica para a equipe UnBall configurar partidas, importar adversários e acompanhar os logs do simulador sem decorar comandos de terminal.',
  tags: ['C++', 'wxWidgets', 'CMake'],
  link: 'https://github.com/victorhugoguimaraes/UnBall-Manager2D',
}

export const outrosProjetos: Projeto[] = [
  {
    periodo: '2025 — 2026',
    nome: 'Faltai',
    resumo:
      'Aplicação web para acompanhar faltas, carga horária e progresso no semestre. Sincroniza em tempo real com Firestore, funciona offline como PWA e tem uma API intermediária em Node e Express.',
    tags: ['JavaScript', 'Firebase', 'Node.js', 'PWA'],
    link: 'https://github.com/victorhugoguimaraes/Faltai',
    demo: 'https://victorhugoguimaraes.github.io/Faltai/',
  },
  {
    periodo: '2025 — 2026',
    nome: 'BaixaKiTorrent',
    resumo:
      'Cliente BitTorrent escrito do zero em Go para estudar protocolos de rede: parser Bencode próprio, comunicação com o tracker, handshake P2P de 68 bytes e verificação de integridade peça por peça.',
    tags: ['Go', 'redes', 'P2P'],
    link: 'https://github.com/victorhugoguimaraes/baixakitorrent-go',
  },
  {
    periodo: '2026',
    nome: 'Detector de Vazamento de Gás',
    resumo:
      'Firmware em C para o MSP430F5529LP que transforma a presença de gás em um evento detectável — som, luz e texto — em vez de depender do olfato. Inclui simulador testado e pesquisa de campo com 21 respostas.',
    tags: ['C', 'MSP430', 'embarcados'],
    link: 'https://github.com/victorhugoguimaraes/gas-leak-detector-msp430',
  },
  {
    periodo: '2026',
    nome: 'Cardano Lab',
    resumo:
      'Carteira educacional na testnet Preview da Cardano: geração de mnemônico BIP39, derivação de endereços de pagamento e stake, consulta de UTXOs via Blockfrost e transferência de tADA assinada localmente.',
    tags: ['TypeScript', 'Bun', 'Blockfrost'],
    link: 'https://github.com/victorhugoguimaraes/cardano-lab',
  },
]

export type Leitura = {
  titulo: string
  autor: string
  assunto: 'dados' | 'economia' | 'literatura'
  situacao: 'lendo' | 'lido'
}

export const leituras: Leitura[] = [
  {
    titulo: 'Hands-On Machine Learning with Scikit-Learn and PyTorch',
    autor: 'Aurélien Géron',
    assunto: 'dados',
    situacao: 'lendo',
  },
  {
    titulo: 'Economia: modo de usar',
    autor: 'Ha-Joon Chang',
    assunto: 'economia',
    situacao: 'lendo',
  },
  {
    titulo: 'Norwegian Wood',
    autor: 'Haruki Murakami',
    assunto: 'literatura',
    situacao: 'lido',
  },
]

export type Curso = { nome: string; emissor: string }

export const cursos: Curso[] = [
  { nome: 'Machine Learning com AWS DeepRacer', emissor: 'UnB' },
  { nome: 'Introdução à Visão Computacional em Futebol de Robôs', emissor: 'UnB' },
  { nome: 'Introdução ao R para Análise de Dados de Imigração', emissor: 'UnB' },
  { nome: 'Intermediate Python', emissor: 'DataCamp' },
  { nome: 'Introduction to Python', emissor: 'DataCamp' },
  { nome: 'Networking Basics', emissor: 'Cisco' },
]

export const robocup = {
  titulo: 'robocup 2d',
  texto: [
    'Sou membro da equipe técnica da UnBall, na categoria Simulação 2D — a liga oficial da RoboCup em que os jogadores são programas, sem nenhum robô físico envolvido.',
    'Atuo com sistemas multiagentes, estratégia e tomada de decisão autônoma, junto com o resto do time. A ferramenta gráfica que ajuda a equipe a testar partidas é um dos projetos acima.',
  ],
} as const

export const sobre: string[] = [
  'Curso Engenharia de Redes de Comunicação na Universidade de Brasília. Meu interesse está na parte dos dados: transformar uma base bruta em algo que responda a uma pergunta.',
  'Foi assim que comecei: juntando os filmes que eu assistia num dataset e construindo um recomendador para decidir o que ver depois. Hoje faço parte da equipe de robótica da Faculdade de Tecnologia, onde trabalho com sistemas multiagentes e tomada de decisão autônoma.',
  'Busco um estágio em dados para trabalhar com limpeza, análise exploratória, visualização e automação de pipelines.',
]
