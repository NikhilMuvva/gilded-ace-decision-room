"""Run upstream verification with Windows path normalization, without editing source."""
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.python-deps'))
source = ROOT / 'sources/dashboard-royale-main'
code = (source / 'scripts/verify_data.py').read_text()
code = code.replace('str(path.relative_to(DATA))', 'path.relative_to(DATA).as_posix()')
exec(compile(code, str(source / 'scripts/verify_data.py'), 'exec'), {'__name__': '__main__', '__file__': str(source / 'scripts/verify_data.py')})
