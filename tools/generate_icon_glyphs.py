# -*- coding: utf-8 -*-
"""Write the shapes of figure F-019 into src/.

    python tools/generate_icon_glyphs.py
    python tools/generate_icon_glyphs.py --check

FR-029 (MUST) makes figure F-019 the authority for every icon's shape and
forbids replacing those shapes with a third party's set (MUST NOT). That figure
is `docs/spec/_assets/fig-icons.svg`, and nothing carried it into `src/` the way
`tools/generate_icon_roster.py` carries table T-109 -- so UF-71 printed the row
id where a shape belongs, and said so in two comments of its own. This script is
the way the shapes arrive, and `npm run gen:check` is what fails when the figure
moves on without them.

⛔ NOT ONE PATH IS RE-DRAWN, RE-SCALED OR TIDIED. The figure is the authority;
this script only carries it. Every element keeps the tag it was drawn with and
every attribute it was drawn with, character for character. The one attribute
that changes SPELLING is `class`: the figure paints through a stylesheet, and a
carried shape has no stylesheet, so each element leaves here with the very
declarations its own classes hold, as a `style` attribute. ⛔ No declaration is
invented and none is dropped -- a class this script has no rule for stops it.

⛔ THE FIGURE'S OWN COLOUR IS NOT CARRIED. Its stylesheet paints `svg { color }`
and switches that on the viewer's light/dark preference; the app has a theme of
its own (`FR-041`) and system colours of its own, so what travels is
`currentColor` -- the shapes take whatever colour the surface that draws them is
already using. ⛔ The media query stays in the figure. This script refuses to
carry any rule of one, so it cannot leak into the app by accident.

⭐ THE FIGURE AND TABLE T-109 ARE CROSS-CHECKED, the way
`generate_icon_roster.py` cross-checks that table's stated count. §8 of
`_assets/tbl-glossary.md` states 「図形を持たない行は無い」 for all of table
T-109, so a row with no shape and a shape with no row are both drift, and both
stop this script before it writes anything.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIGURE = os.path.join(ROOT, 'docs', 'spec', '_assets', 'fig-icons.svg')
GLOSSARY = os.path.join(ROOT, 'docs', 'spec', '_assets', 'tbl-glossary.md')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'icon-glyphs.json')

REL_FIGURE = 'docs/spec/_assets/fig-icons.svg'
REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
REL_OUT = 'src/adapter/screen-renderer/icon-glyphs.json'
REL_SELF = 'tools/generate_icon_glyphs.py'

ICON_TABLE = 'T-109'
FIGURE_ID = 'F-019'

# The same two needles `generate_icon_roster.py` reads table T-109 with: the
# shape of a row id, and the caption that names the table.
ICON_ROW = re.compile(r'^\| (IC-\d+[a-z]?) \|')

# ⚠️ The one Japanese needle here, and rule 03 section 5 allows it because the
# thing being parsed IS Japanese: the manuscript states the height of table
# T-109 in a sentence of its own prose. ⛔ Writing the number here instead is
# the drift this script exists to stop.
STATED_COUNT = re.compile(r'(\d+)\s*行ある')

STYLE_BLOCK = re.compile(r'<style>(.*?)</style>', re.S)
MEDIA_BLOCK = re.compile(r'@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}', re.S)
CSS_RULE = re.compile(r'([^{}]+)\{([^{}]*)\}', re.S)
CLASS_SELECTOR = re.compile(r'^\.([A-Za-z][\w-]*)$')

# One glyph: the group that holds it and the label printed under it. §8 of the
# glossary says the join is the row id and that the figure prints it under each
# shape, so nothing here looks anywhere else for which row a group is.
GLYPH = re.compile(
    r'<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">(.*?)</g>\s*'
    r'<text class="lbl" x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)</text>', re.S)

GROUP_OPEN = re.compile(r'<g[\s>]')
ELEMENT = re.compile(r'<([a-z]+)((?:\s+[\w:.-]+="[^"]*")*)\s*/>')
ATTRIBUTE = re.compile(r'([\w:.-]+)="([^"]*)"')
ANY_TAG = re.compile(r'<[^>]*>')

# What a glyph may be drawn out of. ⛔ Deliberately a list and not "whatever the
# figure holds": a tag this script does not know how to carry -- one that brings
# its own children, or a `<use>` that points somewhere -- would be carried as an
# empty shell and drawn as nothing at all.
DRAWABLE = ('path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon')

# The attribute the carried declarations leave as, and the one they came from.
STYLE_ATTRIBUTE = 'style'
CLASS_ATTRIBUTE = 'class'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, figure %s (the '
    'authority for every icon shape, FR-029), cross-checked against table %s of '
    '%s so that neither can move without the other. Rebuild: npm run gen -- npm '
    'run gen:check fails on drift. The generator is %s. Each shape is carried as '
    'it was drawn: the figure paints through a stylesheet, so each element '
    'leaves with the declarations its own classes held, and the colour is '
    'currentColor because the app has a theme of its own (FR-041).'
    % (REL_FIGURE, FIGURE_ID, ICON_TABLE, REL_GLOSSARY, REL_SELF))


def read_text(path):
    """One file, whole."""
    # @purity semi-pure-b
    return io.open(path, encoding='utf-8').read()


def cells(line):
    """The cells of one Markdown table row."""
    # @purity pure
    return [c.strip() for c in line.strip().strip('|').split('|')]


def table_rows(lines, row_pattern, table_id):
    """The body rows and the caption line of one table.

    Fails when the table is absent, when its rows are not one unbroken run, or
    when the caption above them names something else -- all three of which mean
    the reader below would be guessing at which table it has.
    """
    # @purity pure
    body = [i for i, line in enumerate(lines) if row_pattern.match(line)]
    if not body:
        sys.exit('generate_icon_glyphs: %s holds no row of table %s'
                 % (REL_GLOSSARY, table_id))
    first, last = body[0], body[-1]
    if body != list(range(first, last + 1)):
        sys.exit('generate_icon_glyphs: the rows of table %s do not form one '
                 'run of lines in %s' % (table_id, REL_GLOSSARY))
    if first < 3:
        sys.exit('generate_icon_glyphs: table %s starts at line %d of %s, with '
                 'no room above it for a header and a caption'
                 % (table_id, first + 1, REL_GLOSSARY))
    ruler = set(lines[first - 1].replace('|', '').replace(' ', ''))
    if ruler != set('-'):
        sys.exit('generate_icon_glyphs: table %s has no header ruler above its '
                 'first row in %s' % (table_id, REL_GLOSSARY))
    caption = first - 3
    while caption > 0 and not lines[caption].strip():
        caption -= 1
    if table_id not in lines[caption]:
        sys.exit('generate_icon_glyphs: the rows that look like table %s sit '
                 'under a caption that does not name it (line %d of %s)'
                 % (table_id, caption + 1, REL_GLOSSARY))
    return [cells(lines[i])[0] for i in body], caption


def stated_row_count(lines, caption):
    """The height table T-109 claims for itself, from the prose above it."""
    # @purity pure
    start = caption
    while start > 0 and not lines[start].startswith('## '):
        start -= 1
    found = STATED_COUNT.findall('\n'.join(lines[start:caption]))
    if len(found) != 1:
        sys.exit('generate_icon_glyphs: the prose above table %s in %s states a '
                 'row count %d time(s), and exactly one sentence must'
                 % (ICON_TABLE, REL_GLOSSARY, len(found)))
    return int(found[0])


def roster_rows():
    """Every row id of table T-109, in that table's own order."""
    # @purity semi-pure-b
    lines = read_text(GLOSSARY).split('\n')
    rows, caption = table_rows(lines, ICON_ROW, ICON_TABLE)
    wanted = stated_row_count(lines, caption)
    if len(rows) != wanted:
        sys.exit('generate_icon_glyphs: table %s holds %d row(s), and the '
                 'sentence above it in %s says %d'
                 % (ICON_TABLE, len(rows), REL_GLOSSARY, wanted))
    if len(set(rows)) != len(rows):
        sys.exit('generate_icon_glyphs: table %s uses %d row id(s) for %d row(s)'
                 % (ICON_TABLE, len(set(rows)), len(rows)))
    return rows


def declarations(body):
    """One rule's declarations, each normalised to a single line."""
    # @purity pure
    out = []
    for one in body.split(';'):
        text = re.sub(r'\s+', ' ', one).strip()
        if text:
            out.append(text)
    return out


def paint_rules(figure):
    """The figure's class rules, in the order the stylesheet states them.

    Answers a list of (class name, declarations) rather than a mapping, because
    an element that names two classes takes them in the sheet's order and a
    mapping would lose it.
    """
    # @purity pure
    blocks = STYLE_BLOCK.findall(figure)
    if len(blocks) != 1:
        sys.exit('generate_icon_glyphs: %s holds %d <style> block(s) and this '
                 'script reads exactly one' % (REL_FIGURE, len(blocks)))
    sheet = blocks[0]

    # ⛔ A rule inside a media query is never carried. The figure switches its
    # own colour on the viewer's light/dark preference and the app must not
    # inherit that switch (FR-041), so a media query that reached a SHAPE would
    # be drift this script cannot resolve -- it stops instead.
    for query in MEDIA_BLOCK.findall(sheet):
        for selector, _body in CSS_RULE.findall(query[query.index('{') + 1:]):
            if CLASS_SELECTOR.match(selector.strip()):
                sys.exit('generate_icon_glyphs: %s paints %s from inside a media '
                         'query, and a shape carried into the app may not bring '
                         'one' % (REL_FIGURE, selector.strip()))
    sheet = MEDIA_BLOCK.sub('', sheet)

    rules = []
    for selector, body in CSS_RULE.findall(sheet):
        name = selector.strip()
        hit = CLASS_SELECTOR.match(name)
        if hit is None:
            # ⛔ Not carried, and only safe while it cannot reach a shape: the
            # figure's `svg { color }` is exactly such a rule, and dropping it
            # is what leaves `currentColor` for the app to answer.
            if name in DRAWABLE or name == '*':
                sys.exit('generate_icon_glyphs: %s paints %r, which reaches a '
                         'shape without naming a class, and this script can '
                         'only carry a class' % (REL_FIGURE, name))
            continue
        rules.append((hit.group(1), declarations(body)))
    if not rules:
        sys.exit('generate_icon_glyphs: %s states no class rule, so no shape '
                 'could be painted' % REL_FIGURE)
    return rules


def carried_element(tag, attributes, rules, row_id):
    """One drawable element, with its classes turned into its own declarations."""
    # @purity pure
    if tag not in DRAWABLE:
        sys.exit('generate_icon_glyphs: %s is drawn with a <%s>, which this '
                 'script does not know how to carry' % (row_id, tag))
    names = dict(attributes)
    if STYLE_ATTRIBUTE in names:
        sys.exit('generate_icon_glyphs: a shape of %s already carries a style '
                 'attribute, and this script has nowhere to put the classes'
                 % row_id)
    classes = names.pop(CLASS_ATTRIBUTE, '').split()
    if not classes:
        sys.exit('generate_icon_glyphs: a <%s> of %s names no class, so nothing '
                 'in %s says how it is painted' % (tag, row_id, REL_FIGURE))
    painted = []
    for name, body in rules:
        if name in classes:
            painted.extend(body)
    unpainted = [one for one in classes
                 if one not in set(name for name, _body in rules)]
    if unpainted:
        sys.exit('generate_icon_glyphs: a <%s> of %s names the class(es) %s, '
                 'which %s states no rule for'
                 % (tag, row_id, ', '.join(unpainted), REL_FIGURE))
    kept = [{'name': key, 'value': value} for key, value in attributes
            if key != CLASS_ATTRIBUTE]
    kept.append({'name': STYLE_ATTRIBUTE, 'value': '; '.join(painted)})
    return {'tag': tag, 'attributes': kept}


def glyph_of(body, row_id, rules):
    """The drawable content of one group, and nothing else."""
    # @purity pure
    elements = []
    for hit in ELEMENT.finditer(body):
        elements.append(carried_element(
            hit.group(1), ATTRIBUTE.findall(hit.group(2)), rules, row_id))
    # ⛔ Everything the group holds has to have been carried. A tag this script
    # skipped would be a part of the shape silently missing from the copy.
    left = ANY_TAG.sub('', ELEMENT.sub('', body)).strip()
    if left or len(ANY_TAG.findall(body)) != len(elements):
        sys.exit('generate_icon_glyphs: the group of %s in %s holds something '
                 'this script did not carry' % (row_id, REL_FIGURE))
    if not elements:
        sys.exit('generate_icon_glyphs: the group of %s in %s is empty'
                 % (row_id, REL_FIGURE))
    return elements


def figure_glyphs():
    """Every shape of figure F-019, by the row id printed under it, with its box."""
    # @purity semi-pure-b
    figure = read_text(FIGURE)
    rules = paint_rules(figure)
    found = GLYPH.findall(figure)
    groups = len(GROUP_OPEN.findall(figure))
    if len(found) != groups:
        sys.exit('generate_icon_glyphs: %s holds %d group(s) and %d of them are '
                 'a shape with a row id printed under it'
                 % (REL_FIGURE, groups, len(found)))
    glyphs = {}
    sizes = set()
    for left, top, body, label_x, label_y, row_id in found:
        if row_id in glyphs:
            sys.exit('generate_icon_glyphs: %s prints %s under two shapes'
                     % (REL_FIGURE, row_id))
        # ⭐ THE BOX IS MEASURED, NEVER TYPED. The figure centres each label
        # under its own shape, so twice the distance from the group's left edge
        # to that centre IS the width of the cell the shape was drawn in.
        size = 2 * (float(label_x) - float(left))
        if float(label_y) <= float(top):
            sys.exit('generate_icon_glyphs: %s prints the label of %s above its '
                     'shape, so the cell cannot be measured'
                     % (REL_FIGURE, row_id))
        sizes.add(size)
        glyphs[row_id] = glyph_of(body, row_id, rules)
    if len(sizes) != 1:
        sys.exit('generate_icon_glyphs: %s draws its shapes in %d different '
                 'cell widths (%s), and one box has to hold them all'
                 % (REL_FIGURE, len(sizes),
                    ', '.join(repr(one) for one in sorted(sizes))))
    size = sizes.pop()
    return glyphs, ('%g %g %g %g' % (0, 0, size, size))


def build():
    """The shapes, as they are written out."""
    # @purity semi-pure-b
    rows = roster_rows()
    glyphs, view_box = figure_glyphs()

    without_shape = [one for one in rows if one not in glyphs]
    if without_shape:
        sys.exit('generate_icon_glyphs: table %s holds %d row(s) that %s draws '
                 'no shape for (%s), and the glossary says every row has one'
                 % (ICON_TABLE, len(without_shape), REL_FIGURE,
                    ', '.join(without_shape)))
    without_row = [one for one in sorted(glyphs) if one not in rows]
    if without_row:
        sys.exit('generate_icon_glyphs: %s draws %d shape(s) for a row table %s '
                 'does not hold (%s)'
                 % (REL_FIGURE, len(without_row), ICON_TABLE,
                    ', '.join(without_row)))

    return {
        '$comment': BANNER,
        'viewBox': view_box,
        # In table T-109's own order, which is the order the roster beside this
        # artifact is written in.
        'glyphs': [{'rowId': one, 'elements': glyphs[one]} for one in rows],
    }


def main():
    """Write the shapes, or say whether the ones on disk still match."""
    # @purity non-pure
    shapes = build()
    body = json.dumps(shapes, ensure_ascii=False, indent=1) + '\n'
    count = len(shapes['glyphs'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its figure -- '
                             'run `python %s`\n' % (REL_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the icon glyphs match figure %s '
                         '(%d shape(s))\n' % (FIGURE_ID, count))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d shape(s), %d byte(s))\n'
                     % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
