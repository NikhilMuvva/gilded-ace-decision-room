"""Idempotent, manifest-bound Tiger Cloud import; credentials stay in server env.

Load .env.local with Node's --env-file then spawn this command, or set env directly.
Only this offline admin command writes; the HTTP API uses a separate reader role.
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sys
import time
from datetime import timezone
from decimal import Decimal
from urllib.parse import urlsplit, urlunsplit, quote
import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb
from tiger_source import open_source, validate_source, batches, IMPORT_COLUMNS

ROOT = Path(__file__).resolve().parents[1]


def schema_name(value):
    if not re.fullmatch(r'[a-z][a-z0-9_]{0,55}', value):
        raise ValueError('Invalid schema identifier')
    return value


def connect(url=None):
    url = url or os.environ.get('TIGER_IMPORT_DATABASE_URL') or os.environ.get('TIGER_TEST_DATABASE_URL')
    if not url:
        raise ValueError('Configure TIGER_IMPORT_DATABASE_URL in ignored local environment first')
    parsed = urlsplit(url)
    if parsed.scheme not in ['postgres','postgresql'] or not parsed.hostname:
        raise ValueError('A PostgreSQL connection URL is required')
    local = parsed.hostname in ['localhost','127.0.0.1','::1']
    insecure = local and os.environ.get('TIGER_ALLOW_INSECURE_LOCALHOST') == 'true' and not os.environ.get('VERCEL')
    options = {'sslmode':'disable'} if insecure else {
        'sslmode':'verify-full','sslrootcert':os.environ.get('TIGER_SSLROOTCERT','system')}
    return psycopg.connect(url, autocommit=True, connect_timeout=10, application_name='gilded-ace-hourly-import', **options)


def migrate(conn, schema):
    schema_name(schema)
    row = conn.execute("SELECT extversion FROM pg_extension WHERE extname='timescaledb'").fetchone()
    if not row or tuple(map(int,row[0].split('.')[:2])) < (2,13):
        raise ValueError('TimescaleDB >=2.13 is required; inspect/enable the extension in Tiger Cloud')
    text=(ROOT/'db/tiger/001_hourly.sql').read_text(encoding='utf-8').replace('__SCHEMA__',schema)
    with conn.transaction():
        conn.execute(text)
    return row[0]


def reconcile(conn, source, schema):
    schema_name(schema)
    rows=conn.execute(f'''SELECT machine_id,gaming_date,count(*)*3600,
      sum(available_seconds),sum(occupied_seconds),sum(coin_in_cents),sum(payout_cents),
      sum(coin_in_cents*(1-configured_rtp)), min(location_id),min(config_id),min(zone_id),min(bank_id),
      count(DISTINCT (location_id,config_id,zone_id,bank_id))
      FROM {schema}.machine_hour WHERE active GROUP BY machine_id,gaming_date ORDER BY machine_id,gaming_date''').fetchall()
    expected=source.execute('''SELECT d.machine_id,d.gaming_date,d.scheduled_seconds,d.available_seconds,d.occupied_seconds,
      d.coin_in_cents,d.payout_cents,d.theo_cents,d.location_id,d.config_id,p.zone_id,p.bank_id
      FROM machine_day d JOIN prepared_daily_view p USING(machine_id,gaming_date) WHERE d.active ORDER BY d.machine_id,d.gaming_date''').fetchall()
    if len(rows)!=len(expected): raise ValueError('Database daily support differs from original daily source')
    maxima=[Decimal(0)]*6
    for actual, reference in zip(rows,expected):
        if actual[:2]!=reference[:2] or actual[8:12]!=reference[8:12] or actual[12]!=1:
            raise ValueError('Database historical placement/configuration mismatch')
        for i in range(6):
            difference=abs(Decimal(actual[i+2])-Decimal(reference[i+2]));maxima[i]=max(maxima[i],difference)
            if difference>(Decimal('0.000001') if i==5 else Decimal(0)):
                raise ValueError('Database hourly/daily source reconciliation failed')
    bad=conn.execute(f'''SELECT count(*) FROM {schema}.machine_hour WHERE
      hour_start_local<>(hour_start_utc AT TIME ZONE 'America/Los_Angeles') OR
      gaming_date<>cast(hour_start_local-INTERVAL '6 hours' AS date) OR local_hour<>extract(hour from hour_start_local)''').fetchone()[0]
    if bad: raise ValueError('Database UTC/local/DST/gaming-day validation failed')
    raw=conn.execute(f'''SELECT zone_id,bank_id,local_hour,is_weekend,count(*),sum(available_seconds),sum(occupied_seconds),
      sum(coin_in_cents),sum(payout_cents),sum(coin_in_cents*(1-configured_rtp)) FROM {schema}.machine_hour WHERE active
      GROUP BY zone_id,bank_id,local_hour,is_weekend ORDER BY 1,2,3,4''').fetchall()
    agg=conn.execute(f'''SELECT zone_id,bank_id,local_hour,is_weekend,sum(records),sum(available_seconds),sum(occupied_seconds),
      sum(coin_in_cents),sum(payout_cents),sum(theo_cents) FROM {schema}.bank_hourly
      GROUP BY zone_id,bank_id,local_hour,is_weekend ORDER BY 1,2,3,4''').fetchall()
    if raw!=agg: raise ValueError('Continuous aggregate differs from raw hypertable')
    count=conn.execute(f'SELECT count(*) FROM {schema}.machine_hour').fetchone()[0]
    return {'passed':True,'importedRows':count,'activeMachineDays':len(rows),
            'maxAbsoluteDifferences':dict(zip(['scheduledSeconds','availableSeconds','occupiedSeconds','coinInCents','payoutCents','theoCents'],map(str,maxima))),
            'tolerances':{'integerMeters':0,'theoCents':'0.000001'},
            'temporalFailures':bad,'rawAggregateEquality':True,'aggregateResultRows':len(raw)}


def scram(password):
    salt=secrets.token_bytes(16)
    salted=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,4096)
    stored=hashlib.sha256(hmac.new(salted,b'Client Key','sha256').digest()).digest()
    server=hmac.new(salted,b'Server Key','sha256').digest()
    b64=lambda v:base64.b64encode(v).decode()
    return f'SCRAM-SHA-256$4096:{b64(salt)}${b64(stored)}:{b64(server)}'


def create_reader(conn, schema, output):
    role='gilded_hourly_reader'
    output=Path(output)
    existing=conn.execute('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=%s',(role,)).fetchone()
    if existing:
        if any(existing): raise ValueError('Reader role has excessive privileges')
        if not output.exists(): raise ValueError('Reader already exists; configure its existing credential instead of rotating it silently')
    else:
        password=secrets.token_urlsafe(32)
        conn.execute(sql.SQL('CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD {}').format(sql.Identifier(role),sql.Literal(scram(password))))
        parsed=urlsplit(os.environ.get('TIGER_IMPORT_DATABASE_URL') or os.environ['TIGER_TEST_DATABASE_URL'])
        host=parsed.hostname
        if ':' in host:host='['+host+']'
        netloc=quote(role,safe='')+':'+quote(password,safe='')+'@'+host+(f':{parsed.port}' if parsed.port else '')
        url=urlunsplit((parsed.scheme,netloc,parsed.path,parsed.query,''))
        content='DATABASE_URL='+url+'\nTIGER_SCHEMA='+schema+'\n'
        if os.environ.get('TIGER_TLS_TRUST') in ['provisional-development','public-ca-verified']:
            content+='TIGER_TLS_TRUST='+os.environ['TIGER_TLS_TRUST']+'\n'
        if os.environ.get('TIGER_SSLROOTCERT'):
            content+='TIGER_SSLROOTCERT='+os.environ['TIGER_SSLROOTCERT']+'\n'
        if os.environ.get('TIGER_SERVICE_LABEL'):
            label=os.environ['TIGER_SERVICE_LABEL']
            if not re.fullmatch(r'[a-zA-Z0-9 ()_.-]{1,100}',label):raise ValueError('Invalid service label')
            content+='TIGER_SERVICE_LABEL='+label+'\n'
        if parsed.hostname in ['localhost','127.0.0.1','::1']:
            content+='TIGER_ALLOW_INSECURE_LOCALHOST=true\nTIGER_SERVICE_LABEL=Local TimescaleDB validation (not Tiger Cloud)\n'
        output.write_text(content,encoding='utf-8')
        try:output.chmod(0o600)
        except OSError:pass
    conn.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO {}').format(sql.Identifier(schema),sql.Identifier(role)))
    for table in ['machine_hour','bank_hourly','dataset_state']:
        conn.execute(sql.SQL('GRANT SELECT ON {}.{} TO {}').format(sql.Identifier(schema),sql.Identifier(table),sql.Identifier(role)))
    conn.execute(sql.SQL('ALTER ROLE {} SET default_transaction_read_only=on').format(sql.Identifier(role)))
    print('Read-only role prepared; connection written only to the ignored reader environment file.')


def main():
    p=argparse.ArgumentParser();p.add_argument('--source',default='sources/dashboard-royale-main')
    p.add_argument('--schema',default='dashboard_hourly');p.add_argument('--batch-size',type=int,default=25000)
    p.add_argument('--verify-only',action='store_true');p.add_argument('--create-reader',action='store_true')
    p.add_argument('--reader-output',default='.env.tiger-reader.local');p.add_argument('--output',default='docs/TIGER_DATABASE_VALIDATION.json')
    args=p.parse_args();schema=schema_name(args.schema)
    if not 1000<=args.batch_size<=100000:raise ValueError('Batch size must be 1000-100000')
    source,binding=open_source(args.source);checks=validate_source(source,binding)
    conn=connect();version=migrate(conn,schema)
    prior=conn.execute(f'SELECT manifest_sha256,machine_hour_sha256,verified FROM {schema}.dataset_state WHERE singleton').fetchone()
    if prior and prior[:2]!=(binding['manifestSha256'],binding['machineHourSha256']):
        raise ValueError('Database belongs to a different source release; use a separate schema')
    conn.execute(f'''INSERT INTO {schema}.dataset_state(singleton,schema_version,source_version,manifest_sha256,machine_hour_sha256,expected_rows)
      VALUES(true,1,%s,%s,%s,%s) ON CONFLICT(singleton) DO NOTHING''',
      (binding['sourceVersion'],binding['manifestSha256'],binding['machineHourSha256'],binding['expectedRows']))
    started=time.perf_counter();processed=0
    if not args.verify_only and not (prior and prior[2]):
        conn.execute(f'CREATE TEMP TABLE hourly_import_stage (LIKE {schema}.machine_hour INCLUDING DEFAULTS)')
        columns=','.join(IMPORT_COLUMNS)
        for batch in batches(source,args.batch_size):
            # A committed batch can safely be retried: the source grain is the PK.
            for attempt in range(3):
                try:
                    with conn.transaction():
                        conn.execute('TRUNCATE hourly_import_stage')
                        with conn.cursor().copy('COPY hourly_import_stage ('+columns+') FROM STDIN') as copy:
                            for row in batch.to_pylist():
                                row['hour_start_utc']=row['hour_start_utc'].replace(tzinfo=timezone.utc)
                                copy.write_row(tuple(row[c] for c in IMPORT_COLUMNS))
                        conn.execute(f'INSERT INTO {schema}.machine_hour ({columns}) SELECT {columns} FROM hourly_import_stage ON CONFLICT(machine_id,hour_start_utc) DO NOTHING')
                    break
                except (psycopg.errors.SerializationFailure,psycopg.errors.DeadlockDetected):
                    if attempt==2:raise
                    time.sleep(0.5*(attempt+1))
                except psycopg.OperationalError:
                    if attempt==2:raise
                    conn.close();time.sleep(1+attempt);conn=connect()
                    conn.execute(f'CREATE TEMP TABLE hourly_import_stage (LIKE {schema}.machine_hour INCLUDING DEFAULTS)')
                    print('Transient connection failure: safely retrying the same idempotent batch.',flush=True)
            processed+=batch.num_rows
            print(f'Imported/verified source batch: {processed:,}/{binding["expectedRows"]:,} rows',flush=True)
        bounds=conn.execute(f'SELECT min(hour_start_utc),max(hour_start_utc)+INTERVAL \'1 hour\' FROM {schema}.machine_hour').fetchone()
        conn.execute(f"CALL refresh_continuous_aggregate('{schema}.bank_hourly', %s::timestamptz, %s::timestamptz)",bounds)
        conn.execute(f'ANALYZE {schema}.machine_hour');conn.execute(f'ANALYZE {schema}.bank_hourly')
    verified=reconcile(conn,source,schema)
    if verified['importedRows']!=binding['expectedRows']:raise ValueError('Imported source count is incomplete')
    conn.execute(f'''UPDATE {schema}.dataset_state SET verified=true,verified_at=now(),imported_rows=%s,source_checks=%s WHERE singleton''',
                 (verified['importedRows'],Jsonb(checks)))
    if args.create_reader:create_reader(conn,schema,args.reader_output)
    report={'status':'passed','environment':'local-validation' if 'Local' in os.environ.get('TIGER_SERVICE_LABEL','') or urlsplit(os.environ.get('TIGER_IMPORT_DATABASE_URL','')).hostname in ['127.0.0.1','localhost'] else 'Tiger Cloud connection',
            'timescaleVersion':version,'schema':schema,'source':checks,'database':verified,
            'tlsTrust':os.environ.get('TIGER_TLS_TRUST','configured-trust'),
            'processedRowsThisRun':processed,'elapsedSeconds':round(time.perf_counter()-started,3)}
    Path(args.output).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','importedRows':verified['importedRows'],'version':version,'reconciled':True,'environment':report['environment']}))
    conn.close();source.close()


if __name__=='__main__':
    try:main()
    except Exception as e:
        # Never print provider exception strings, connection URIs, or passwords.
        print('Tiger import failed: '+(str(e) if isinstance(e,ValueError) else type(e).__name__+' SQLSTATE '+str(getattr(e,'sqlstate',None))),file=sys.stderr)
        sys.exit(1)
