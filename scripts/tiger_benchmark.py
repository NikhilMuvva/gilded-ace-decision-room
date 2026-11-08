"""Actual PostgreSQL EXPLAIN ANALYZE measurements; no invented speedup or cloud claim."""
import argparse
import json
import os
from pathlib import Path
import statistics
from urllib.parse import urlsplit
from tiger_import import connect, schema_name


def main():
    p=argparse.ArgumentParser();p.add_argument('--schema',default='dashboard_hourly');p.add_argument('--runs',type=int,default=5)
    p.add_argument('--output',default='docs/TIGER_QUERY_BENCHMARK.json');args=p.parse_args()
    if not 3<=args.runs<=10:raise ValueError('Benchmark requires 3-10 measured runs')
    schema=schema_name(args.schema)
    url=os.environ.get('DATABASE_URL') or os.environ.get('TIGER_IMPORT_DATABASE_URL')
    conn=connect(url)
    version=conn.execute("SELECT extversion FROM pg_extension WHERE extname='timescaledb'").fetchone()[0]
    conn.execute('SET default_transaction_read_only=on')
    results=[]
    for name,start,end,zone,weekend in [('full-property','2025-01-01','2025-07-01',None,None),('back-forty','2025-01-01','2025-07-01','Z-B40',None),('march-weekends','2025-03-01','2025-04-01',None,True)]:
        statements=[]
        for raw in [True,False]:
            stamp='hour_start_utc' if raw else 'bucket_utc'
            where=f'''{('active AND ' if raw else '')}{stamp} >= ((%s::date+TIME '06:00') AT TIME ZONE 'America/Los_Angeles')
              AND {stamp} < ((%s::date+TIME '06:00') AT TIME ZONE 'America/Los_Angeles')
              AND gaming_date>=%s::date AND gaming_date<%s::date AND (%s::text IS NULL OR zone_id=%s)
              AND (%s::boolean IS NULL OR is_weekend=%s)'''
            table=f'{schema}.'+('machine_hour' if raw else 'bank_hourly')
            statement=f'''SELECT zone_id,local_hour,is_weekend,{('count(*)' if raw else 'sum(records)')},
              sum(available_seconds),sum(occupied_seconds),sum(coin_in_cents),sum(payout_cents),
              sum({('coin_in_cents*(1-configured_rtp)' if raw else 'theo_cents')})
              FROM {table} WHERE {where} GROUP BY zone_id,local_hour,is_weekend ORDER BY 1,2,3'''
            values=(start,end,start,end,zone,zone,weekend,weekend)
            physical=conn.execute(f'SELECT count(*) FROM {table} WHERE {where}',values).fetchone()[0]
            rows=conn.execute(statement,values).fetchall() # equal-scope warm-up
            statements.append((statement,values,rows,physical))
        if statements[0][2]!=statements[1][2]:raise ValueError('Benchmark result mismatch')
        timings=[[],[]]
        for _ in range(args.runs):
            for i,(statement,values,rows,physical) in enumerate(statements):
                plan=conn.execute('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statement,values).fetchone()[0][0]
                timings[i].append(plan['Execution Time'])
        raw_median,agg_median=map(statistics.median,timings)
        result={'scope':name,'startGamingDate':start,'endExclusiveGamingDate':end,'zone':zone,'weekend':weekend,
          'sourceRecordsRepresented':int(sum(r[3] for r in statements[0][2])),
          'rawRowsInScope':statements[0][3],'aggregateRowsInScope':statements[1][3],
          'resultRows':len(statements[0][2]),'equal':True,
          'rawExplainExecutionMs':timings[0],'continuousAggregateExplainExecutionMs':timings[1],
          'rawMedianMs':raw_median,'continuousAggregateMedianMs':agg_median,
          'observedSpeedRatio':raw_median/agg_median if agg_median else None}
        results.append(result)
        print(json.dumps({'scope':name,'equal':True,'rawMedianMs':raw_median,'aggregateMedianMs':agg_median,'ratio':result['observedSpeedRatio']}),flush=True)
    report={'status':'passed','environment':'local-validation' if urlsplit(url).hostname in ['127.0.0.1','localhost'] else 'Tiger Cloud connection',
      'serviceLabel':os.environ.get('TIGER_SERVICE_LABEL','Configured hourly service'),'timescaleVersion':version,'schema':schema,
      'tlsTrust':os.environ.get('TIGER_TLS_TRUST','configured-trust'),
      'method':'EXPLAIN ANALYZE database execution time; one warm-up per query, then alternating raw/CAGG runs. Same scope and complete output equality. Not HTTP latency, cache-hit timing or an invented guarantee.',
      'queries':results}
    Path(args.output).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');conn.close()


if __name__=='__main__':
    try:main()
    except Exception as e:
        print('Tiger benchmark failed: '+(str(e) if isinstance(e,ValueError) else type(e).__name__))
        raise SystemExit(1)
