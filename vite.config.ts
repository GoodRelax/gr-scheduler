import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'

// Chapter 5.3 forbids a main.ts: the entry is the shell itself
// (`src/framework/single-html-shell/single-html-shell.ts`, table T-062 CP-25),
// which index.html loads.
//
// Chapter 1.4 and NFR-004 decide the shape of the deliverable: one `.html` with
// the generated JavaScript and CSS embedded in it, holding nothing that has to
// be fetched from outside (table T-003 CN-1 and CN-6). NFR-004 also says the
// judgement is made with the file opened directly, and on `file://` an
// EXTERNAL module script is refused by CORS -- so the inline
// `<script type="module">` below is not a size optimisation, it is the only
// form that runs at all.
// ⚠️ FR-067 (table T-024 IO-7) is a different deliverable -- the running
// program writing itself and a document out as one `.html` -- and stays the
// shell's own concern.
// ⛔ No third-party plugin does the folding: table T-003 CN-7 keeps third-party
// material out of the artifact and out of the repository.
// The content security policy that table T-003 CN-8 requires of the single
// HTML is emitted below, into the head of the built page. CN-8 settles
// `img-src` itself; every other directive was ruled separately, and the shape
// they were given is:
//   - a base that permits nothing, so a resource can only load where a
//     directive was added on purpose. This is the strongest answer available
//     to NFR-009, which forbids the deliverable from reaching a state where
//     input can be made to run as code.
//   - `script-src` pinned to the hash of the script this plugin inlines,
//     computed here at build time from the text that actually ends up in the
//     element.
//   - ⛔ NOT a nonce. A nonce has to be minted fresh per response by a server,
//     and NFR-004 has the deliverable judged with the file opened straight
//     from disk, where there is no response and no server to mint one.
//   - `'unsafe-inline'` for styles. The screen surface dresses every node by
//     writing a `style` attribute onto it, and `style-src` governs those, so
//     without this the application comes up unstyled. A stylesheet folded in
//     as an inline `<style>` by this plugin needs the same permission.
//     ⛔ Never grant it to scripts: an injected `<script>` would then run, and
//     the hash below would be decoration.
function inlineBuiltAssetsIntoHtml(): Plugin {
  return {
    name: 'grs-inline-built-assets-into-html',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      // Vite injects the tags into index.html in its own generateBundle, so
      // this has to run last or there is nothing yet to replace.
      order: 'post',
      handler(_outputOptions, bundle) {
        const externalScriptTagPattern = /<script\b[^>]*\bsrc="([^"]*)"[^>]*><\/script>/g
        const linkTagPattern = /<link\b[^>]*>/g
        const inlinedFileNames = new Set<string>()

        // Tags carry the served URL (`/assets/...`); the bundle is keyed by the
        // path relative to outDir.
        const bundledFileNameOf = (url: string): string => url.replace(/^\.?\//, '')

        const bundledSourceTextOf = (fileName: string): string | null => {
          const bundled = bundle[fileName]
          if (bundled === undefined) return null
          if (bundled.type === 'chunk') return bundled.code
          return typeof bundled.source === 'string'
            ? bundled.source
            : new TextDecoder().decode(bundled.source)
        }

        // ⚠️ What the browser hashes is the element's TEXT CONTENT -- the
        // characters between the tags, not the tags themselves -- and it reads
        // that text only after the parser has turned every CR and CRLF in it
        // into a bare LF. Hash exactly that, or the policy refuses the one
        // script in the file and the page comes up blank.
        const scriptSourceHashOf = (scriptText: string): string => {
          const asTheParserSeesIt = scriptText.replace(/\r\n?/g, '\n')
          return `'sha256-${createHash('sha256').update(asTheParserSeesIt, 'utf8').digest('base64')}'`
        }

        for (const htmlAsset of Object.values(bundle)) {
          if (htmlAsset.type !== 'asset') continue
          if (!htmlAsset.fileName.endsWith('.html')) continue

          const html =
            typeof htmlAsset.source === 'string'
              ? htmlAsset.source
              : new TextDecoder().decode(htmlAsset.source)
          const inlinedScriptTexts: string[] = []

          // The link tags go first: once the script code sits in the document,
          // a second pass over it would be reading the program, not the page.
          const withAssetsInlined = html
            .replace(linkTagPattern, (linkTag) => {
              const href = /\bhref="([^"]*)"/.exec(linkTag)?.[1]
              if (href === undefined) return linkTag
              const fileName = bundledFileNameOf(href)
              const bundledText = bundledSourceTextOf(fileName)
              if (bundledText === null) return linkTag
              if (/\brel="stylesheet"/.test(linkTag)) {
                inlinedFileNames.add(fileName)
                return `<style>${bundledText}</style>`
              }
              // A preload or modulepreload hint pointing at a file that is
              // about to be folded in and deleted: drop the tag, and leave the
              // file itself to whichever tag actually loads it.
              return ''
            })
            .replace(externalScriptTagPattern, (scriptTag, url: string) => {
              const fileName = bundledFileNameOf(url)
              const code = bundledSourceTextOf(fileName)
              if (code === null) return scriptTag
              inlinedFileNames.add(fileName)
              // ⚠️ The HTML parser ends the element at the first `</script`
              // sequence, wherever in the code it happens to sit.
              const scriptText = code.replace(/<\/script/g, '<\\/script')
              // Recorded AFTER that escaping, because it is this string, not
              // the chunk it came from, that lands between the tags.
              inlinedScriptTexts.push(scriptText)
              return `<script type="module">${scriptText}</script>`
            })

          // ⛔ A NUL is not carried through a raw text element: the parser
          // swaps it for U+FFFD, so the text the browser hashes stops being
          // the text hashed here, `script-src` refuses the script and the
          // application does not load at all. That has happened in this
          // project once already, from a control character in a string key.
          // Fail the build rather than ship a page that silently will not run.
          for (const scriptText of inlinedScriptTexts) {
            if (scriptText.includes('\u0000')) {
              this.error(
                'the inlined script holds a NUL; the parser rewrites it, so the ' +
                  'script-src hash cannot match. Keep source strings and keys ASCII.',
              )
            }
          }

          const scriptSources =
            inlinedScriptTexts.length > 0
              ? inlinedScriptTexts.map(scriptSourceHashOf).join(' ')
              : `'none'`
          // Table T-232 of chapter 6.1 holds the whole of the policy, row by
          // row, and forbids adding a directive that is not in it.
          // ⚠️ `base-uri` and `form-action` are listed there because
          // `default-src` does NOT reach them: without the first, an injected
          // base URL redirects every relative reference in the document.
          const policy = [
            `default-src 'none'`,
            `img-src data:`,
            `style-src 'unsafe-inline'`,
            `script-src ${scriptSources}`,
            `base-uri 'none'`,
            `form-action 'none'`,
          ].join('; ')

          // ⚠️ Emitted as the FIRST thing in the head, and only now that the
          // script is already inlined. A policy in a meta governs what the
          // parser reaches after it and nothing before it, so anything left
          // above this tag would be shipped unpoliced.
          htmlAsset.source = withAssetsInlined.replace(
            /<head\b[^>]*>/i,
            (headTag) =>
              `${headTag}<meta http-equiv="Content-Security-Policy" content="${policy}">`,
          )
        }

        for (const fileName of inlinedFileNames) delete bundle[fileName]

        // NFR-004 is a MUST NOT, so it is checked rather than hoped for: a file
        // that no tag referenced would still be shipped beside the HTML.
        // ⚠️ The check cannot re-read the bundle. The object handed to this
        // hook only RECORDS a deletion; the key stays visible, so a bundle read
        // back here would report every file as still present.
        const fileNamesNotInlined = Object.keys(bundle).filter(
          (fileName) => !fileName.endsWith('.html') && !inlinedFileNames.has(fileName),
        )
        if (fileNamesNotInlined.length > 0) {
          this.error(
            `NFR-004 asks for one .html; nothing folded these in: ${fileNamesNotInlined.join(', ')}`,
          )
        }
      },
    },
  }
}

// ⚠️ The dev server takes its port from the PORT environment variable when one
// is set, because the tooling that launches it assigns a free port that way and
// then looks for the server THERE. Vite does not read PORT on its own, so
// without this line the assigned port and the listening port drift apart and
// the preview points at nothing.
// ⛔ `strictPort` is on ONLY when a port was assigned: an assigned port that is
// already taken has to fail loudly rather than let Vite pick the next one, which
// would drift again. Started by hand with no PORT, Vite keeps its own default
// behaviour of stepping to the next free port.
const assignedPort = Number(process.env.PORT)
const hasAssignedPort = Number.isInteger(assignedPort) && assignedPort > 0

export default defineConfig({
  plugins: [inlineBuiltAssetsIntoHtml()],
  server: {
    port: hasAssignedPort ? assignedPort : 5173,
    strictPort: hasAssignedPort,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // ⛔ No modulepreload polyfill in the artifact. It is the only thing in the
    // built file that calls `fetch(` -- once per `link[rel="modulepreload"]`
    // it finds, plus a MutationObserver left watching for more to appear. The
    // plugin above deletes those link tags, so today it never has anything to
    // reach for; that is an argument, and CN-6 and NFR-004 have to be readable
    // in the deliverable itself. Anyone auditing the file for outbound traffic
    // greps for `fetch(`, and this was the one hit.
    modulePreload: { polyfill: false },
  },
})
