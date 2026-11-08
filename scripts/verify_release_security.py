"""Scan tracked files, all reachable Git blobs, build and archives without printing secrets."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from zipfile import ZipFile
import os
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
NAMES={'GEMINI_API_KEY','DATABASE_URL','TIGER_IMPORT_DATABASE_URL','TIGER_TEST_DATABASE_URL','POSTGRES_PASSWORD','VERCEL_TOKEN'}
values=[os.environ.get(k,'') for k in NAMES]
for path in ROOT.glob('.env*'):
    if path.is_file() and path.name!='.env.example' and path.suffix!='.pem':
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            name,separator,value=line.partition('=')
            if separator and name.strip() in NAMES:values.append(value.strip().strip('\"\''))
secrets=set()
for value in filter(None,values):
    if len(value)>=8:secrets.add(value.encode())
    if value.startswith(('postgres://','postgresql://')):
        password=urlsplit(value).password
        if password and len(password)>=8:secrets.add(unquote(password).encode())
if not secrets:raise SystemExit('FAIL: no configured secrets available for comparison.')

def check(content):
    if any(value in content for value in secrets) or re.search(rb'AIza[0-9A-Za-z_-]{35}',content):
        raise SystemExit('FAIL: a secret-like value was detected; no value or matching text was printed.')
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)

files=git('ls-files','-z').decode().split('\0')
for name in filter(None,files):
    path=Path(name)
    if (path.name.startswith('.env') and path.name!='.env.example') or path.parts[0] in ['sources','node_modules','.vercel','dist','artifacts']:
        raise SystemExit('FAIL: a protected private/generated path is tracked.')
    check((ROOT/path).read_bytes())
objects=git('rev-list','--objects','--all').splitlines()
p=subprocess.Popen(['git','cat-file','--batch'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
blobs=0
for row in objects:
    oid=row.split(b' ',1)[0];p.stdin.write(oid+b'\n');p.stdin.flush()
    info=p.stdout.readline().split();content=p.stdout.read(int(info[2]));p.stdout.read(1)
    if info[1]==b'blob':check(content);blobs+=1
p.stdin.close();p.wait()
build_files=[p for p in (ROOT/'dist').rglob('*') if p.is_file()]
for path in build_files:check(path.read_bytes())
archive_files=0
for name in ['gilded-ace-submission.zip','gilded-ace-static-site.zip']:
    path=ROOT/'artifacts'/name
    if path.exists():
        with ZipFile(path) as z:
            for entry in z.infolist():
                if entry.is_dir():continue
                if Path(entry.filename).name.startswith('.env') and Path(entry.filename).name!='.env.example':raise SystemExit('FAIL: private env file in archive.')
                check(z.read(entry));archive_files+=1
print(f'PASS: {len(list(filter(None,files)))} tracked files, {blobs} historical Git blobs, {len(build_files)} build files and {archive_files} archived files checked; no configured secret detected.')
