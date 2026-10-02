import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { EthGlyph, GithubGlyph, LogoMark, XGlyph } from '../components/Logo'
import { StatusDot } from '../components/ui/StatusDot'
import { PROJECT } from '../config/project'
import { useUi } from '../state/ui'
import { IS_LIVE } from '../config/mode'

function FootLink({ href, onClick, icon, children }: { href?: string; onClick?: () => void; icon: ReactNode; children: ReactNode }) {
  const cls =
    'group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-muted transition-colors hover:text-fg'
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        <span className="text-dim group-hover:text-soft">{icon}</span>
        {children}
      </button>
    )
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      <span className="text-dim group-hover:text-soft">{icon}</span>
      {children}
      <ArrowUpRight className="size-3 text-faint transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-muted" />
    </a>
  )
}

export function Footer() {
  const { open } = useUi()
  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4 text-fg">
              <LogoMark className="size-10 sm:size-12" />
              <span className="font-mono text-[44px] font-semibold leading-none tracking-[0.3em] sm:text-[64px]">NULL</span>
            </div>
            <p className="mt-5 font-mono text-[11.5px] tracking-[0.2em] text-muted">PRIVATE ACCESS TO THE MACHINE ECONOMY</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-4 sm:flex sm:gap-8" aria-label="Footer">
            <FootLink href={PROJECT.links.x} icon={<XGlyph className="size-3" />}>
              {PROJECT.xHandle}
            </FootLink>
            <FootLink href={PROJECT.links.github} icon={<GithubGlyph className="size-3.5" />}>
              GITHUB
            </FootLink>
            <FootLink onClick={() => open({ name: 'docs' })} icon={<span className="font-mono text-[11px]">{'{}'}</span>}>
              DOCS
            </FootLink>
            <FootLink href={PROJECT.links.ethereum} icon={<EthGlyph className="size-3.5" />}>
              ETHEREUM
            </FootLink>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 font-mono text-[10.5px] tracking-[0.12em] text-dim sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            NETWORK
            <span className="inline-flex items-center gap-1.5 text-ok/90">
              <StatusDot tone="ok" live />
              ONLINE
            </span>
          </span>
          <span>
            {IS_LIVE ? `${PROJECT.domain} · live on Ethereum mainnet via zkAPI · experimental` : `${PROJECT.domain} · demo build · no transactions are broadcast`}
          </span>
        </div>
      </div>
    </footer>
  )
}
