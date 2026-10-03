import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [escuro, setEscuro] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
    try {
      localStorage.setItem('tema', escuro ? 'escuro' : 'claro')
    } catch {
      // Modo privado pode bloquear o localStorage: seguir sem salvar.
    }
  }, [escuro])

  return (
    <button
      type="button"
      onClick={() => setEscuro((v) => !v)}
      aria-label={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      className="font-display cursor-pointer border border-rule px-2 py-1 text-[12px] leading-none text-muted transition-colors hover:border-field hover:text-ink"
    >
      {escuro ? 'claro' : 'escuro'}
    </button>
  )
}
