"""Owner-authorized rotation after independently verified public CA became available.

Preserve original .env.local; write the replacement only to a new ignored file.
Password is never an argument or plaintext SQL string (use an offline SCRAM verifier).
"""
import os
from pathlib import Path
import secrets
from urllib.parse import urlsplit,urlunsplit,quote
from psycopg import sql
from tiger_import import connect,scram

def main():
    if os.environ.get('TIGER_TLS_TRUST')!='public-ca-verified':raise ValueError('Verify public-CA trust first')
    path=Path('.env.tiger-admin-rotated.local')
    if path.exists():raise ValueError('Replacement file exists; do not rotate again silently')
    conn=connect();role=conn.execute('SELECT current_user').fetchone()[0]
    if role!='tsdbadmin':raise ValueError('Expected the existing Tiger development administrator role')
    password=secrets.token_urlsafe(32)
    original=urlsplit(os.environ['TIGER_IMPORT_DATABASE_URL']);host=original.hostname
    netloc=quote(role,safe='')+':'+quote(password,safe='')+'@'+host+(f':{original.port}' if original.port else '')
    replacement=urlunsplit((original.scheme,netloc,original.path,original.query,''))
    content='TIGER_IMPORT_DATABASE_URL='+replacement+'\nTIGER_SSLROOTCERT='+os.environ['TIGER_SSLROOTCERT']+'\nTIGER_TLS_TRUST=public-ca-verified\n'
    # Persist recovery material before committing the rotation; original env untouched.
    with path.open('x',encoding='utf-8') as f:f.write(content)
    try:path.chmod(0o600)
    except OSError:pass
    conn.execute(sql.SQL('ALTER ROLE {} PASSWORD {}').format(sql.Identifier(role),sql.Literal(scram(password))))
    conn.close()
    with connect(replacement) as fresh:
        if fresh.execute('SELECT current_user').fetchone()[0]!=role:raise ValueError('Rotated credential verification failed')
    print('Administrator password rotated and verified over public-CA TLS. Replacement saved only in ignored .env.tiger-admin-rotated.local; .env.local untouched.')

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('Administrator rotation did not complete: '+(str(e) if isinstance(e,ValueError) else type(e).__name__))
        raise SystemExit(1)
