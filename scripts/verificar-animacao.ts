/* ------------------------------------------------------------------------
   Verifica que a animação do campo REALMENTE roda no navegador.

   O `--screenshot` do headless congela o requestAnimationFrame, então a
   captura sempre mostra "ciclo 0". Este script abre o Edge com depuração
   remota, espera alguns segundos e lê o texto do readout direto do DOM.

   Uso:  bun run scripts/verificar-animacao.ts
   Exige o dev server no ar (bun run dev).
   ------------------------------------------------------------------------ */

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ALVO = process.env.URL ?? 'http://localhost:5273/'
const PORTA = 9333

const proc = Bun.spawn(
  [
    EDGE,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${process.env.TEMP ?? '.'}\\portfolio-verificacao`,
    ALVO,
  ],
  { stdout: 'ignore', stderr: 'ignore' },
)

type Alvo = { type: string; url: string; webSocketDebuggerUrl: string }

async function acharAlvo(): Promise<Alvo | undefined> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json`)
      const lista = (await r.json()) as Alvo[]
      const pagina = lista.find((t) => t.type === 'page' && t.url.includes(new URL(ALVO).port))
      if (pagina?.webSocketDebuggerUrl) return pagina
    } catch {
      // a porta ainda não abriu
    }
    await Bun.sleep(250)
  }
  return undefined
}

const alvo = await acharAlvo()
if (!alvo) {
  console.error('ERRO: nao consegui falar com o Edge. O dev server esta no ar?')
  proc.kill()
  process.exit(1)
}

const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((ok, erro) => {
  ws.addEventListener('open', ok, { once: true })
  ws.addEventListener('error', erro, { once: true })
})

let proximoId = 1
function avaliar(expressao: string): Promise<string> {
  const id = proximoId++
  return new Promise((ok) => {
    const ouvir = (ev: MessageEvent) => {
      const m = JSON.parse(String(ev.data))
      if (m.id !== id) return
      ws.removeEventListener('message', ouvir)
      ok(String(m.result?.result?.value ?? ''))
    }
    ws.addEventListener('message', ouvir)
    ws.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: expressao, returnByValue: true },
      }),
    )
  })
}

const lerReadout = () =>
  avaliar(`document.querySelector('figure figcaption')?.innerText.replace(/\\n/g, ' | ') ?? '(sem readout)'`)

const lerCiclos = () =>
  avaliar(`(document.querySelector('figure figcaption')?.innerText.match(/ciclo ([\\d.]+)/) ?? [])[1] ?? '0'`)

// Espera o React montar.
await Bun.sleep(2000)
const primeira = await lerReadout()
const ciclo1 = Number((await lerCiclos()).replace(/\./g, ''))

await Bun.sleep(2500)
const segunda = await lerReadout()
const ciclo2 = Number((await lerCiclos()).replace(/\./g, ''))

console.log('leitura apos 2,0 s :', primeira)
console.log('leitura apos 4,5 s :', segunda)
console.log('')
console.log(`ciclos avancados  : ${ciclo1} -> ${ciclo2}`)

const avancou = ciclo2 > ciclo1 && ciclo2 > 5
console.log(avancou ? 'RESULTADO: OK — a animacao esta rodando' : 'RESULTADO: FALHOU — o ciclo nao avancou')

ws.close()
proc.kill()
process.exit(avancou ? 0 : 1)
