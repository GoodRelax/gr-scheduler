/**
 * CR-014: the floating palette's icon system.
 *
 * The palette used to describe shapes with TEXT GLYPHS and EMOJI while the canvas drew
 * real SVG geometry -- two definitions of one shape, which drifted (`>>` looks nothing
 * like the drawn chevron banner). CR-014 makes every palette shape button a miniature
 * inline `<svg>` built by the SAME path builders the canvas uses, so these tests compare
 * the mounted button's path `d` against `taskGlyphPath` / `milestonePath` output for the
 * same shape: any future divergence between palette and canvas fails here.
 *
 * Also pinned: no emoji / text-glyph shape labels survive, TASK precedes MILESTONE
 * (CR-014 Part 3), the `LINE` group caption is gone (Part 2), and the silver-ratio
 * proportions (Part 4) actually reach the emitted stylesheet.
 *
 * The Vitest run is a DOM-free Node environment (no jsdom is installed), so -- matching
 * the `left-pane-interaction.test.ts` precedent -- a minimal fake DOM implements exactly
 * the surface the palette uses. The code under test is the REAL production code.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MilestoneShape, ScheduleItem, TaskShape } from '../src/domain/model/schedule-model.js';
import { mountShapePicker } from '../src/adapters/ui/tool-palette.js';
import {
  MILESTONE_CHOICES,
  SPECIAL_MILESTONE_CHOICES,
  TASK_CHOICES,
} from '../src/adapters/ui/tool-palette.js';
import {
  PALETTE_BUTTON_EDGE_PX,
  PALETTE_BUTTON_GAP_PX,
  PALETTE_BUTTON_PAD_PX,
  PALETTE_GLYPH_EDGE_PX,
  PALETTE_GROUP_GAP_PX,
  PALETTE_ICON_GRID,
  PALETTE_MILESTONE_CENTER,
  PALETTE_MILESTONE_RADIUS,
  PALETTE_COMMAND_ICON_PATHS,
  SILVER_RATIO,
  paletteProportionCss,
  paletteSilverRungPx,
  paletteTaskGlyphRect,
} from '../src/adapters/ui/palette-icon.js';
import { taskGlyphPath } from '../src/domain/usecase/task-glyph.js';
import { milestonePath } from '../src/adapters/render/item-geometry.js';
import { fadeTrapezoidPoints } from '../src/domain/usecase/fade-geometry.js';

/* ------------------------------------------------------------------ fake DOM -- */

/** Minimal stand-in for an Element covering only what the palette modules use. */
class FakeNode {
  public readonly tagName: string;
  public readonly namespaceURI: string | null;
  public readonly style: Record<string, string> = {};
  public readonly dataset: Record<string, string> = {};
  public readonly attributes: Record<string, string> = {};
  public readonly children: FakeNode[] = [];
  public readonly listeners: Record<string, Array<() => void>> = {};
  public className = '';
  public title = '';
  public type = '';
  private ownText = '';

  public constructor(tagName: string, namespaceURI: string | null = null) {
    this.tagName = tagName.toUpperCase();
    this.namespaceURI = namespaceURI;
  }

  /** Setting text clears children, like the real `Node.textContent` setter. */
  public set textContent(text: string) {
    this.children.length = 0;
    this.ownText = text;
  }

  public get textContent(): string {
    return this.ownText + this.children.map((child) => child.textContent).join('');
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  public appendChild(child: FakeNode): FakeNode {
    this.children.push(child);
    return child;
  }

  public append(...nodes: FakeNode[]): void {
    this.children.push(...nodes);
  }

  public insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    const index = reference === null ? -1 : this.children.indexOf(reference);
    if (index < 0) {
      this.children.push(node);
    } else {
      this.children.splice(index, 0, node);
    }
    return node;
  }

  public addEventListener(type: string, callback: () => void): void {
    (this.listeners[type] ??= []).push(callback);
  }

  /** Depth-first descendants (self excluded), in document order. */
  public descendants(): FakeNode[] {
    const found: FakeNode[] = [];
    for (const child of this.children) {
      found.push(child, ...child.descendants());
    }
    return found;
  }
}

let globalWithDom: { document?: unknown };

beforeEach(() => {
  globalWithDom = globalThis as unknown as { document?: unknown };
  globalWithDom.document = {
    createElement: (tagName: string): FakeNode => new FakeNode(tagName),
    createElementNS: (namespaceURI: string, tagName: string): FakeNode =>
      new FakeNode(tagName, namespaceURI),
  };
});

afterEach(() => {
  delete globalWithDom.document;
});

/* -------------------------------------------------------------------- helpers -- */

/** Mount the shape picker into a fresh fake palette container. */
function mountPalette(): FakeNode {
  const container = new FakeNode('div');
  mountShapePicker(container as unknown as HTMLElement, { onArmShape: () => undefined });
  return container;
}

/** All shape-arming buttons in the mounted palette, in DOM order. */
function shapeButtons(container: FakeNode): FakeNode[] {
  return container
    .descendants()
    .filter((node) => node.tagName === 'BUTTON' && node.dataset['shape'] !== undefined);
}

/** The single shape button that arms the given shape. */
function shapeButton(container: FakeNode, shape: string): FakeNode {
  const button = shapeButtons(container).find((node) => node.dataset['shape'] === shape);
  expect(button, `no palette button for shape "${shape}"`).toBeDefined();
  return button as FakeNode;
}

/** The `d` of the single `<path>` inside a button's icon `<svg>`. */
function iconPathD(button: FakeNode): string {
  const svg = button.children[0];
  expect(svg?.tagName).toBe('SVG');
  expect(svg?.getAttribute('data-role')).toBe('palette-icon');
  const path = svg?.children[0];
  expect(path?.tagName).toBe('PATH');
  return path?.getAttribute('d') ?? '';
}

/** A minimal milestone item carrying only the shape the canvas builder resolves. */
function milestoneItemOfShape(shape: MilestoneShape): ScheduleItem {
  return { iconShapeKind: shape } as unknown as ScheduleItem;
}

/** Index of a group's `data-role` among the shapes row's children. */
function groupIndex(container: FakeNode, role: string): number {
  const shapesRow = container
    .descendants()
    .find((node) => node.dataset['role'] === 'shape-groups') as FakeNode;
  expect(shapesRow, 'shapes row missing').toBeDefined();
  return shapesRow.children.findIndex((child) => child.dataset['role'] === role);
}

/** Every emoji / text glyph CR-014 removed from the palette. */
const REMOVED_PALETTE_GLYPHS: readonly string[] = [
  // Task shapes (bar / arrow / chevron / span).
  '▭',
  '→',
  '»',
  '|—|',
  // Base milestone shapes.
  'Δ',
  '□',
  '◇',
  '☆',
  // The seven CR-004 special milestone emoji.
  '📄',
  '📦',
  '💾',
  '🛢',
  '👤',
  '🙂',
  '🍺',
];

/* ---------------------------------------------------------------------- specs -- */

describe('CR-014 Part 1: palette shape icons come from the CANVAS builders', () => {
  it('draws every TASK shape with taskGlyphPath geometry (no text glyph)', () => {
    const container = mountPalette();
    for (const shape of TASK_CHOICES.filter((choice): choice is TaskShape => choice !== 'bar')) {
      const button = shapeButton(container, shape);
      expect(iconPathD(button)).toBe(taskGlyphPath(shape, paletteTaskGlyphRect(shape)));
    }
  });

  it('draws the `bar` task from the shared fade-polygon builder', () => {
    const container = mountPalette();
    const rect = paletteTaskGlyphRect('bar');
    const expected = fadeTrapezoidPoints({
      startDay: 0,
      endDay: 1,
      fadeInDays: 0,
      fadeOutDays: 0,
      top: rect.y,
      bottom: rect.y + rect.height,
      dayToX: (day) => rect.x + day * rect.width,
    })
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    expect(iconPathD(shapeButton(container, 'bar'))).toBe(`${expected} Z`);
  });

  it('draws EVERY milestone shape -- base five and special seven -- with milestonePath', () => {
    const container = mountPalette();
    const allShapes: readonly MilestoneShape[] = [
      ...MILESTONE_CHOICES,
      ...SPECIAL_MILESTONE_CHOICES,
    ];
    expect(allShapes).toHaveLength(12);
    for (const shape of allShapes) {
      const expected = milestonePath(
        milestoneItemOfShape(shape),
        PALETTE_MILESTONE_CENTER,
        PALETTE_MILESTONE_CENTER,
        PALETTE_MILESTONE_RADIUS,
      );
      expect(expected.length, `empty canvas path for ${shape}`).toBeGreaterThan(0);
      expect(iconPathD(shapeButton(container, shape))).toBe(expected);
    }
  });

  it('keeps the CR-004 special seven as EVEN-ODD outlines, not emoji', () => {
    const container = mountPalette();
    for (const shape of SPECIAL_MILESTONE_CHOICES) {
      const path = shapeButton(container, shape).children[0]?.children[0] as FakeNode;
      expect(path.getAttribute('fill')).toBe('none');
      expect(path.getAttribute('fill-rule')).toBe('evenodd');
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it("fills a span's terminals, mirroring the canvas paint mode", () => {
    const container = mountPalette();
    const path = shapeButton(container, 'span').children[0]?.children[0] as FakeNode;
    expect(path.getAttribute('fill')).toBe('currentColor');
  });

  it('leaves NO emoji or text-glyph label on any shape button', () => {
    const container = mountPalette();
    const buttons = shapeButtons(container);
    // 4 task + 5 base milestone + 7 special milestone shapes.
    expect(buttons).toHaveLength(16);
    for (const button of buttons) {
      // The icon svg contributes no text, so the button's own label is empty.
      expect(button.textContent).toBe('');
      expect(button.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
    }
    const paletteText = container.textContent;
    for (const glyph of REMOVED_PALETTE_GLYPHS) {
      expect(paletteText, `palette still shows the removed glyph ${glyph}`).not.toContain(glyph);
    }
  });

  it('gives the bespoke (no canvas counterpart) commands ASCII-only line-art paths', () => {
    const names = Object.keys(PALETTE_COMMAND_ICON_PATHS);
    expect(names).toContain('progress-line');
    expect(names).toContain('comment');
    expect(names).toContain('add-box');
    expect(names).toContain('watermark');
    for (const [name, pathD] of Object.entries(PALETTE_COMMAND_ICON_PATHS)) {
      expect(pathD.length, `empty icon path for ${name}`).toBeGreaterThan(0);
      // Path data only: SVG commands, numbers, separators -- never a glyph character.
      expect(pathD, `non path-data character in ${name}`).toMatch(/^[MLAQCHVZmlaqchvz0-9.\- ]+$/);
    }
    // The progress line (inazuma) must be a ZIGZAG polyline, not the lightning emoji:
    // at least three vertices, so it changes direction.
    const zigzagVertexCount = (PALETTE_COMMAND_ICON_PATHS['progress-line'].match(/[ML]/g) ?? [])
      .length;
    expect(zigzagVertexCount).toBeGreaterThanOrEqual(3);
  });
});

describe('CR-014 Part 3: TASK group sits LEFT of the MILESTONE group', () => {
  it('orders the shapes row task-first', () => {
    const container = mountPalette();
    const taskIndex = groupIndex(container, 'task-shapes');
    const milestoneIndex = groupIndex(container, 'milestone-shapes');
    expect(taskIndex).toBeGreaterThanOrEqual(0);
    expect(milestoneIndex).toBeGreaterThanOrEqual(0);
    expect(taskIndex).toBeLessThan(milestoneIndex);
  });

  it('emits every task button before every milestone button in DOM order', () => {
    const container = mountPalette();
    const order = shapeButtons(container).map((button) => button.dataset['shape']);
    const lastTaskIndex = Math.max(...TASK_CHOICES.map((shape) => order.indexOf(shape)));
    const firstMilestoneIndex = Math.min(
      ...MILESTONE_CHOICES.map((shape) => order.indexOf(shape)),
    );
    expect(lastTaskIndex).toBeLessThan(firstMilestoneIndex);
  });
});

describe('CR-014 Part 2: the LINE group caption is gone', () => {
  it('renders no group caption reading LINE anywhere in the shape picker', () => {
    const container = mountPalette();
    const captions = container
      .descendants()
      .filter((node) => node.className === 'grsch-cmd-group-label')
      .map((node) => node.textContent.trim().toUpperCase());
    expect(captions).not.toContain('LINE');
  });
});

describe('CR-014 Part 4: silver-ratio proportions', () => {
  it('derives the glyph edge from the button edge by exactly one silver step', () => {
    expect(SILVER_RATIO).toBeCloseTo(1.414, 3);
    expect(PALETTE_GLYPH_EDGE_PX * SILVER_RATIO).toBeCloseTo(PALETTE_BUTTON_EDGE_PX, 6);
    expect(PALETTE_GLYPH_EDGE_PX).toBeCloseTo(paletteSilverRungPx(1), 6);
    expect(PALETTE_GROUP_GAP_PX).toBeCloseTo(paletteSilverRungPx(3), 6);
    expect(PALETTE_BUTTON_GAP_PX).toBeCloseTo(paletteSilverRungPx(5), 6);
    // The group gap is wider than the in-group gap, so groups read as groups.
    expect(PALETTE_GROUP_GAP_PX).toBeGreaterThan(PALETTE_BUTTON_GAP_PX);
    // Padding is the leftover ring, not a free value.
    expect(PALETTE_BUTTON_PAD_PX * 2 + PALETTE_GLYPH_EDGE_PX).toBeCloseTo(
      PALETTE_BUTTON_EDGE_PX,
      6,
    );
  });

  it('applies the ladder to the emitted palette stylesheet', () => {
    const css = paletteProportionCss('grsch-command-palette');
    const round2 = (value: number): string => (Math.round(value * 100) / 100).toString();
    expect(css).toContain(`min-width: ${round2(PALETTE_BUTTON_EDGE_PX)}px`);
    expect(css).toContain(`min-height: ${round2(PALETTE_BUTTON_EDGE_PX)}px`);
    expect(css).toContain(`padding: 0 ${round2(PALETTE_BUTTON_PAD_PX)}px`);
    expect(css).toContain(
      `gap: ${round2(PALETTE_BUTTON_GAP_PX)}px ${round2(PALETTE_GROUP_GAP_PX)}px`,
    );
    expect(css).toContain(`width: ${round2(PALETTE_GLYPH_EDGE_PX)}px`);
    // Grey rounded chrome is owned by the base sheet; the ratio sheet must not
    // introduce a border (the black frames in the reference image were an artifact).
    expect(css).not.toContain('border:');
  });

  it('renders each icon at the glyph rung inside the shared design grid', () => {
    const container = mountPalette();
    const svg = shapeButton(container, 'bar').children[0] as FakeNode;
    const round2 = (value: number): string => (Math.round(value * 100) / 100).toString();
    expect(svg.getAttribute('width')).toBe(round2(PALETTE_GLYPH_EDGE_PX));
    expect(svg.getAttribute('height')).toBe(round2(PALETTE_GLYPH_EDGE_PX));
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${PALETTE_ICON_GRID} ${PALETTE_ICON_GRID}`);
    // Decorative: the accessible name lives on the button (WCAG 1.1.1 / 4.1.2).
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });
});

describe('CR-014 regression guard: accessible names and roles are unchanged', () => {
  it('keeps the localized "kind shape" accessible name on every shape button', () => {
    const container = mountPalette();
    expect(shapeButton(container, 'bar').getAttribute('aria-label')).toBe('Task bar');
    expect(shapeButton(container, 'chevron').getAttribute('aria-label')).toBe('Task chevron');
    expect(shapeButton(container, 'diamond').getAttribute('aria-label')).toBe('Milestone diamond');
    expect(shapeButton(container, 'beer').getAttribute('aria-label')).toBe('Milestone beer');
  });

  it('keeps the special-milestone expander and its group roles', () => {
    const container = mountPalette();
    const roles = container.descendants().map((node) => node.dataset['role']);
    expect(roles).toContain('shape-groups');
    expect(roles).toContain('special-milestone-shapes');
    expect(roles).toContain('special-milestone-expander');
    expect(roles).toContain('armed-readout');
  });
});
