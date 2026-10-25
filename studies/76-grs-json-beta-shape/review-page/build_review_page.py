# Build the CR-851 line-review page (one HTML file) from the study-76 tables.
# Usage: python -I build_review_page.py <study76 dir> <out.html>
import html
import io
import json
import os
import re
import sys

SRC, OUT = sys.argv[1], sys.argv[2]
JDG = re.compile(r'JDG-\d{3,4}')


def fnv(text):
    h = 0x811c9dc5
    for b in text.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h


def rows_of(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        return None
    with io.open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]
    head = lines[0].split('\t')
    out = []
    for l in lines[1:]:
        cells = l.split('\t')
        cells += [''] * (len(head) - len(cells))
        out.append(dict(zip(head, cells)))
    return out


def jdgs(*texts):
    seen = []
    for t in texts:
        for m in JDG.findall(t or ''):
            if m not in seen:
                seen.append(m)
    return seen


SOURCE = os.path.join(SRC, '..', '..', 'docs', 'spec', '_source')
sys.path.insert(0, SOURCE)
sys.dont_write_bytecode = True  # leave no __pycache__ in docs/spec/_source
import erd_json_to_schema  # noqa: E402  (the schema generator: it fills {{S-nnn}} the same way)
PLACEHOLDER = re.compile(r'\{\{(S-\d+)\}\}')


def filled(text):
    """Show a settings placeholder as the value the generator prints, with its row id."""
    def one(m):
        try:
            value = erd_json_to_schema.settings_reader.with_calendar_rows_printed(m.group(0), 'review page')
        except SystemExit:
            # The generator could not print it either: keep it visible and report it.
            UNFILLED.add(m.group(1))
            return m.group(0)
        return '%s (%s)' % (value, m.group(1))
    return PLACEHOLDER.sub(one, text)


UNFILLED = set()


def ex(cell):
    cell = (cell or '').strip()
    return '' if cell in ('', '-') else cell.replace('\\n', '\n')


def pack(table, key, label, old, new, why, extra, chip, ex_old='', ex_new='', tag=''):
    body = '␞'.join([old, ex_old, new, ex_new, why, extra])
    return {'id': table + '-' + fnv(table + '|' + key), 'label': label,
            'old': old, 'new': new, 'exOld': ex_old, 'exNew': ex_new,
            'why': why, 'extra': extra, 'chip': chip, 'tag': tag,
            'jdg': jdgs(why, extra), 'hash': fnv(body)}


tables = []

# Group tags: MSPDI (column carried to and from MS Project), GRS (GRS-only schedule data),
# VIEW (documentSettings), STAMP (version, stamp, change log), TYPE (shared $defs types).
ERD = json.load(io.open(os.path.join(SRC, '..', '..', 'docs', 'spec', '_source', 'erd.json'), encoding='utf-8'))
EXPORT = {e['name']: bool(e.get('export')) for e in ERD['entities']}
EXCH = {(e['name'], c['name']): bool(c.get('exchange')) for e in ERD['entities'] for c in e['columns']}
RENAMED_ENTITY = {'PassthroughElement': 'CarryElement', 'PassthroughValues': 'Carry',
                  'DocumentStamp': 'documentStamp', 'ChangeLogEntry': 'changeLog'}
GRS_NEW = {'CommentBoxAnchor', 'AnchorFallback'}
VIEW_DEFS = {'ColumnFilter', 'ColumnSort', 'ColumnKey'}
STAMP_DEFS = {'documentStamp', 'changeLog', 'Writer'}
SCHEDULE_ARRAY = {'calendars': 'Calendar', 'tasks': 'Task', 'resources': 'Resource',
                  'assignments': 'Assignment', 'project': 'Project'}


def doc_tag(pointer):
    p = pointer.split(' ; ')[0]
    if p.startswith('/properties/documentSettings'):
        return 'VIEW'
    if p == '/properties/schedule':
        return 'BOX'
    if p.startswith('/properties/schedule/properties/'):
        name = p.split('/')[4]
        return 'MSPDI' if name in SCHEDULE_ARRAY else 'GRS'
    if p.startswith('/properties/'):
        return 'STAMP'
    m = re.match(r'/\$defs/([A-Za-z]+)(?:/properties/([A-Za-z]+))?', p)
    if not m:
        return 'TYPE'
    ent = RENAMED_ENTITY.get(m.group(1), m.group(1))
    col = m.group(2)
    if ent in STAMP_DEFS:
        return 'STAMP'
    if ent in VIEW_DEFS:
        return 'VIEW'
    if ent in GRS_NEW:
        return 'GRS'
    if ent in ('Carry', 'CarryElement'):
        return 'MSPDI'
    if ent not in EXPORT:
        return 'TYPE'
    if not EXPORT[ent]:
        return 'GRS'
    if col is None or col in ('carry', 'carryElements', 'passthroughValues', 'passthroughElements'):
        return 'MSPDI'
    if col.startswith('hyperlink'):
        return 'MSPDI' if ent == 'Task' else 'GRS'
    return 'MSPDI' if EXCH.get((ent, col), False) else 'GRS'


CMD_TAGS = [('TaskVisual', 'GRS'), ('TaskGroup', 'GRS'), ('CommentBox', 'GRS'), ('HighlightBox', 'GRS'),
            ('TableView', 'VIEW'), ('DocumentSettings', 'VIEW'), ('Zoom', 'VIEW'), ('Scroll', 'VIEW'),
            ('FitSpan', 'VIEW'), ('DisplayScale', 'VIEW'), ('FontSize', 'VIEW'), ('fitSchedule', 'VIEW'),
            ('Visibility', 'VIEW'), ('Theme', 'VIEW'), ('TimeZone', 'VIEW'), ('StackDirection', 'VIEW'),
            ('LevelZero', 'VIEW'), ('TimeOfDay', 'VIEW'), ('Resource', 'MSPDI'), ('Assignment', 'MSPDI'),
            ('Dependency', 'MSPDI'), ('Calendar', 'MSPDI'), ('Project', 'MSPDI'), ('StatusDate', 'MSPDI'),
            ('Schedule', 'MSPDI'), ('Task', 'MSPDI')]


def cmd_tag(*names):
    for name in names:
        for word, tag in CMD_TAGS:
            if word.lower() in (name or '').lower():
                return tag
    return 'MSPDI'

# A row with no old element names a placeholder there; key it by its new name so two new rows never share a review.
NO_OLD = ('-', '(新)', '(無い)', '(new)', '(none)')

# Sections (JDG-3325): the page draws a divider where the section of the next row changes.
def doc_section(pointer):
    p = pointer.split(' ; ')[0]
    m = re.match(r'/\$defs/([A-Za-z]+)', p)
    if m:
        return '$defs/' + m.group(1)
    names = re.findall(r'/properties/([^/]+)', p)
    if names[0] == 'schedule':
        return 'schedule'
    if names[0] == 'documentSettings':
        return 'documentSettings'
    if names[0] in ('documentStamp', 'changeLog', 'changeLogEntries'):
        return 'documentStamp / changeLogEntries'
    return '$schema / schemaVersion / buildVersion'


REF_SECTION = {'shape': '拒否の形', 'top': '呼び出しの拒否の理由', 'top / command': '呼び出しの拒否の理由',
               'command': '命令ごとの拒否の理由', 'fault': '文書の欠陥', 'relay': '取次の拒否'}

doc = rows_of('doc-shape-map.tsv')
items = []
for i, r in enumerate(doc, 1):
    key = r['element_old'] if r['element_old'] != '-' else r['element_new']
    old = '-' if r['element_old'] == '-' else r['element_old'] + '\n' + r['type_old']
    new = '-' if r['element_new'] == '-' else r['element_new'] + '\n' + r['type_new']
    # The English description that ships in grs-document.schema.json (JDG-3327).
    if old != '-' and ex(r.get('description_old')):
        old += '\ndescription: ' + filled(ex(r.get('description_old')))
    if new != '-' and ex(r.get('description_new')):
        new += '\ndescription: ' + filled(ex(r.get('description_new')))
    extra = '' if r['screen_behaviour_change'] in ('', 'none') else '画面の変化: ' + r['screen_behaviour_change']
    why = r['why'] + ('' if r['spec_row'] in ('', '-') else ' (' + r['spec_row'] + ')')
    items.append(pack('doc', key, 'D%03d' % i, old, new, why, extra, r['change'],
                      ex(r.get('example_old')), ex(r.get('example_new')), doc_tag(key)))
    items[-1]['section'] = doc_section(r['element_new'] if r['element_new'] != '-' else r['element_old'])
tables.append({'key': 'doc', 'name': 'GRS JSON のプロパティ', 'source': 'doc-shape-map.tsv', 'rows': items})

cmd = rows_of('commands-map.tsv')
items = []
for i, r in enumerate(cmd, 1):
    key = r['command_old'] if r['command_old'] not in NO_OLD else r['command_new']
    old = '-' if r['command_old'] == '-' else r['command_old'] + '\n' + r['values_old']
    new = r['command_new'] + '\n' + r['values_new']
    # The English description that ships in grs-commands.schema.json (JDG-3321).
    if ex(r.get('description_old')):
        old += '\ndescription: ' + ex(r.get('description_old'))
    if ex(r.get('description_new')):
        new += '\ndescription: ' + ex(r.get('description_new'))
    extra = '' if r['rule_moved'] in ('', '-') else '移す決まり: ' + r['rule_moved']
    items.append(pack('cmd', key, 'C%03d' % i, old, new, r['why'], extra, r['kind'],
                      ex(r.get('example_old')), ex(r.get('example_new')),
                      cmd_tag(r['command_new'], r['command_old'])))
    items[-1]['section'] = r.get('entity', '')
tables.append({'key': 'cmd', 'name': 'コマンド（applyCommands）', 'source': 'commands-map.tsv', 'rows': items})

ref = rows_of('refusal-reasons-map.tsv')
items = []
for i, r in enumerate(ref, 1):
    old = r['reason_old']
    new = r['reason_new'] + '\n' + r['meaning']
    extra = '出どころ: ' + r['comes_from'] + ('' if r['extras'] in ('', '-') else '\n添える欄: ' + r['extras'])
    key = r['reason_old'] if r['reason_old'] not in NO_OLD else r['reason_new']
    items.append(pack('ref', key, 'R%03d' % i, old, new, r['note'], extra, r['level'],
                      ex(r.get('example_old')), ex(r.get('example_new')), 'API'))
    items[-1]['section'] = REF_SECTION.get(r['level'], r['level'])
tables.append({'key': 'ref', 'name': 'Agent API の拒否の理由', 'source': 'refusal-reasons-map.tsv', 'rows': items})

spec = rows_of('spec-rows-map.tsv')
items = []
if spec:
    # Key on the n-th occurrence of (file, row_id), not on the row position: inserting a row
    # must not move the review state of the rows after it.
    seen = {}
    for i, r in enumerate(spec, 1):
        pair = r.get('file', '') + '|' + r.get('row_id', '')
        seen[pair] = seen.get(pair, 0) + 1
        key = pair + '|' + str(seen[pair])
        old = r.get('old', '')
        new = r.get('new', '')
        extra = r.get('file', '') + ' ' + r.get('row_id', '') + ' ' + r.get('cr', '')
        items.append(pack('spec', key, 'S%03d' % i, old, new, r.get('why', ''), extra, r.get('kind', ''),
                          ex(r.get('example_old')), ex(r.get('example_new')), r.get('cr', '')))
        items[-1]['section'] = r.get('file', '')
tables.append({'key': 'spec', 'name': '仕様の文', 'source': 'spec-rows-map.tsv', 'rows': items,
               'pending': spec is None})

data = json.dumps(tables, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
with io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'review_page_template.html'), encoding='utf-8') as f:
    page = f.read()
page = page.replace('/*__DATA__*/[]', data)
with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(page)
print('rows', {t['key']: len(t['rows']) for t in tables}, 'bytes', len(page.encode('utf-8')))
if UNFILLED:
    print('placeholders the generator cannot print:', ', '.join(sorted(UNFILLED)))
