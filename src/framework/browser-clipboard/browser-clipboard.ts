// BrowserClipboard: implements Clipboard (table T-065 IF-5) over the browser's clipboard.
// @unit      UF-53   (docs/spec/05-07-design.md, table T-075)
// @component BrowserClipboard, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-30

import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
} from '../../adapter/clipboard-gateway/clipboard-gateway'

const PNG_TYPE = 'image/png'

// see FR-025
// TRAP: reached through globalThis, not imported as a DOM type: this unit is compiled
// without the DOM library, and an absent host constructor must read as unsupported.
type MakeBlob = new (parts: readonly unknown[], options: { type: string }) => unknown

type MakeItem = new (parts: Record<string, unknown>) => unknown

interface PictureHost {
  readonly makeBlob: MakeBlob | undefined
  readonly makeItem: MakeItem | undefined
}

/** @purity pure */
function pictureHost(): PictureHost {
  const host = globalThis as unknown as {
    Blob?: MakeBlob
    ClipboardItem?: MakeItem
  }
  return { makeBlob: host.Blob, makeItem: host.ClipboardItem }
}

/** @purity pure */
function faultFromThrown(thrown: unknown): ClipboardFault {
  const isRefused =
    typeof thrown === 'object' &&
    thrown !== null &&
    'name' in thrown &&
    thrown.name === 'NotAllowedError'
  return isRefused ? 'notPermitted' : 'writeFailed'
}

/** @purity pure */
export function browserClipboard(
  systemClipboard:
    | {
        writeText(text: string): Promise<void>
        write?(items: readonly unknown[]): Promise<void>
      }
    | undefined,
): Clipboard {
  return {
    /** @purity non-pure */
    async writeClipboardContent(content: ClipboardContent) {
      if (systemClipboard === undefined) return { ok: false, fault: 'unsupported' }
      try {
        if (content.kind !== 'picture') {
          await systemClipboard.writeText(content.text)
          return { ok: true }
        }
        // see FR-025
        const { makeBlob, makeItem } = pictureHost()
        const write = systemClipboard.write
        if (write === undefined || makeBlob === undefined || makeItem === undefined) {
          return { ok: false, fault: 'unsupported' }
        }
        const drawn = new makeBlob([content.pngBytes], { type: PNG_TYPE })
        await write.call(systemClipboard, [new makeItem({ [PNG_TYPE]: drawn })])
        return { ok: true }
      } catch (thrown) {
        return { ok: false, fault: faultFromThrown(thrown) }
      }
    },
  }
}
