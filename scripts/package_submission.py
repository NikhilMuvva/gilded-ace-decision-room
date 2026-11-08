"""Allowlisted packaging; never include source casino/publisher tables or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'artifacts'
out.mkdir(exist_ok=True)
if not (ROOT/'dist/index.html').exists():
    raise SystemExit('Run npm run build before packaging.')
roots=['src','server','api','scripts','tests','docs','public']
files=['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','vercel.json','requirements.txt','README.md','.gitignore','.vercelignore','.npmrc','.env.example']
with ZipFile(out/'gilded-ace-submission.zip','w',ZIP_DEFLATED) as z:
    for root in roots:
        for path in sorted((ROOT/root).rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts:
                z.write(path,path.relative_to(ROOT).as_posix())
    for file in files:
        z.write(ROOT/file,file)
with ZipFile(out/'gilded-ace-static-site.zip','w',ZIP_DEFLATED) as z:
    for path in sorted((ROOT/'dist').rglob('*')):
        if path.is_file():
            z.write(path,path.relative_to(ROOT/'dist').as_posix())
for name in ['gilded-ace-submission.zip','gilded-ace-static-site.zip']:
    with ZipFile(out/name) as z:
        assert not any(p.startswith(('sources/','node_modules/','.git/','.venv/','.python-deps/')) or p.endswith(('.parquet','.csv.gz')) for p in z.namelist())
    print(f'{name}: {(out/name).stat().st_size/1e6:.2f} MB; allowlist verified')
