"""Read-only validation/preprocessing for the official machine_hour Parquet.

No imports from the scientific production pipeline. Source files are never changed.
"""
from pathlib import Path
import hashlib
import json
import sys
try:
    import duckdb
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.python-deps'))
    import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

SOURCE_COLUMNS = [
    'machine_id','hour_start_utc','hour_start_local','local_hour','utc_offset',
    'gaming_date','location_id','active','available_seconds','occupied_seconds',
    'paid_spins','payout_positive_spins','coin_in_cents','payout_cents',
    'carded_coin_in_cents','carded_payout_cents','carded_spins',
]
IMPORT_COLUMNS = SOURCE_COLUMNS + ['placement_id','config_id','configured_rtp','zone_id','bank_id','is_weekend']
TABLES = ['machine_hour','placements','floor_locations','game_math','calendar_day','machine_day','prepared_daily_view','machines']


def open_source(source):
    base = Path(source).resolve() / 'data'
    manifest_path = base / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    entries = {f['path']: f for f in manifest['files']}
    paths = {}
    for name in TABLES:
        matches = list(base.rglob(name+'.parquet'))
        if len(matches) != 1:
            raise ValueError('Expected one source Parquet: '+name)
        p = matches[0]; entry = entries[p.relative_to(base).as_posix()]
        if p.stat().st_size != entry['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Source manifest mismatch: '+name)
        paths[name] = p
    schema = pq.ParquetFile(paths['machine_hour']).schema_arrow
    if schema.names != SOURCE_COLUMNS or schema.field('hour_start_utc').type != pa.timestamp('us'):
        raise ValueError('Unexpected machine_hour source schema')
    for field in ['available_seconds','occupied_seconds','coin_in_cents','payout_cents']:
        if schema.field(field).type != pa.int64():
            raise ValueError('Unexpected integer source type: '+field)
    con = duckdb.connect(':memory:')
    con.execute("SET TimeZone='UTC'")
    for name, path in paths.items():
        con.read_parquet(str(path)).create_view(name)
    # All attribution uses the observation's timestamp and source location, never
    # a machine's current placement. Keep LEFT JOINs so failures remain visible.
    con.execute('''CREATE VIEW attributed_hour AS
      SELECT h.*, p.placement_id, p.config_id, g.configured_rtp,
             l.zone_id, l.bank_id, c.is_weekend,
             c.gaming_day_start_utc, c.gaming_day_end_utc
      FROM machine_hour h
      LEFT JOIN placements p ON h.machine_id=p.machine_id AND h.location_id=p.location_id
        AND h.hour_start_utc>=p.effective_from_utc
        AND (p.effective_to_utc IS NULL OR h.hour_start_utc<p.effective_to_utc)
      LEFT JOIN floor_locations l ON h.location_id=l.location_id AND l.node_type='slot'
      LEFT JOIN game_math g ON p.config_id=g.config_id
      LEFT JOIN calendar_day c ON h.gaming_date=c.gaming_date''')
    con.execute('''CREATE VIEW daily_hour AS SELECT machine_id,gaming_date,
      count(*)*3600 AS scheduled_seconds, sum(available_seconds) AS available_seconds,
      sum(occupied_seconds) AS occupied_seconds, sum(coin_in_cents) AS coin_in_cents,
      sum(payout_cents) AS payout_cents,
      sum(coin_in_cents*(1-configured_rtp)) AS theo_cents
      FROM attributed_hour WHERE active GROUP BY machine_id,gaming_date''')
    binding = {
        'sourceVersion': manifest['version'],
        'manifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        'machineHourSha256': entries[paths['machine_hour'].relative_to(base).as_posix()]['sha256'],
        'expectedRows': entries[paths['machine_hour'].relative_to(base).as_posix()]['rows'],
    }
    return con, binding


def validate_source(con, binding):
    results = []
    def check(name, sql, expected=0, tolerance=0):
        actual = con.execute(sql).fetchone()[0]
        passed = actual is not None and abs(actual-expected) <= tolerance
        results.append({'name':name,'actual':float(actual) if actual is not None else None,
                        'expected':expected,'tolerance':tolerance,'passed':passed})
        if not passed: raise ValueError('Source validation failed: '+name)
    check('Official machine-hour row count', 'SELECT count(*) FROM machine_hour', binding['expectedRows'])
    check('Unique source machine/timestamp key', 'SELECT count(*)-count(DISTINCT (machine_id,hour_start_utc)) FROM machine_hour')
    check('Temporal join preserves every source row exactly once', 'SELECT count(*) FROM attributed_hour', binding['expectedRows'])
    check('No unattributed active observation', '''SELECT count(*) FROM attributed_hour WHERE active AND
      (placement_id IS NULL OR config_id IS NULL OR configured_rtp IS NULL OR zone_id IS NULL OR bank_id IS NULL)''')
    check('Required hourly values are present', '''SELECT count(*) FROM attributed_hour WHERE machine_id IS NULL OR hour_start_utc IS NULL
      OR hour_start_local IS NULL OR gaming_date IS NULL OR active IS NULL OR available_seconds IS NULL OR occupied_seconds IS NULL
      OR coin_in_cents IS NULL OR payout_cents IS NULL OR is_weekend IS NULL''')
    check('Availability and occupancy bounds', '''SELECT count(*) FROM attributed_hour WHERE available_seconds<0 OR available_seconds>3600
      OR occupied_seconds<0 OR occupied_seconds>available_seconds''')
    check('UTC to Las Vegas local timestamp', """SELECT count(*) FROM attributed_hour WHERE
      ((hour_start_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Los_Angeles')<>hour_start_local OR local_hour<>hour(hour_start_local)""")
    check('UTC offset agrees with timestamp difference', """SELECT count(*) FROM attributed_hour WHERE
      date_diff('minute',hour_start_utc,hour_start_local) <>
      (CASE WHEN left(utc_offset,1)='-' THEN -1 ELSE 1 END)*(cast(substr(utc_offset,2,2) AS INTEGER)*60+cast(substr(utc_offset,5,2) AS INTEGER))""")
    check('Gaming day uses 06:00 local boundary', "SELECT count(*) FROM attributed_hour WHERE cast(hour_start_local-INTERVAL '6 hours' AS DATE)<>gaming_date")
    check('Calendar interval membership', '''SELECT count(*) FROM attributed_hour WHERE gaming_day_start_utc IS NULL
      OR hour_start_utc<gaming_day_start_utc OR hour_start_utc>=gaming_day_end_utc''')
    check('No hour outside active daily meters or with wrong historical configuration', '''SELECT count(*) FROM attributed_hour h
      LEFT JOIN machine_day d USING(machine_id,gaming_date) WHERE d.machine_id IS NULL OR NOT d.active OR d.location_id<>h.location_id OR d.config_id<>h.config_id''')
    for col in ['scheduled_seconds','available_seconds','occupied_seconds','coin_in_cents','payout_cents']:
        check('Hourly versus active daily '+col, f'''SELECT coalesce(max(abs(h.{col}-d.{col})),0) FROM daily_hour h
          FULL OUTER JOIN (SELECT * FROM machine_day WHERE active) d USING(machine_id,gaming_date)''')
    check('Every active day has hourly support', '''SELECT count(*) FROM (SELECT * FROM machine_day WHERE active) d
      FULL OUTER JOIN daily_hour h USING(machine_id,gaming_date) WHERE d.machine_id IS NULL OR h.machine_id IS NULL''')
    check('Hourly theoretical cents versus game-math daily meter', '''SELECT max(abs(h.theo_cents-d.theo_cents)) FROM daily_hour h JOIN machine_day d USING(machine_id,gaming_date)''', tolerance=0.000001)
    check('March 8 gaming day is 23 elapsed hours', "SELECT scheduled_seconds FROM calendar_day WHERE gaming_date=DATE '2025-03-08'", 82800)
    check('No fictitious local 02:00 spring-forward hour', "SELECT count(*) FROM machine_hour WHERE cast(hour_start_local AS DATE)=DATE '2025-03-09' AND local_hour=2")
    check('Prepared historical zone/bank attribution', '''SELECT count(*) FROM attributed_hour h JOIN prepared_daily_view d USING(machine_id,gaming_date)
      WHERE h.active AND (h.zone_id<>d.zone_id OR h.bank_id<>d.bank_id)''')
    check('Installation/retirement gaming-date bounds', '''SELECT count(*) FROM attributed_hour h JOIN machines m USING(machine_id)
      WHERE h.gaming_date<m.install_date OR (m.retire_date IS NOT NULL AND h.gaming_date>m.retire_date)''')
    totals = con.execute('''SELECT count(*),sum(coin_in_cents),sum(payout_cents),sum(coin_in_cents*(1-configured_rtp)),
      sum(available_seconds),sum(occupied_seconds),sum(3600-available_seconds) FROM attributed_hour WHERE active''').fetchone()
    return {'binding':binding,'checks':results,'allPassed':True,'totals':dict(zip(
        ['records','coinInCents','payoutCents','theoCents','availableSeconds','occupiedSeconds','downtimeSeconds'],
        [str(v) for v in totals]))}


def batches(con, size=25000):
    columns = ','.join(IMPORT_COLUMNS)
    reader = con.execute('SELECT '+columns+' FROM attributed_hour ORDER BY hour_start_utc,machine_id').fetch_record_batch(size)
    yield from reader


if __name__ == '__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--source',default='sources/dashboard-royale-main');p.add_argument('--output',default='docs/TIGER_SOURCE_VALIDATION.json')
    args=p.parse_args();con,binding=open_source(args.source);result=validate_source(con,binding)
    Path(args.output).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'sourceRows':binding['expectedRows'],'checks':len(result['checks']),'allPassed':result['allPassed']}))
