"""Create/reuse a labeled local TimescaleDB validation container; never a Tiger Cloud claim."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]
NAME='gilded-ace-timescale-test'
IMAGE='timescale/timescaledb:2.31.0-pg17'


def main():
    existing=subprocess.run(['docker','inspect','--format','{{json .Config.Labels}}',NAME],capture_output=True,text=True)
    envfile=ROOT/'.env.tiger-test.local';dockerfile=ROOT/'.env.tiger-docker.local'
    if existing.returncode==0:
        labels=json.loads(existing.stdout)
        if labels.get('com.gilded-ace.role')!='local-validation' or not envfile.exists():
            raise RuntimeError('Container name is not a verified local validation instance')
        subprocess.run(['docker','start',NAME],check=True,stdout=subprocess.DEVNULL)
    else:
        password=secrets.token_urlsafe(32)
        dockerfile.write_text('POSTGRES_PASSWORD='+password+'\nPOSTGRES_DB=dashboard_royale\n',encoding='utf-8')
        url='postgresql://postgres:'+password+'@127.0.0.1:55432/dashboard_royale'
        envfile.write_text('TIGER_TEST_DATABASE_URL='+url+'\nTIGER_IMPORT_DATABASE_URL='+url+'\nTIGER_ALLOW_INSECURE_LOCALHOST=true\nTIGER_SERVICE_LABEL=Local TimescaleDB validation (not Tiger Cloud)\n',encoding='utf-8')
        for p in [dockerfile,envfile]:
            try:p.chmod(0o600)
            except OSError:pass
        subprocess.run(['docker','run','--detach','--name',NAME,'--label','com.gilded-ace.role=local-validation',
                        '--publish','127.0.0.1:55432:5432','--env-file',str(dockerfile),IMAGE],check=True,stdout=subprocess.DEVNULL)
    for _ in range(60):
        ready=subprocess.run(['docker','exec',NAME,'pg_isready','-U','postgres','-d','dashboard_royale'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if ready.returncode==0:
            print('Local TimescaleDB validation container ready on localhost:55432; credentials remain in ignored environment files.')
            return
        time.sleep(1)
    raise RuntimeError('Local PostgreSQL did not become ready')


if __name__=='__main__':main()
