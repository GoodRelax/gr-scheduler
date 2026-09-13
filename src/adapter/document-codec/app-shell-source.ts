// DocumentCodec -- declares the interface AppShellSource (table T-065 IF-8).
// @unit      UF-38   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    n/a
// @seam      AppShellSource, implemented in another layer (LR-5)

export interface AppShell {
  readonly html: string
  readonly embeddedDocumentElementId: string
}

export type AppShellReading =
  | { readonly ok: true; readonly appShell: AppShell }
  | { readonly ok: false; readonly what: string }

export interface AppShellSource {
  /** @purity semi-pure-b */
  readAppShell(): Promise<AppShellReading>
}
