# -*- coding: utf-8 -*-
"""Write the chart's milestone shapes (figure F-044) into src/, after checking
them against the palette's glyphs (figure F-019).

    python tools/generate_milestone_shapes.py
    python tools/generate_milestone_shapes.py --check

CR-583 put the chart's fifteen milestone shapes into the specification as a
figure of their own, `docs/spec/_assets/fig-milestone-shapes.svg` (figure
F-044): each shape is drawn in the unit square [-1, 1] x [-1, 1] with the centre
of its bounding box at the origin (LF-10 of table T-221), as a list of layers
whose class is the layer's role (LF-18): `body` (filled, outlined), `inner` (a
line on the fill), `dot` (a filled point) and `shade` (a partly filled face).
Before that, the chart's shapes lived only in the code and the palette's glyphs
only in figure F-019, and nothing held the two together -- the glyph drew two
people where the chart drew one.

WHAT THIS SCRIPT CHECKS BEFORE IT WRITES A BYTE.

  1. Figure F-044 draws exactly the spellings `_source/erd.json` settles for
     `TaskVisual.milestoneGlyph`, once each and in that order (SH-5's order).
  2. Every shape lies inside the unit square, and the centre of its bounding
     box is the origin, on both axes (LF-10). The box is the geometry's; a
     stroke has no width in unit coordinates.
  3. Every shape is the glyph figure F-019 draws for the same spelling (the row
     of table T-109 that arms it, AR-3), element by element: the same tag, the
     class LF-18 gives its role in a line drawing (ROLE_CLASS), and every number
     within the figure's own precision once the unit shape is scaled into the
     glyph's cell. ⛔ LF-18 allows exactly two differences, and they are the only
     elements whose numbers are not compared (ALLOWED): the beer mug's handle
     (one line in the glyph) and the person's shoulders (stopped at the head in
     the glyph, which has no fill to hide them behind).

⭐ THE SCALE IS READ, NEVER TYPED. The geometric shapes keep the glyph's circle
(IC-27): the centre of the cell and the scale are that circle's centre and its
radius over the unit circle's. The pictures keep the floppy disk's height
(IC-85): their scale is the glyph's floppy height over the unit floppy height.
Which shapes are geometric is SH-5's order: the first eight (FR-078).

WHAT IT WRITES: `src/entity/layout-engine/schedule-geometry/milestone-shapes.json`,
the chart's shape table, one entry per spelling with its layers as SVG path
data in unit coordinates (a circle and a rect are written as the path they
draw) -- the table the chart's geometry reads instead of holding the shapes
itself. ⭐ It also writes the marked region of
`src/entity/layout-engine/schedule-geometry/schedule-geometry.ts`: the union
`MilestoneLayerRole` of the roles above (ROLE_CLASS, the roles LF-18 names and
this script checks the figure against), because the JSON import widens `role`
to a string and a hand-written union would drift (DFC-1227, check 69).

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

import generate_icon_glyphs
import generate_icon_roster

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIGURE = os.path.join(ROOT, 'docs', 'spec', '_assets', 'fig-milestone-shapes.svg')
OUT = os.path.join(ROOT, 'src', 'entity', 'layout-engine', 'schedule-geometry',
                   'milestone-shapes.json')

REL_FIGURE = 'docs/spec/_assets/fig-milestone-shapes.svg'
REL_OUT = 'src/entity/layout-engine/schedule-geometry/milestone-shapes.json'
# DFC-1227: the layer roles as a TS union, so src/ reads them instead of
# writing them again (check 69). The region between the two markers is ours;
# the rest of the unit is written by hand.
REL_UNIT = 'src/entity/layout-engine/schedule-geometry/schedule-geometry.ts'
UNIT = os.path.join(ROOT, *REL_UNIT.split('/'))
OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
REGION = re.compile(re.escape(OPEN) + r'\n.*?' + re.escape(CLOSE), re.S)
REL_SELF = 'tools/generate_milestone_shapes.py'
FIGURE_ID = 'F-044'
GLYPH_FIGURE_ID = 'F-019'

# The class each role of figure F-044 is drawn with in figure F-019, where every
# glyph is a line drawing (LF-18): an outline or a line is a stroke, a dot is a
# filled point, and a shaded face is a partly filled one.
ROLE_CLASS = {'body': 's', 'inner': 's', 'dot': 'f', 'shade': 'h'}

# ⛔ The two differences LF-18 of table T-221 allows, by spelling and by the
# index of the element in the shape. Tag and class are still compared.
ALLOWED = {
    ('beerMug', 0): 'the handle is one line in the glyph',
    ('person', 0): 'the shoulders stop at the head in the glyph',
}

# The shapes whose size is the glyph circle's radius; the rest keep the floppy
# disk's height. FR-078 orders SH-5 so that the first eight are the geometric
# ones, and figure F-019's note says the same of its glyphs.
GEOMETRIC_COUNT = 8
CIRCLE = 'circle'
FLOPPY = 'floppyDisk'

# The figure's own precision: F-019 states no coordinate past two decimals.
TOLERANCE = 0.01
# How far from the origin the centre of a bounding box may stand: rounding of
# the figure's four decimals, and nothing more.
CENTRE_TOLERANCE = 0.0005

SHAPE = re.compile(
    r'<g transform="translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)">(.*?)</g>\s*'
    r'<text class="lbl" x="(-?[\d.]+)" y="(-?[\d.]+)">([A-Za-z]+)</text>', re.S)
GROUP_OPEN = re.compile(r'<g[\s>]')
DRAWN = ('path', 'circle', 'rect')
KEPT_ATTRIBUTES = {
    'path': ('d', 'fill-rule'),
    'circle': ('cx', 'cy', 'r'),
    'rect': ('x', 'y', 'width', 'height'),
}
ABSOLUTE = set('MLHVQAZ')

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, figure %s (the '
    'authority for the chart\'s milestone shapes, LF-10 and LF-18 of table '
    'T-221), after checking every shape against the glyph figure %s draws for '
    'the same spelling. Rebuild: npm run gen -- npm run gen:check fails on '
    'drift. The generator is %s. Each shape is in the unit square with the '
    'centre of its bounding box at the origin; each layer is SVG path data '
    'with its role (body, inner, dot, shade).'
    % (REL_FIGURE, FIGURE_ID, GLYPH_FIGURE_ID, REL_SELF))


def fail(message):
    """Stop, naming the drift, and write nothing."""
    # @purity non-pure
    sys.exit('generate_milestone_shapes: ' + message)


def trimmed(value):
    """A number the way the figures write theirs."""
    # @purity pure
    text = ('%.6f' % value).rstrip('0').rstrip('.')
    return '0' if text in ('-0', '') else text


def elements_of(body, where, class_attribute_is_role):
    """(tag, class, {attribute: value}) for every element of one group."""
    # @purity pure
    found = []
    for hit in generate_icon_glyphs.ELEMENT.finditer(body):
        tag = hit.group(1)
        values = dict(generate_icon_glyphs.ATTRIBUTE.findall(hit.group(2)))
        name = values.pop('class', '')
        if class_attribute_is_role and name not in ROLE_CLASS:
            fail('an element of %s names the role %r, and %s knows only %s'
                 % (where, name, REL_FIGURE, ', '.join(sorted(ROLE_CLASS))))
        found.append((tag, name, values))
    left = generate_icon_glyphs.ANY_TAG.sub(
        '', generate_icon_glyphs.ELEMENT.sub('', body)).strip()
    if left or len(generate_icon_glyphs.ANY_TAG.findall(body)) != len(found):
        fail('the group of %s holds something this script cannot read' % where)
    if not found:
        fail('the group of %s is empty' % where)
    return found


def steps_of(d, where):
    """[(letter, [numbers])] of one path, absolute commands only."""
    # @purity pure
    out = []
    for letter, arguments in generate_icon_glyphs.PATH_STEP.findall(d.strip()):
        if letter not in ABSOLUTE:
            fail('a path of %s uses the command %r; only absolute commands are '
                 'compared' % (where, letter))
        out.append((letter, generate_icon_glyphs.path_numbers(arguments, letter, where)))
    if not out:
        fail('a path of %s draws nothing' % where)
    return out


def box_of(element, where):
    """The box one unit element's geometry spans."""
    # @purity pure
    tag, _role, values = element
    if tag == 'path':
        return generate_icon_glyphs.path_extent(values['d'], where)
    if tag == 'circle':
        cx, cy, r = (float(values[one]) for one in ('cx', 'cy', 'r'))
        return (cx - r, cy - r, cx + r, cy + r)
    x, y, w, h = (float(values[one]) for one in ('x', 'y', 'width', 'height'))
    return (x, y, x + w, y + h)


def read_shapes():
    """Figure F-044: every shape by its spelling, in the figure's order."""
    # @purity semi-pure-b
    figure = io.open(FIGURE, encoding='utf-8').read()
    found = SHAPE.findall(figure)
    if len(found) != len(GROUP_OPEN.findall(figure)):
        fail('%s holds %d group(s) and %d of them are a shape with its spelling '
             'printed under it' % (REL_FIGURE, len(GROUP_OPEN.findall(figure)),
                                   len(found)))
    shapes = []
    for _x, _y, _scale, body, _lx, _ly, glyph in found:
        elements = elements_of(body, '%s in %s' % (glyph, REL_FIGURE), True)
        for tag, _role, values in elements:
            if tag not in DRAWN:
                fail('%s in %s is drawn with a <%s>' % (glyph, REL_FIGURE, tag))
            extra = [one for one in values if one not in KEPT_ATTRIBUTES[tag]]
            if extra:
                fail('a <%s> of %s in %s carries %s, which this script does not '
                     'carry' % (tag, glyph, REL_FIGURE, ', '.join(extra)))
        shapes.append((glyph, elements))
    return shapes


def check_frame(glyph, elements):
    """LF-10: inside the unit square, the centre of the box at the origin."""
    # @purity pure
    where = '%s in %s' % (glyph, REL_FIGURE)
    box = None
    for element in elements:
        box = generate_icon_glyphs.joined(box, box_of(element, where))
    if box[0] < -1 - CENTRE_TOLERANCE or box[1] < -1 - CENTRE_TOLERANCE \
            or box[2] > 1 + CENTRE_TOLERANCE or box[3] > 1 + CENTRE_TOLERANCE:
        fail('%s leaves the unit square (box %s)'
             % (where, ' '.join(trimmed(one) for one in box)))
    centre = ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)
    if abs(centre[0]) > CENTRE_TOLERANCE or abs(centre[1]) > CENTRE_TOLERANCE:
        fail('the bounding box of %s is centred on (%s, %s), and LF-10 puts it '
             'on the origin' % (where, trimmed(centre[0]), trimmed(centre[1])))


def glyph_elements():
    """Figure F-019: the elements of every milestone glyph, by spelling."""
    # @purity semi-pure-b
    icons = generate_icon_roster.build()['icons']
    row_of = {}
    for icon in icons:
        if icon['arms'] == generate_icon_roster.MILESTONE_SHAPE_ARM:
            row_of[icon[generate_icon_roster.ARMS_SHAPE_FIELD]] = icon['rowId']
    figure = io.open(generate_icon_glyphs.FIGURE, encoding='utf-8').read()
    drawn = {}
    for _x, _y, body, _lx, _ly, row_id in generate_icon_glyphs.GLYPH.findall(figure):
        drawn[row_id] = body
    out = {}
    for glyph, row_id in row_of.items():
        if row_id not in drawn:
            fail('%s arms %s, and figure %s draws no glyph for it'
                 % (row_id, glyph, GLYPH_FIGURE_ID))
        out[glyph] = (row_id, elements_of(
            drawn[row_id], '%s in %s' % (row_id, generate_icon_glyphs.REL_FIGURE),
            False))
    return out


def height_of(element, where):
    """The height of one element's box."""
    # @purity pure
    box = box_of((element[0], element[1], element[2]), where)
    return box[3] - box[1]


def scales(shapes, glyphs):
    """(centre, geometric scale, pictorial scale), read off the two figures."""
    # @purity pure
    unit = dict(shapes)
    circle, glyph_circle = unit[CIRCLE][0], glyphs[CIRCLE][1][0]
    if circle[0] != 'circle' or glyph_circle[0] != 'circle':
        fail('the %s of both figures has to be one <circle>, the anchor of the '
             'geometric scale' % CIRCLE)
    if float(circle[2]['cx']) != 0 or float(circle[2]['cy']) != 0:
        fail('the unit %s of %s is not centred on the origin' % (CIRCLE, REL_FIGURE))
    centre = (float(glyph_circle[2]['cx']), float(glyph_circle[2]['cy']))
    geometric = float(glyph_circle[2]['r']) / float(circle[2]['r'])
    floppy = height_of(unit[FLOPPY][0], FLOPPY)
    glyph_floppy = height_of(glyphs[FLOPPY][1][0], glyphs[FLOPPY][0])
    return centre, geometric, glyph_floppy / floppy


def placed_steps(steps, centre, k):
    """A unit path's steps, scaled into the glyph's cell."""
    # @purity pure
    out = []
    for letter, values in steps:
        if letter in 'MLQ':
            moved = [centre[at % 2] + k * one for at, one in enumerate(values)]
        elif letter == 'H':
            moved = [centre[0] + k * one for one in values]
        elif letter == 'V':
            moved = [centre[1] + k * one for one in values]
        elif letter == 'A':
            moved = []
            for at in range(0, len(values), 7):
                rx, ry, turn, large, sweep, x, y = values[at:at + 7]
                moved += [k * rx, k * ry, turn, large, sweep,
                          centre[0] + k * x, centre[1] + k * y]
        else:
            moved = []
        out.append((letter, moved))
    return out


def placed_values(element, centre, k):
    """The numbers of a circle or a rect, scaled into the glyph's cell."""
    # @purity pure
    tag, _role, values = element
    if tag == 'circle':
        return [centre[0] + k * float(values['cx']), centre[1] + k * float(values['cy']),
                k * float(values['r'])]
    return [centre[0] + k * float(values['x']), centre[1] + k * float(values['y']),
            k * float(values['width']), k * float(values['height'])]


def glyph_values(element):
    """The numbers of a glyph circle or rect, in the same order."""
    # @purity pure
    tag, _name, values = element
    names = ('cx', 'cy', 'r') if tag == 'circle' else ('x', 'y', 'width', 'height')
    return [float(values[one]) for one in names]


def differs(wanted, found):
    """True when two lists of numbers are not the same within the precision."""
    # @purity pure
    return len(wanted) != len(found) or any(
        abs(a - b) > TOLERANCE for a, b in zip(wanted, found))


def compare(glyph, elements, glyph_entry, centre, k):
    """Figure F-044's shape against figure F-019's glyph, element by element."""
    # @purity pure
    row_id, drawn = glyph_entry
    where = '%s (%s of figure %s)' % (glyph, row_id, GLYPH_FIGURE_ID)
    if len(elements) != len(drawn):
        fail('%s is %d element(s) in figure %s and %d in figure %s'
             % (where, len(elements), FIGURE_ID, len(drawn), GLYPH_FIGURE_ID))
    for at, (unit, glyph_one) in enumerate(zip(elements, drawn)):
        tag, role, values = unit
        if glyph_one[0] != tag:
            fail('element %d of %s is a <%s> in figure %s and a <%s> in figure %s'
                 % (at, where, tag, FIGURE_ID, glyph_one[0], GLYPH_FIGURE_ID))
        if glyph_one[1] != ROLE_CLASS[role]:
            fail('element %d of %s has the role %s, which figure %s draws with '
                 'the class %s, and it is drawn with %r'
                 % (at, where, role, GLYPH_FIGURE_ID, ROLE_CLASS[role],
                    glyph_one[1]))
        if (glyph, at) in ALLOWED:
            continue
        if tag == 'path':
            wanted = placed_steps(steps_of(values['d'], where), centre, k)
            found = steps_of(glyph_one[2].get('d', ''), where)
            if [one[0] for one in wanted] != [one[0] for one in found] or any(
                    differs(a[1], b[1]) for a, b in zip(wanted, found)):
                fail('element %d of %s is not the glyph: figure %s scales to %s, '
                     'figure %s draws %s'
                     % (at, where, FIGURE_ID,
                        ' '.join(letter + ' '.join(trimmed(v) for v in nums)
                                 for letter, nums in wanted),
                        GLYPH_FIGURE_ID, glyph_one[2].get('d', '')))
        elif differs(placed_values(unit, centre, k), glyph_values(glyph_one)):
            fail('element %d of %s is not the glyph: figure %s scales to %s, '
                 'figure %s draws %s'
                 % (at, where, FIGURE_ID,
                    ' '.join(trimmed(v) for v in placed_values(unit, centre, k)),
                    GLYPH_FIGURE_ID,
                    ' '.join(trimmed(v) for v in glyph_values(glyph_one))))


def path_data(element):
    """One unit element as the path it draws."""
    # @purity pure
    tag, _role, values = element
    if tag == 'path':
        return values['d']
    if tag == 'circle':
        cx, cy, r = (float(values[one]) for one in ('cx', 'cy', 'r'))
        return 'M%s %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 %s %s Z' % (
            trimmed(cx - r), trimmed(cy), trimmed(r), trimmed(r), trimmed(cx + r),
            trimmed(cy), trimmed(r), trimmed(r), trimmed(cx - r), trimmed(cy))
    x, y, w, h = (float(values[one]) for one in ('x', 'y', 'width', 'height'))
    return 'M%s %s H%s V%s H%s Z' % (trimmed(x), trimmed(y), trimmed(x + w),
                                     trimmed(y + h), trimmed(x))


def build():
    """The chart's shape table, as it is written out."""
    # @purity semi-pure-b
    shapes = read_shapes()
    settled = generate_icon_roster.settled_spellings(
        generate_icon_roster.SHAPE_ENTITY, generate_icon_roster.GLYPH_COLUMN)
    spelled = [glyph for glyph, _elements in shapes]
    if spelled != list(settled):
        fail('%s draws %s, and %s settles %s for %s.%s in that order'
             % (REL_FIGURE, ', '.join(spelled), generate_icon_roster.REL_ERD,
                ', '.join(settled), generate_icon_roster.SHAPE_ENTITY,
                generate_icon_roster.GLYPH_COLUMN))
    glyphs = glyph_elements()
    missing = [one for one in spelled if one not in glyphs]
    if missing:
        fail('no row of table T-109 arms %s, so figure %s has no glyph to check '
             'against' % (', '.join(missing), GLYPH_FIGURE_ID))
    centre, geometric, pictorial = scales(shapes, glyphs)
    entries = []
    for at, (glyph, elements) in enumerate(shapes):
        check_frame(glyph, elements)
        k = geometric if at < GEOMETRIC_COUNT else pictorial
        compare(glyph, elements, glyphs[glyph], centre, k)
        layers = []
        for element in elements:
            layer = {'role': element[1], 'd': path_data(element)}
            if element[2].get('fill-rule'):
                layer['rule'] = element[2]['fill-rule']
            layers.append(layer)
        entries.append({'glyph': glyph, 'iconRowId': glyphs[glyph][0],
                        'layers': layers})
    return {'$comment': BANNER, 'shapes': entries}


def role_region():
    """The layer roles as a TS union, fenced as the unit's generated region."""
    # @purity pure
    return '\n'.join([
        OPEN,
        '// Single source of truth:',
        '//   %s (figure %s; the layer roles of LF-18, table T-221)'
        % (REL_FIGURE, FIGURE_ID),
        '// Rebuild: npm run gen   ||   npm run gen:check fails on drift (%s).'
        % REL_SELF,
        'export type MilestoneLayerRole = %s'
        % ' | '.join("'%s'" % one for one in ROLE_CLASS),
        CLOSE,
    ])


def unit_with_roles():
    """(on disk, wanted) for the unit whose region holds the role union."""
    # @purity semi-pure-b
    body = io.open(UNIT, encoding='utf-8', newline='').read()
    ending = '\r\n' if body.count('\r\n') * 2 > body.count('\n') else '\n'
    text = body.replace('\r\n', '\n')
    if len(REGION.findall(text)) != 1:
        fail('%s holds no single generated region (%s ... %s)'
             % (REL_UNIT, OPEN, CLOSE))
    region = role_region()
    return body, REGION.sub(lambda _m: region, text).replace('\n', ending)


def main():
    """Write the table and the role union, or say whether both still match."""
    # @purity non-pure
    table = build()
    body = json.dumps(table, ensure_ascii=False, indent=1) + '\n'
    unit_on_disk, unit_wanted = unit_with_roles()
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body or unit_on_disk != unit_wanted:
            sys.stdout.write('PROBLEM  %s or the region of %s has drifted from '
                             'figure %s -- run `python %s`\n'
                             % (REL_OUT, REL_UNIT, FIGURE_ID, REL_SELF))
            return 1
        sys.stdout.write('OK       the chart\'s milestone shapes match figure %s '
                         'and agree with figure %s (%d shape(s))\n'
                         % (FIGURE_ID, GLYPH_FIGURE_ID, len(table['shapes'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    io.open(UNIT, 'w', encoding='utf-8', newline='').write(unit_wanted)
    sys.stdout.write('wrote %s (%d shape(s), %d byte(s)) and the region of %s\n'
                     % (REL_OUT, len(table['shapes']), len(body), REL_UNIT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
