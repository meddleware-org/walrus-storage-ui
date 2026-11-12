// De-enshittification: the sources and the production build call no third-party origin (no web fonts, CDN, analytics or external
// images); the only network traffic is the chain. The build part runs over `dist/` once it exists; CI sets REQUIRE_DIST=1 after
// `npm run build` so a missing build fails instead of skipping.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')

const FORBIDDEN = /fonts\.googleapis|fonts\.gstatic|@fontsource|unpkg\.com|jsdelivr|cdnjs|cdn\.|gravatar|google-analytics|googletagmanager|gtag\(|plausible|matomo|hotjar|segment\.(com|io)/i

function filesOf(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesOf(join(dir, e.name)) : [join(dir, e.name)]))
}
const rel = (f: string) => f.slice(root.length + 1)

describe('sources', () => {
  const files = [...filesOf(join(root, 'src')).filter((f) => !f.includes('/e2e')), join(root, 'index.html'), ...filesOf(join(root, 'public'))]
  it.each(files.map((f) => [rel(f), f]))('%s names no third-party font, CDN or tracker', (_name, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN)
  })

  it('keeps no icon of its own: the shared brand icon plugin provides the set', () => {
    expect(existsSync(join(root, 'public', 'favicon.svg'))).toBe(false)
    expect(readFileSync(join(root, 'index.html'), 'utf8')).not.toMatch(/rel="(shortcut )?icon"|apple-touch-icon/)
  })
})

describe.skipIf(!existsSync(dist) && !process.env.REQUIRE_DIST)('production build', () => {
  it('exists', () => expect(existsSync(dist)).toBe(true))

  it('ships no web font files', () => {
    expect(filesOf(dist).filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([])
  })

  it('has the brand icon set and the manifest', () => {
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
      expect(existsSync(join(dist, f)), f).toBe(true)
    }
    expect(JSON.parse(readFileSync(join(dist, 'site.webmanifest'), 'utf8')).name).toBe('Walrus Assets')
  })

  it('links exactly one svg icon from the page', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    expect(html.match(/<link[^>]*rel="icon"[^>]*type="image\/svg\+xml"/g) ?? []).toHaveLength(1)
  })

  it('references no third-party origin in the page, scripts or styles, other than chain endpoints', () => {
    const text = filesOf(dist)
      .filter((f) => /\.(html|css|js|webmanifest)$/.test(f))
      .map((f) => [rel(f), readFileSync(f, 'utf8')] as const)
    for (const [name, body] of text) {
      expect(body, name).not.toMatch(FORBIDDEN)
      // Markup and styles load nothing from another origin (a script may name a chain endpoint, a Walrus host or an explorer link; the wasm is served from this origin).
      if (/\.(html|css)$/.test(name)) expect(body, name).not.toMatch(/(src|href)="https?:\/\/(?!docs\.meddleware|meddleware)|url\(\s*["']?https?:/)
    }
  })
})
