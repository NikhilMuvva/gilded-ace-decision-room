"""Independent, tiny Parquet fixtures exercise the actual temporal preprocessing."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import date, datetime
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from tiger_source import open_source, validate_source, batches, SOURCE_COLUMNS
import pyarrow as pa
import pyarrow.parquet as pq


class TigerSourceTest(unittest.TestCase):
    def fixture(self, root, variant=None):
        base=Path(root)/'data';base.mkdir()
        def table(name, rows, schema=None):
            pq.write_table(pa.Table.from_pylist(rows,schema=schema),base/(name+'.parquet'))
        hours=[]
        for utc,local,offset,day,location in [(9,1,'-08:00',8,'L1'),(10,3,'-07:00',8,'L1'),(13,6,'-07:00',9,'L2')]:
            hours.append(dict(zip(SOURCE_COLUMNS,['M1',datetime(2025,3,9,utc),datetime(2025,3,9,local),local,offset,date(2025,3,day),location,True,3600,1800,100,50,10000,9000,5000,4500,50])))
        schema=pa.schema([(c,pa.timestamp('us') if c in ['hour_start_utc','hour_start_local'] else pa.date32() if c=='gaming_date' else pa.bool_() if c=='active' else pa.int32() if c=='local_hour' else pa.string() if c in ['machine_id','utc_offset','location_id'] else pa.int64()) for c in SOURCE_COLUMNS])
        table('machine_hour',hours,schema)
        placements=[{'machine_id':'M1','location_id':'L1','placement_id':'P1','config_id':'G1','effective_from_utc':datetime(2025,1,1),'effective_to_utc':datetime(2025,3,9,13)},
          {'machine_id':'M1','location_id':'L2','placement_id':'P2','config_id':'G2','effective_from_utc':datetime(2025,3,9,13),'effective_to_utc':None}]
        if variant=='gap':placements[0]['effective_to_utc']=datetime(2025,3,9,10)
        if variant=='overlap':placements.append({**placements[0],'placement_id':'DUP'})
        table('placements',placements)
        table('floor_locations',[{'location_id':f'L{i}','zone_id':f'Z{i}','bank_id':f'B{i}','node_type':'slot'} for i in [1,2]])
        table('game_math',[{'config_id':'G1','configured_rtp':Decimal('.90000000')},{'config_id':'G2','configured_rtp':Decimal('.80000000')}])
        table('calendar_day',[{'gaming_date':date(2025,3,8),'gaming_day_start_utc':datetime(2025,3,8,14),'gaming_day_end_utc':datetime(2025,3,9,13),'scheduled_seconds':82800,'is_weekend':True},
          {'gaming_date':date(2025,3,9),'gaming_day_start_utc':datetime(2025,3,9,13),'gaming_day_end_utc':datetime(2025,3,10,13),'scheduled_seconds':86400,'is_weekend':True}])
        daily=[]
        for day,n,i,rtp in [(8,2,1,Decimal('.9')),(9,1,2,Decimal('.8'))]:
            daily.append({'machine_id':'M1','gaming_date':date(2025,3,day),'active':True,'location_id':f'L{i}','config_id':f'G{i}','scheduled_seconds':3600*n,'available_seconds':3600*n,'occupied_seconds':1800*n,'coin_in_cents':10000*n,'payout_cents':9000*n,'theo_cents':Decimal(10000*n)*(1-rtp)})
        table('machine_day',daily)
        table('prepared_daily_view',[{'machine_id':'M1','gaming_date':date(2025,3,day),'zone_id':f'Z{i}','bank_id':f'B{i}'} for day,i in [(8,1),(9,2)]])
        table('machines',[{'machine_id':'M1','install_date':date(2025,1,1),'retire_date':None}],pa.schema([('machine_id',pa.string()),('install_date',pa.date32()),('retire_date',pa.date32())]))
        entries=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rows':pq.ParquetFile(p).metadata.num_rows} for p in sorted(base.glob('*.parquet'))]
        (base/'manifest.json').write_text(json.dumps({'version':'fixture','files':entries}),encoding='utf-8')

    def test_dst_and_06_boundary_preserve_historical_configuration(self):
        with tempfile.TemporaryDirectory() as root:
            self.fixture(root);con,binding=open_source(root)
            try:
                result=validate_source(con,binding)
                self.assertTrue(result['allPassed']);self.assertEqual(result['totals']['records'],'3')
                rows=[r for b in batches(con,2) for r in b.to_pylist()]
                self.assertEqual([(r['local_hour'],r['config_id'],r['zone_id']) for r in rows],[(1,'G1','Z1'),(3,'G1','Z1'),(6,'G2','Z2')])
                self.assertEqual(Decimal(result['totals']['theoCents']),Decimal('4000'))
            finally:con.close()

    def test_gaps_and_overlaps_are_rejected_without_dropping_rows(self):
        for variant,reason in [('gap','No unattributed active observation'),('overlap','Temporal join preserves')]:
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as root:
                self.fixture(root,variant);con,binding=open_source(root)
                try:
                    with self.assertRaisesRegex(ValueError,reason):validate_source(con,binding)
                finally:con.close()

    def test_manifest_tampering_is_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            self.fixture(root)
            with (Path(root)/'data/machine_hour.parquet').open('ab') as f:f.write(b'tampered')
            with self.assertRaisesRegex(ValueError,'Source manifest mismatch'):open_source(root)


if __name__=='__main__':unittest.main()
