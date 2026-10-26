"""Copy a ruling sheet to old/<stem>_yyyymmdd_hhmm.md beside the sheet.

Run before every edit of the sheet. Warns when old/ is not gitignored, since
the backups are working copies and must not be published.

  python <skill>/scripts/backup_sheet.py <sheet.md>
"""
import datetime
import os
import shutil
import subprocess
import sys


def main(argv):
    if len(argv) != 2:
        print(__doc__.strip())
        return 2
    sheet = argv[1]
    if not os.path.isfile(sheet):
        print('ERROR no such file: %s' % sheet)
        return 1
    folder = os.path.join(os.path.dirname(os.path.abspath(sheet)), 'old')
    os.makedirs(folder, exist_ok=True)
    stem, ext = os.path.splitext(os.path.basename(sheet))
    stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M')
    target = os.path.join(folder, '%s_%s%s' % (stem, stamp, ext))
    if os.path.exists(target):
        print('OK backup already taken this minute: %s' % os.path.relpath(target))
    else:
        shutil.copy2(sheet, target)
        print('OK backup: %s' % os.path.relpath(target))
    try:
        ignored = subprocess.run(['git', 'check-ignore', '-q', target],
                                 cwd=folder, capture_output=True).returncode == 0
    except OSError:
        ignored = True
    if not ignored:
        print('WARN %s is not gitignored -- add the folder to .gitignore' % os.path.relpath(folder))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
