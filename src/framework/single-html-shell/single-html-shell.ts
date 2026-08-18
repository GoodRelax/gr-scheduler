// SingleHtmlShell -- public entry of this folder.
//
// @unit      UF-47   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-25
//
// The entry Vite reads. 5.3 forbids a main.ts: booting is CP-25's job and this
// is where it lives.
//
// ⚠️ PI-25 publishes NOTHING to other components. What leaves this file leaves
// through the page, not through an import.
//
// Boots in the order table T-077 fixes: BO-1 settles the screen, BO-2 picks
// the document, BO-3 reads the zoom and the scroll out of it, BO-4 runs table
// T-068 and BO-5 puts the first frame up. ⛔ NFR-011 makes the order a MUST --
// skipping BO-1 draws a frame with no size and skipping BO-3 draws one in no
// particular place.

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import type { Document } from '../../entity/document-model/document/document'
import { documentFromJson } from '../../adapter/document-codec/document-codec'
import { domSvgSurface } from '../dom-svg-surface/dom-svg-surface'
import { frameLoop, type FrameEnvironment } from './frame-loop'
import startupTemplate from './startup-template.json'

/**
 * BT-4 of table T-034 -- the template FR-027 keeps exactly one of.
 *
 * ⭐ Bundled as a `GRS JSON` rather than assembled here, which FR-027 requires
 * in as many words, so the same reader the import path uses can be pointed at
 * it. tools/generate_startup_template.py writes it and `npm run gen:check`
 * fails when it drifts.
 *
 * ⭐ Read through `documentFromJson`, not asserted into shape: FR-023 calls
 * every intake untrusted, and a template that stopped being a document would
 * otherwise reach the layout as one. ⚠️ It is bundled, so a fault here is a
 * build that shipped broken -- there is nobody to tell, and nothing to fall
 * back to (FR-067 says a lost BT-1 descends, and BT-4 is the bottom).
 */
function startupTemplateDocument(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate))
  if (!read.ok) {
    throw new Error(
      'the bundled startup template is not a GRS JSON document: ' +
        read.faults.map((one) => `${one.at} ${one.what}`).join('; '),
    )
  }
  return read.document
}

/**
 * What BO-1 has to settle before anything is drawn.
 *
 * ⚠️ `appHeaderHeight` is measured, not configured (FR-051), and the part that
 * measures it -- ScreenRenderer with DomScreenSurface -- is not written yet.
 * Until it is, the header is absent and its height is zero, which is the truth
 * about what is on the screen rather than a placeholder for it.
 */
function environmentOf(): FrameEnvironment {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    appHeaderHeight: 0,
    scrollbarThickness: 0,
  }
}

/** @purity non-pure */
function boot(): void {
  const host = document.createElement('div')
  host.dataset.role = 'schedule-canvas'
  document.body.appendChild(host)

  // BO-2 -- table T-034's order. Only BT-4 can yield anything yet: the three
  // ahead of it are read by DocumentCodec, FileGateway and AutosaveGateway,
  // and none of those is written. ⛔ Saying `none` is not a stand-in; it is
  // what is true of this build, and FR-067 already says a rank that yields
  // nothing descends rather than starting empty.
  const chosen = chooseStartupDocument({
    embedded: { kind: 'none' },
    handed: { kind: 'none' },
    autosave: { kind: 'none' },
    template: startupTemplateDocument(),
  })

  // BO-3 is inside the document: zoomX / zoomY and scrollDate / scrollGroupId
  // are stored (FR-024 keeps all four, WY-1 needs them), so the loop reads
  // them off documentSettings rather than being told.
  const loop = frameLoop(domSvgSurface(host), chosen.document, environmentOf())

  // FT-3 of table T-078 -- the shell observes the window itself, because the
  // size is the host's value and not an input device's (IF-2 stays narrow).
  window.addEventListener('resize', () => loop.resize(environmentOf()))
}

boot()

export {}
