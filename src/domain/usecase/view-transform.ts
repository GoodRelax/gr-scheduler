/**
 * UseCase layer: the world <-> screen coordinate transform as a single value
 * object (POLA fix, review M-1 / R2). Pure math, no DOM, no side effects.
 *
 * The renderer used to expose two same-looking method families that lived in
 * DIFFERENT coordinate spaces -- `worldToScreen` (client/rect space, added
 * `rect.left/top`) and `worldToScreenX/Y` (SVG content space, no rect). Calling
 * the wrong one silently shifted overlays by the viewport offset: the classic
 * "tests green but live off-by-X" trap. This value object owns the whole
 * conversion and names the target space in every method, so the space can never
 * be guessed wrong again.
 *
 * Three spaces exist:
 *
 * - WORLD: schedule content coordinates (days/rows mapped to pixels), before any
 *   scroll or pane offset. This is the space commands and layout speak.
 * - CONTENT: the SVG element's own local coordinate system -- the numbers written
 *   to SVG attributes (`x`, `y`, path `d`). The content `<g>` is translated by
 *   `(leftPaneWidth - scrollX, contentTopOffsetPx - scrollY)` and is NEVER scaled
 *   (zoom is baked into the world placements), so WORLD maps to CONTENT by adding
 *   that translate.
 * - CLIENT: viewport pixels (`PointerEvent.clientX/clientY`). This is CONTENT
 *   shifted by the SVG element's bounding rect (`rect.left/top`).
 *
 * `toContent` / `fromContent` stay in SVG content space (rect excluded);
 * `toClient` / `fromClient` cross into client space (rect included). Each pair is
 * the exact inverse of the other, so the selectable region can never drift from
 * the drawn position.
 */

/** World-space point (schedule content coordinates, before the scroll translate). */
export interface WorldPoint {
  readonly worldX: number;
  readonly worldY: number;
}

/** SVG content-space point: the value actually written to an SVG attribute. */
export interface ContentPoint {
  readonly contentX: number;
  readonly contentY: number;
}

/** Client/viewport-space point (e.g. `PointerEvent.clientX/clientY`). */
export interface ClientPoint {
  readonly clientX: number;
  readonly clientY: number;
}

/** The offsets that fully determine a {@link ViewTransform} at one instant. */
export interface ViewTransformParams {
  /** Frozen left-pane width in CSS px; world x = 0 sits to its right. */
  readonly leftPaneWidth: number;
  /** Vertical px the content is pushed down by so row 0 clears the date ruler. */
  readonly contentTopOffsetPx: number;
  /** Current horizontal scroll (world px). */
  readonly scrollX: number;
  /** Current vertical scroll (world px). */
  readonly scrollY: number;
  /** SVG element bounding-rect left in client px (0 for pure content math). */
  readonly rectLeft: number;
  /** SVG element bounding-rect top in client px (0 for pure content math). */
  readonly rectTop: number;
}

/**
 * Immutable world <-> screen transform. Build one from the current view offsets
 * (and the SVG bounding rect when client-space is needed), then convert through
 * its space-named methods.
 */
export class ViewTransform {
  private readonly leftPaneWidth: number;
  private readonly contentTopOffsetPx: number;
  private readonly scrollX: number;
  private readonly scrollY: number;
  private readonly rectLeft: number;
  private readonly rectTop: number;

  /**
   * @param params - The offsets defining this transform. `rectLeft`/`rectTop`
   *   default to 0, which yields the content-space transform (no client shift).
   */
  public constructor(params: ViewTransformParams) {
    this.leftPaneWidth = params.leftPaneWidth;
    this.contentTopOffsetPx = params.contentTopOffsetPx;
    this.scrollX = params.scrollX;
    this.scrollY = params.scrollY;
    this.rectLeft = params.rectLeft;
    this.rectTop = params.rectTop;
  }

  /** World x -> SVG content x (the value written to an SVG `x`/path attribute). */
  public toContentX(worldX: number): number {
    return worldX - this.scrollX + this.leftPaneWidth;
  }

  /** World y -> SVG content y. */
  public toContentY(worldY: number): number {
    return worldY - this.scrollY + this.contentTopOffsetPx;
  }

  /** World point -> SVG content point. */
  public toContent(world: WorldPoint): ContentPoint {
    return { contentX: this.toContentX(world.worldX), contentY: this.toContentY(world.worldY) };
  }

  /** SVG content x -> world x (inverse of {@link toContentX}). */
  public fromContentX(contentX: number): number {
    return contentX + this.scrollX - this.leftPaneWidth;
  }

  /** SVG content y -> world y (inverse of {@link toContentY}). */
  public fromContentY(contentY: number): number {
    return contentY + this.scrollY - this.contentTopOffsetPx;
  }

  /** SVG content point -> world point (inverse of {@link toContent}). */
  public fromContent(content: ContentPoint): WorldPoint {
    return { worldX: this.fromContentX(content.contentX), worldY: this.fromContentY(content.contentY) };
  }

  /** World x -> client x (content x shifted by the SVG bounding-rect left). */
  public toClientX(worldX: number): number {
    return this.rectLeft + this.toContentX(worldX);
  }

  /** World y -> client y (content y shifted by the SVG bounding-rect top). */
  public toClientY(worldY: number): number {
    return this.rectTop + this.toContentY(worldY);
  }

  /** World point -> client point (e.g. the on-screen center of a laid-out item). */
  public toClient(world: WorldPoint): ClientPoint {
    return { clientX: this.toClientX(world.worldX), clientY: this.toClientY(world.worldY) };
  }

  /** Client x -> world x (inverse of {@link toClientX}). */
  public fromClientX(clientX: number): number {
    return clientX - this.rectLeft - this.leftPaneWidth + this.scrollX;
  }

  /** Client y -> world y (inverse of {@link toClientY}). */
  public fromClientY(clientY: number): number {
    return clientY - this.rectTop - this.contentTopOffsetPx + this.scrollY;
  }

  /** Client point -> world point (inverse of {@link toClient}). */
  public fromClient(client: ClientPoint): WorldPoint {
    return { worldX: this.fromClientX(client.clientX), worldY: this.fromClientY(client.clientY) };
  }
}
