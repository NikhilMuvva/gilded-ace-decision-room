"""Check built submission archives using a server environment key; never print its value."""
from pathlib import Path
from zipfile import ZipFile
import os

key = os.environ.get('GEMINI_API_KEY', '').encode()
if not key:
    raise SystemExit('FAIL: GEMINI_API_KEY is not configured in the checking process.')
root = Path(__file__).resolve().parents[1]
counts = {}
for name in ['gilded-ace-submission.zip', 'gilded-ace-static-site.zip']:
    with ZipFile(root / 'artifacts' / name) as archive:
        files = [entry for entry in archive.infolist() if not entry.is_dir()]
        for entry in files:
            if Path(entry.filename).name.startswith('.env') and Path(entry.filename).name != '.env.example':
                raise SystemExit('FAIL: a private environment file was found in an archive.')
            if key in archive.read(entry):
                raise SystemExit('FAIL: the configured key was found in an archive.')
        counts[name] = len(files)
print(f'PASS: {sum(counts.values())} archived files checked; no private environment file or configured key found.')
