"""Aggregate-only discovery scan. No original source mutation or player identifiers exported."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.python-deps'))
import pandas as pd
import numpy as np
base=ROOT/'sources/dashboard-royale-main/data'
def load(name):return pd.read_parquet(next(base.rglob(name+'.parquet')))
d=load('prepared_daily_view'); d=d[d.active].copy()
for col in d.select_dtypes(include=['object','str']):
    if len(d[col].dropna()) and not isinstance(d[col].dropna().iloc[0],str):
        try:d[col]=pd.to_numeric(d[col])
        except (ValueError,TypeError):pass
raw=load('machine_day');ops=load('operations');hour=load('machine_hour')
d=d.merge(raw[['machine_id','gaming_date','scheduled_seconds']],on=['machine_id','gaming_date'],validate='one_to_one')
d['cost']=d[['lease_cost_usd','service_cost_usd','power_cost_usd','repair_cost_usd']].sum(axis=1)
d['theoContribution']=d.theo_usd-d.cost
d['down']=d.scheduled_seconds/3600-d.available_hours
g=d.groupby('machine_id').agg(coin=('coin_in_usd','sum'),win=('house_win_usd','sum'),theo=('theo_usd','sum'),cost=('cost','sum'),lease=('lease_cost_usd','sum'),repair=('repair_cost_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),down=('down','sum'),contribution=('contribution_after_supplied_costs_usd','sum'),theoContribution=('theoContribution','sum'),manufacturer=('manufacturer','last'),zone=('zone_name','last'),bank=('bank_id','last'),leaseClass=('lease_class','last'))
g['costShare']=g.cost/g.theo;g['occupancy']=g.occupied/g.available
print('ECONOMICS',g.nsmallest(10,'theoContribution').round(3).to_json(orient='index'))
print('NEGATIVE',json.dumps({'actual':int((g.contribution<0).sum()),'theoretical':int((g.theoContribution<0).sum()),'highestCostShare':float(g.costShare.max())}))
f=ops[ops.event_type.eq('fault_repair')].copy();f['wait']=(pd.to_datetime(f.work_started_at_utc)-pd.to_datetime(f.opened_at_utc)).dt.total_seconds()/3600;f['repair']=(pd.to_datetime(f.available_at_utc)-pd.to_datetime(f.work_started_at_utc)).dt.total_seconds()/3600
fm=f.groupby('machine_id').agg(faults=('operation_id','size'),wait=('wait','sum'),repairHours=('repair','sum'),directCost=('direct_cost_cents','sum'))
print('FAULTS',fm.nlargest(10,'faults').to_json(orient='index'))
meta=d.groupby('machine_id').manufacturer.last();f=f.merge(meta,on='machine_id',validate='many_to_one')
print('MANUFACTURER',f.groupby('manufacturer').agg(tickets=('operation_id','size'),queue=('wait','sum'),repair=('repair','sum'),cost=('direct_cost_cents','sum')).round(3).to_json(orient='index'))
print('MANUF_EXPOSURE',d.groupby('manufacturer').agg(days=('gaming_date','size'),down=('down','sum'),theo=('theo_usd','sum')).round(3).to_json(orient='index'))
b=d.groupby('bank_id').agg(zone=('zone_name','last'),theo=('theo_usd','sum'),coin=('coin_in_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),down=('down','sum'),cost=('cost','sum'))
b['theoHour']=b.theo/b.available;b['occupancy']=b.occupied/b.available
print('BANKS',b.nsmallest(8,'theoHour').round(3).to_json(orient='index'))
print('ZONEMONTH',d.groupby(['zone_name','month']).agg(theo=('theo_usd','sum'),coin=('coin_in_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum')).round(3).to_json(orient='index',default_handler=str))
hour['down']=(3600-hour.available_seconds)/3600
h=hour.groupby('local_hour').agg(coin=('coin_in_cents','sum'),available=('available_seconds','sum'),occupied=('occupied_seconds','sum'),down=('down','sum'))
h['coinHour']=h.coin/100/(h.available/3600);h['occupancy']=h.occupied/h.available
print('HOUR',h.round(3).to_json(orient='index'))
print('OP_EVENTS',ops.event_type.value_counts().to_json())
print('SCHEDULE',load('shift_roster').groupby(['role','shift']).agg(planned=('planned_headcount','sum'),actual=('actual_headcount','sum')).to_json(orient='index'))
