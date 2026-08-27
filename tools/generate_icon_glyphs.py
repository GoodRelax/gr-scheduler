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

⛔ THE COORDINATE SYSTEM CARRIED IS THE INK, NOT THE GRID CELL. FR-029 requires
figure F-019's coordinate system tightened to the frame its shapes circumscribe
(MUST) and forbids giving each shape one of its own (MUST NOT), and it states in
the same breath why the first of those matters: a coordinate system with margin
in it does not let a bigger box draw a bigger shape. The figure draws every
shape inside one cell of its drawing grid, and that cell is wider and taller
than the ink any shape puts in it -- so what this script measures is the shapes,
and the cell is measured only to check that they were all drawn on one grid.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import math
import os
import re
import sys
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR

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

# One number of a geometry attribute, and one step of a path: the letter, and
# everything up to the next letter.
NUMBER = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
PATH_STEP = re.compile(r'([A-Za-z])([^A-Za-z]*)')

# How many numbers one step of each path command takes. ⛔ Deliberately a list
# and not "whatever SVG has": a cubic (C/S) or a smooth quadratic (T) measured
# by its control points would give a box wider than the ink, and skipped
# entirely would give one narrower. Both are wrong, so an unknown letter stops
# this script instead of guessing at where the curve went.
PATH_ARGUMENTS = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'Q': 4, 'A': 7, 'Z': 0}

# ⭐ THE PRECISION IS THE FIGURE'S OWN, MEASURED: no coordinate of F-019 states
# more than two decimals, and no stroke width does either, so two decimals lose
# nothing. ⛔ It is not a value of the specification, and no row holds it.
PRECISION = Decimal('0.01')

# ⚠️ Binary floating point cannot hold a tenth, so a coordinate that reads 1.7
# in the figure lands a few parts in 10^16 either side of it once a stroke has
# been subtracted, and rounding such a value DOWN drops a whole hundredth.
# Settling it first at nine decimals -- far past the figure's own precision, far
# short of that noise -- is what makes the answer the same on every machine.
SETTLED_PLACES = 9

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, figure %s (the '
    'authority for every icon shape, FR-029), cross-checked against table %s of '
    '%s so that neither can move without the other. Rebuild: npm run gen -- npm '
    'run gen:check fails on drift. The generator is %s. Each shape is carried as '
    'it was drawn: the figure paints through a stylesheet, so each element '
    'leaves with the declarations its own classes held, and the colour is '
    'currentColor because the app has a theme of its own (FR-041). The '
    'coordinate system is the frame the shapes themselves circumscribe, '
    'measured from their geometry and their own stroke widths, and it is one '
    'system for all of them: FR-029 requires the figure tightened to that frame '
    '(MUST) and forbids a coordinate system per shape (MUST NOT), because a '
    'coordinate system with margin in it does not let a bigger box draw a '
    'bigger shape.'
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


def box_of(points):
    """The smallest box holding every one of some points."""
    # @purity pure
    return (min(one[0] for one in points), min(one[1] for one in points),
            max(one[0] for one in points), max(one[1] for one in points))


def joined(first, second):
    """The smallest box holding both, or the second one alone the first time."""
    # @purity pure
    if first is None:
        return second
    return (min(first[0], second[0]), min(first[1], second[1]),
            max(first[2], second[2]), max(first[3], second[3]))


def swept_angle(from_x, from_y, to_x, to_y):
    """The signed angle from one vector to another."""
    # @purity pure
    dot = from_x * to_x + from_y * to_y
    lengths = math.hypot(from_x, from_y) * math.hypot(to_x, to_y)
    found = math.acos(max(-1.0, min(1.0, dot / lengths)))
    return -found if from_x * to_y - from_y * to_x < 0 else found


def ellipse_point(centre, radii, turn, angle):
    """One point of an ellipse, at the angle its own parameterisation counts."""
    # @purity pure
    across, down = math.cos(angle) * radii[0], math.sin(angle) * radii[1]
    return (centre[0] + across * turn[0] - down * turn[1],
            centre[1] + across * turn[1] + down * turn[0])


def arc_points(start, end, step):
    """One elliptical arc's two ends, and the points at which it turns back.

    The endpoint-to-centre parameterisation SVG states, then the angles at which
    such an ellipse stands farthest along each axis. ⭐ THE TURNS ARE SOLVED,
    NEVER SAMPLED -- a sampled arc falls short of its own extreme by however
    coarse the sampling was, and the box measured here may not fall short: the
    outer svg clips to its viewport, so a hair too small shaves the ink off.
    """
    # @purity pure
    if start == end:
        # SVG omits an arc whose two ends are the same point, and the centre of
        # one cannot be solved for -- the division below would be by zero.
        return [start]
    radius_x, radius_y = abs(step[0]), abs(step[1])
    if radius_x == 0 or radius_y == 0:
        # SVG draws a straight line when either radius is zero.
        return [start, end]
    large_arc, sweep = step[3] != 0, step[4] != 0
    turn = (math.cos(math.radians(step[2])), math.sin(math.radians(step[2])))
    half = ((start[0] - end[0]) / 2.0, (start[1] - end[1]) / 2.0)
    half_x = turn[0] * half[0] + turn[1] * half[1]
    half_y = -turn[1] * half[0] + turn[0] * half[1]
    oversize = ((half_x * half_x) / (radius_x * radius_x)
                + (half_y * half_y) / (radius_y * radius_y))
    if oversize > 1:
        radius_x *= math.sqrt(oversize)
        radius_y *= math.sqrt(oversize)
    radii = (radius_x, radius_y)
    squares = (radius_x * radius_x * half_y * half_y
               + radius_y * radius_y * half_x * half_x)
    room = radius_x * radius_x * radius_y * radius_y - squares
    reach = math.sqrt(max(0.0, room / squares))
    if large_arc == sweep:
        reach = -reach
    centre_x = reach * radius_x * half_y / radius_y
    centre_y = -reach * radius_y * half_x / radius_x
    centre = (turn[0] * centre_x - turn[1] * centre_y + (start[0] + end[0]) / 2.0,
              turn[1] * centre_x + turn[0] * centre_y + (start[1] + end[1]) / 2.0)

    from_x = (half_x - centre_x) / radius_x
    from_y = (half_y - centre_y) / radius_y
    to_x = (-half_x - centre_x) / radius_x
    to_y = (-half_y - centre_y) / radius_y
    begin = swept_angle(1.0, 0.0, from_x, from_y)
    swept = swept_angle(from_x, from_y, to_x, to_y)
    if not sweep and swept > 0:
        swept -= 2 * math.pi
    elif sweep and swept < 0:
        swept += 2 * math.pi

    points = [start, end]
    lowest, highest = min(begin, begin + swept), max(begin, begin + swept)
    for turning in (math.atan2(-radius_y * turn[1], radius_x * turn[0]),
                    math.atan2(radius_y * turn[0], radius_x * turn[1])):
        for angle in (turning, turning + math.pi):
            # The two solutions repeat every turn, so bring each into the arc's
            # own run of angles before asking whether the arc reaches it.
            while angle < lowest:
                angle += 2 * math.pi
            while angle > highest:
                angle -= 2 * math.pi
            if lowest <= angle <= highest:
                points.append(ellipse_point(centre, radii, turn, angle))
    return points


def quadratic_points(start, control, end):
    """One quadratic curve's two ends, and the points at which it turns back."""
    # @purity pure
    points = [start, end]
    for axis in (0, 1):
        bend = start[axis] - 2 * control[axis] + end[axis]
        if bend == 0:
            continue
        at = (start[axis] - control[axis]) / bend
        if 0 < at < 1:
            rest = 1 - at
            points.append(tuple(
                rest * rest * start[one] + 2 * rest * at * control[one]
                + at * at * end[one] for one in (0, 1)))
    return points


def path_numbers(arguments, letter, row_id):
    """The numbers of one path step, counted against what that step takes."""
    # @purity pure
    values = [float(one) for one in NUMBER.findall(arguments)]
    wanted = PATH_ARGUMENTS[letter.upper()]
    if wanted == 0:
        if values:
            sys.exit('generate_icon_glyphs: a %s of %s carries %d number(s), and '
                     'that command takes none' % (letter, row_id, len(values)))
        return values
    if not values or len(values) % wanted:
        sys.exit('generate_icon_glyphs: a %s of %s carries %d number(s), and one '
                 'step of it takes %d' % (letter, row_id, len(values), wanted))
    return values


def path_extent(d, row_id):
    """The box one `d` draws in, before its stroke is added."""
    # @purity pure
    points = []
    cursor = (0.0, 0.0)
    opened = (0.0, 0.0)
    walked = d.strip()
    # ⛔ Everything before the first command letter is invisible to the walk
    # below, so a `d` that does not open with one would be measured short.
    if walked and not PATH_STEP.match(walked):
        sys.exit('generate_icon_glyphs: a path of %s opens with something that '
                 'is not a command, so part of it would go unmeasured' % row_id)
    for letter, arguments in PATH_STEP.findall(walked):
        if letter.upper() not in PATH_ARGUMENTS:
            sys.exit('generate_icon_glyphs: %s is drawn with the path command '
                     '%r, which this script cannot walk, so the box it measured '
                     'would not be the ink' % (row_id, letter))
        values = path_numbers(arguments, letter, row_id)
        relative = letter.islower()
        command = letter.upper()
        if command == 'Z':
            cursor = opened
            points.append(cursor)
            continue
        # ⭐ One step's worth of numbers. `M` becomes `L` below and both take
        # two, so the stride does not move when it does.
        stride = PATH_ARGUMENTS[command]
        for at in range(0, len(values), stride):
            step = values[at:at + stride]
            here = cursor if relative else (0.0, 0.0)
            if command == 'M':
                cursor = (here[0] + step[0], here[1] + step[1])
                if at == 0:
                    opened = cursor
                points.append(cursor)
                # SVG: the numbers after a moveto's first pair draw lines.
                command = 'L'
            elif command == 'L':
                cursor = (here[0] + step[0], here[1] + step[1])
                points.append(cursor)
            elif command == 'H':
                cursor = (here[0] + step[0], cursor[1])
                points.append(cursor)
            elif command == 'V':
                cursor = (cursor[0], here[1] + step[0])
                points.append(cursor)
            elif command == 'Q':
                control = (here[0] + step[0], here[1] + step[1])
                end = (here[0] + step[2], here[1] + step[3])
                points.extend(quadratic_points(cursor, control, end))
                cursor = end
            else:
                end = (here[0] + step[5], here[1] + step[6])
                points.extend(arc_points(cursor, end, step))
                cursor = end
    if not points:
        sys.exit('generate_icon_glyphs: a path of %s draws nothing, so it has no '
                 'box' % row_id)
    return box_of(points)


def stated(values, name, tag, row_id):
    """One number an element has to carry for the box it draws in to be read."""
    # @purity pure
    if name not in values:
        sys.exit('generate_icon_glyphs: a <%s> of %s states no %s, so the box it '
                 'draws in cannot be measured' % (tag, row_id, name))
    return float(values[name])


def corner_points(values, tag, row_id):
    """The corners a polyline or polygon is drawn through."""
    # @purity pure
    numbers = [float(one) for one in NUMBER.findall(values.get('points', ''))]
    if not numbers or len(numbers) % 2:
        sys.exit('generate_icon_glyphs: a <%s> of %s states %d number(s) for its '
                 'points, and a point takes two' % (tag, row_id, len(numbers)))
    return [(numbers[at], numbers[at + 1]) for at in range(0, len(numbers), 2)]


def stroke_reach(values, tag, row_id):
    """How far past its geometry one carried element's ink reaches.

    ⭐ READ FROM THE ELEMENT, NEVER TYPED. What is read is the declarations the
    carrying gave it, so that a declaration the carrying ever drops takes this
    measurement with it rather than leaving it asserting a stroke that is gone.
    """
    # @purity pure
    declarations = {}
    for one in values.get(STYLE_ATTRIBUTE, '').split(';'):
        name, _colon, body = one.partition(':')
        if name.strip():
            declarations[name.strip()] = body.strip()
    # SVG's initial stroke is `none`, so an element that states none is unstroked
    # and its ink stops at its geometry.
    if declarations.get('stroke', 'none') == 'none':
        return 0.0
    if 'stroke-width' not in declarations:
        sys.exit('generate_icon_glyphs: a <%s> of %s is stroked and states no '
                 'stroke-width, and SVG\'s initial width of 1 would be a number '
                 'this script invented' % (tag, row_id))
    # ⛔ A mitred join reaches PAST half the width -- as far as the miter limit
    # lets it -- so half the width would be short of the ink and the outer svg
    # would clip the point off. ⭐ A round join reaches exactly half the width in
    # every direction, which is what makes this measurement exact rather than
    # merely close. ⚠️ The cap is not asked about: neither `butt` nor `square`
    # reaches past half the width, so neither can make this short.
    if declarations.get('stroke-linejoin') != 'round':
        sys.exit('generate_icon_glyphs: a <%s> of %s is stroked without a round '
                 'join, and this script can only measure a join whose ink stops '
                 'at half the stroke width' % (tag, row_id))
    return float(declarations['stroke-width']) / 2.0


def element_extent(element, row_id):
    """The box one carried element puts ink in, its own stroke included."""
    # @purity pure
    tag = element['tag']
    values = dict((one['name'], one['value']) for one in element['attributes'])
    if tag == 'path':
        box = path_extent(values.get('d', ''), row_id)
    elif tag == 'rect':
        left = stated(values, 'x', tag, row_id)
        top = stated(values, 'y', tag, row_id)
        box = (left, top,
               left + stated(values, 'width', tag, row_id),
               top + stated(values, 'height', tag, row_id))
    elif tag == 'circle':
        radius = stated(values, 'r', tag, row_id)
        box = box_of([(stated(values, 'cx', tag, row_id) - radius,
                       stated(values, 'cy', tag, row_id) - radius),
                      (stated(values, 'cx', tag, row_id) + radius,
                       stated(values, 'cy', tag, row_id) + radius)])
    elif tag == 'ellipse':
        across = stated(values, 'rx', tag, row_id)
        down = stated(values, 'ry', tag, row_id)
        box = box_of([(stated(values, 'cx', tag, row_id) - across,
                       stated(values, 'cy', tag, row_id) - down),
                      (stated(values, 'cx', tag, row_id) + across,
                       stated(values, 'cy', tag, row_id) + down)])
    elif tag == 'line':
        box = box_of([(stated(values, 'x1', tag, row_id),
                       stated(values, 'y1', tag, row_id)),
                      (stated(values, 'x2', tag, row_id),
                       stated(values, 'y2', tag, row_id))])
    elif tag in ('polyline', 'polygon'):
        box = box_of(corner_points(values, tag, row_id))
    else:
        # ⛔ Reachable only when DRAWABLE grows and this does not. A tag that can
        # be carried but not measured would leave its ink outside the carried
        # coordinate system, which is FR-029's MUST failing silently.
        sys.exit('generate_icon_glyphs: a <%s> of %s may be carried but this '
                 'script cannot measure the box it draws in' % (tag, row_id))
    reach = stroke_reach(values, tag, row_id)
    return (box[0] - reach, box[1] - reach, box[2] + reach, box[3] + reach)


def outward(value, rounding):
    """One edge of the measured box, rounded away from the ink it holds."""
    # @purity pure
    return Decimal(repr(round(value, SETTLED_PLACES))).quantize(
        PRECISION, rounding=rounding)


def trimmed(value):
    """One measured length, written the way the figure writes its own."""
    # @purity pure
    text = '%s' % value
    return text.rstrip('0').rstrip('.') if '.' in text else text


def carried_box(ink):
    """The measured box, as the coordinate system every shape is carried in.

    ⛔ ROUNDED OUTWARD, NEVER TO NEAREST. The outer svg clips to its viewport, so
    a box a hundredth too small shaves the tip off a round cap; a box a
    hundredth too large is invisible. ⭐ Rounding at all is what makes the answer
    the same on every machine, which is what `--check` compares.
    """
    # @purity pure
    left = outward(ink[0], ROUND_FLOOR)
    top = outward(ink[1], ROUND_FLOOR)
    right = outward(ink[2], ROUND_CEILING)
    bottom = outward(ink[3], ROUND_CEILING)
    return ' '.join(trimmed(one)
                    for one in (left, top, right - left, bottom - top))


def figure_glyphs():
    """Every shape of figure F-019, by its row id, and the box they share."""
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
    ink = None
    for left, top, body, label_x, label_y, row_id in found:
        if row_id in glyphs:
            sys.exit('generate_icon_glyphs: %s prints %s under two shapes'
                     % (REL_FIGURE, row_id))
        # ⭐ THE CELL IS MEASURED, NEVER TYPED. The figure centres each label
        # under its own shape, so twice the distance from the group's left edge
        # to that centre IS the width of the cell the shape was drawn in.
        # ⛔ THE CELL IS NOT THE COORDINATE SYSTEM -- see below.
        size = 2 * (float(label_x) - float(left))
        if float(label_y) <= float(top):
            sys.exit('generate_icon_glyphs: %s prints the label of %s above its '
                     'shape, so the cell cannot be measured'
                     % (REL_FIGURE, row_id))
        sizes.add(size)
        drawn = glyph_of(body, row_id, rules)
        for element in drawn:
            ink = joined(ink, element_extent(element, row_id))
        glyphs[row_id] = drawn
    if len(sizes) != 1:
        sys.exit('generate_icon_glyphs: %s draws its shapes in %d different '
                 'cell widths (%s), and one box has to hold them all'
                 % (REL_FIGURE, len(sizes),
                    ', '.join(repr(one) for one in sorted(sizes))))
    size = sizes.pop()
    # ⭐ WHY THE CELL IS STILL MEASURED NOW THAT NOTHING CARRIES IT: it is the
    # only thing that says the 74 shapes were drawn on ONE grid, and a shared
    # grid is why their relative sizes mean anything -- which is the ground
    # FR-029 itself gives for forbidding a coordinate system per shape.
    if ink is None or ink[2] <= ink[0] or ink[3] <= ink[1]:
        sys.exit('generate_icon_glyphs: the shapes of %s put ink in no box at '
                 'all, so there is no coordinate system to carry' % REL_FIGURE)
    if ink[0] < 0 or ink[1] < 0 or ink[2] > size or ink[3] > size:
        sys.exit('generate_icon_glyphs: a shape of %s draws outside the cell it '
                 'was given (ink %s, in a cell of %g), which is drift in the '
                 'figure and not something to carry'
                 % (REL_FIGURE, ' '.join('%g' % one for one in ink), size))
    return glyphs, carried_box(ink)


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
