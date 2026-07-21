/**
 * A small but faithful SVG DOM for the renderer-layer unit tests (review M-4 / R6).
 *
 * The largest, most-changed adapter (`svg-renderer.ts` and the layers split out of
 * it) previously had ZERO unit coverage -- only Playwright E2E -- which is the
 * structural cause of the recurring "unit green but live broken" pattern. jsdom /
 * happy-dom are not installed and package.json is frozen, so (matching the existing
 * `left-pane-interaction.test.ts` precedent) these tests run against a compact,
 * real DOM tree that implements exactly the Node/Element surface the layers use:
 * `document.createElementNS`, attribute get/set/remove, append/remove/replace,
 * `firstChild`, `textContent`, `tagName` and a small `querySelectorAll`. The layer
 * code under test is the REAL production code; only the DOM host is a stand-in.
 */

/** A minimal SVG element node: attributes, children, parent, text. */
export class FakeSvgNode {
  public readonly tagName: string;
  public readonly namespaceURI: string;
  public parentNode: FakeSvgNode | null = null;
  private readonly attributes = new Map<string, string>();
  private readonly childList: FakeSvgNode[] = [];
  private ownText = '';
  /** Present on the svg root so callers can pin a bounding rect. */
  public boundingRect: { left: number; top: number } = { left: 0, top: 0 };

  public constructor(tagName: string, namespaceURI: string) {
    this.tagName = tagName;
    this.namespaceURI = namespaceURI;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }

  public getAttribute(name: string): string | null {
    return this.attributes.has(name) ? (this.attributes.get(name) as string) : null;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public appendChild(child: FakeSvgNode): FakeSvgNode {
    child.remove();
    child.parentNode = this;
    this.childList.push(child);
    return child;
  }

  /**
   * Insert a child BEFORE a reference child (appending when the reference is null or
   * is not a child here), matching `Node.insertBefore`. Used by the item layer to put
   * the milestone plan/actual leader line behind the markers.
   */
  public insertBefore(child: FakeSvgNode, reference: FakeSvgNode | null): FakeSvgNode {
    child.remove();
    const index = reference === null ? -1 : this.childList.indexOf(reference);
    if (index < 0) {
      this.childList.push(child);
    } else {
      this.childList.splice(index, 0, child);
    }
    child.parentNode = this;
    return child;
  }

  public removeChild(child: FakeSvgNode): FakeSvgNode {
    const index = this.childList.indexOf(child);
    if (index >= 0) {
      this.childList.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  public remove(): void {
    this.parentNode?.removeChild(this);
  }

  public replaceWith(next: FakeSvgNode): void {
    const parent = this.parentNode;
    if (parent === null) {
      return;
    }
    const index = parent.childList.indexOf(this);
    next.remove();
    parent.childList[index] = next;
    next.parentNode = parent;
    this.parentNode = null;
  }

  public get firstChild(): FakeSvgNode | null {
    return this.childList[0] ?? null;
  }

  public get childNodes(): readonly FakeSvgNode[] {
    return this.childList;
  }

  public get children(): readonly FakeSvgNode[] {
    return this.childList;
  }

  public get textContent(): string {
    if (this.childList.length > 0) {
      return this.childList.map((child) => child.textContent).join('');
    }
    return this.ownText;
  }

  public set textContent(value: string) {
    this.childList.length = 0;
    this.ownText = value;
  }

  public getBoundingClientRect(): { left: number; top: number } {
    return this.boundingRect;
  }

  /** All DESCENDANTS (not self) matching a small selector subset. */
  public querySelectorAll(selector: string): FakeSvgNode[] {
    const out: FakeSvgNode[] = [];
    const walk = (node: FakeSvgNode): void => {
      for (const child of node.childList) {
        if (matchesSelector(child, selector)) {
          out.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  /** First descendant matching the selector, or null. */
  public querySelector(selector: string): FakeSvgNode | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

/** Matches `tag`, `[attr="val"]`, `[attr=val]` and `tag[attr="val"]` selectors. */
function matchesSelector(node: FakeSvgNode, selector: string): boolean {
  const attrMatch = /^([a-zA-Z]*)(?:\[([a-zA-Z-]+)(?:=(?:"([^"]*)"|([^\]]*)))?\])?$/.exec(
    selector.trim(),
  );
  if (attrMatch === null) {
    return false;
  }
  const [, tag, attrName, quotedValue, bareValue] = attrMatch;
  if (tag !== undefined && tag.length > 0 && node.tagName.toLowerCase() !== tag.toLowerCase()) {
    return false;
  }
  if (attrName !== undefined && attrName.length > 0) {
    if (!node.hasAttribute(attrName)) {
      return false;
    }
    const expected = quotedValue ?? bareValue;
    if (expected !== undefined && node.getAttribute(attrName) !== expected) {
      return false;
    }
  }
  return true;
}

/** A stand-in `document` exposing only `createElementNS`. */
export interface FakeDocument {
  createElementNS(namespaceURI: string, tagName: string): FakeSvgNode;
}

/** Build a fresh fake document (each test gets an isolated DOM). */
export function createFakeDocument(): FakeDocument {
  return {
    createElementNS(namespaceURI: string, tagName: string): FakeSvgNode {
      return new FakeSvgNode(tagName, namespaceURI);
    },
  };
}

/** The global shape the layers touch (only `document.createElementNS`). */
interface GlobalWithDocument {
  document?: unknown;
}

/**
 * Install a fresh fake `document` as the global for the duration of a test and
 * return a handle to it plus a `restore()` to remove it again. Layers create SVG
 * nodes via the global `document.createElementNS`, exactly as in the browser.
 */
export function installFakeSvgDocument(): { document: FakeDocument; restore(): void } {
  const globalWithDocument = globalThis as unknown as GlobalWithDocument;
  const previous = globalWithDocument.document;
  const fakeDocument = createFakeDocument();
  globalWithDocument.document = fakeDocument;
  return {
    document: fakeDocument,
    restore(): void {
      globalWithDocument.document = previous;
    },
  };
}

/** Convenience: create a `<g>` group node in the SVG namespace. */
export function createGroup(): FakeSvgNode {
  return new FakeSvgNode('g', 'http://www.w3.org/2000/svg');
}
