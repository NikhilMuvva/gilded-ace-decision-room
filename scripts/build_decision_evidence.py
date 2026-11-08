"""Independent source-to-decision audit and aggregate operational evidence.

Never imports build_data.py, mutates source tables, exports identities, or reselects the
frozen forecast. All new modeling is labeled retrospective/exploratory.
"""
from pathlib import Path
import sys,json,hashlib,math
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.python-deps'))
import pandas as pd
import numpy as np
from scientific_core import bh,ratio,block_weights,ratio_intervals,poisson_tail,poisson_glm,fixed_effect_association,moment_distribution,calendar_predict,quiet_window
from scientific_core import peer_reference

SOURCE=ROOT/'sources/dashboard-royale-main/data'
manifest_path=SOURCE/'manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
source_hash=hashlib.sha256(manifest_path.read_bytes()).hexdigest()
PRIMARY=json.loads((ROOT/'public/data/dashboard.json').read_text())
checks=[];used={}

def check(name,passed,detail=None):
    record={'name':name,'passed':bool(passed)}
    if detail is not None:record['detail']=detail
    checks.append(record)
    if not passed:raise AssertionError(name)

def close(name,a,b,tol=1e-7):
    a,b=np.broadcast_arrays(np.asarray(a,float),np.asarray(b,float))
    delta=float(np.max(np.abs(a-b))) if a.size else 0.
    check(name,np.isfinite(a).all() and np.isfinite(b).all() and delta<=tol,{'maxAbsoluteError':delta,'tolerance':tol})

def load(name,columns=None):
    path,=SOURCE.rglob(name+'.parquet');frame=pd.read_parquet(path,columns=columns)
    used[name]={'rows':len(frame),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    for col in frame.select_dtypes(include=['object','str']):
        first=frame[col].dropna()
        if len(first) and not isinstance(first.iloc[0],str):
            try:frame[col]=pd.to_numeric(frame[col])
            except (ValueError,TypeError):pass
    return frame

def unique(frame,keys,name):check(name+' unique keys',not frame.duplicated(keys).any())
def gaming_dates(values):return (pd.to_datetime(values,utc=True).dt.tz_convert('America/Los_Angeles').dt.tz_localize(None)-pd.Timedelta(hours=6)).dt.normalize()
def safe(value):
    if isinstance(value,dict):return {str(k):safe(v) for k,v in value.items()}
    if isinstance(value,(list,tuple,np.ndarray)):return [safe(v) for v in value]
    if isinstance(value,(pd.Timestamp,np.datetime64)):return str(value)[:10]
    if isinstance(value,np.integer):return int(value)
    if isinstance(value,np.bool_):return bool(value)
    if isinstance(value,(float,np.floating)):return float(value) if math.isfinite(value) else None
    if value is pd.NA or value is pd.NaT:return None
    return value
def records(frame):return safe(frame.to_dict('records'))
def write(path,value):path.write_text(json.dumps(safe(value),indent=2,allow_nan=False)+'\n',encoding='utf-8')

print('Independent audit: meters, placements, costs and all-play accounting...',flush=True)
check('Source release matches the preserved analytical artifact',manifest['version']==PRIMARY['version']=='0.9.0-draft')
d=load('prepared_daily_view');raw=load('machine_day');prop=load('property_day');cal=load('calendar_day');games=load('game_math');machines=load('machines');locations=load('floor_locations');placements=load('placements');ops=load('operations');catalog=load('action_catalog');rules=load('cost_rules')
for frame,keys,name in [(d,['machine_id','gaming_date'],'prepared daily'),(raw,['machine_id','gaming_date'],'raw meters'),(prop,['gaming_date'],'property'),(cal,['gaming_date'],'calendar'),(games,['config_id'],'game math'),(machines,['machine_id'],'machines'),(locations,['location_id'],'floor locations'),(placements,['placement_id'],'placements'),(ops,['operation_id'],'operations'),(catalog,['action_type_id'],'action catalog'),(rules,['cost_rule_id'],'cost rules')]:unique(frame,keys,name)
for frame in [d,raw,prop,cal]:frame['gaming_date']=pd.to_datetime(frame.gaming_date)
check('Expected on/off-floor accounting',len(d)==56110 and d.active.sum()==55092 and (~d.active).sum()==1018)
check('Inactive rows have no wagers or operating exposure',raw.loc[~raw.active,['coin_in_cents','payout_cents','scheduled_seconds','available_seconds','occupied_seconds']].eq(0).all().all())
close('Raw house win integer identity',raw.house_win_cents,raw.coin_in_cents-raw.payout_cents,0)
check('Raw availability and occupancy bounds',raw.available_seconds.between(0,raw.scheduled_seconds).all() and raw.occupied_seconds.between(0,raw.available_seconds).all())
check('Prepared exposure denominators null off floor',d.loc[~d.active,'availability_ratio'].isna().all())
active=d[d.active].copy().reset_index(drop=True)
raw_active=raw[raw.active].set_index(['machine_id','gaming_date']).loc[pd.MultiIndex.from_frame(active[['machine_id','gaming_date']])]
for prepared,raw_col in [('coin_in_usd','coin_in_cents'),('payout_usd','payout_cents'),('house_win_usd','house_win_cents'),('theo_usd','theo_cents')]:close('Prepared versus raw '+prepared,active[prepared],raw_active[raw_col].to_numpy()/100,1e-7)
close('Available hours from raw seconds',active.available_hours,raw_active.available_seconds.to_numpy()/3600,1e-8)
close('Occupied hours from raw seconds',active.occupied_hours,raw_active.occupied_seconds.to_numpy()/3600,1e-8)
active['scheduled']=raw_active.scheduled_seconds.to_numpy()/3600;active['down']=active.scheduled-active.available_hours
close('Availability ratio',active.availability_ratio,active.available_hours/active.scheduled,1e-10)
played=active.available_hours.gt(0);close('Occupancy ratio',active.loc[played,'occupancy_ratio'],active.loc[played,'occupied_hours']/active.loc[played,'available_hours'],1e-10)
check('DST scheduled exposure',cal.loc[cal.gaming_date.eq('2025-03-08'),'scheduled_seconds'].iloc[0]==82800)
observed=active.coin_in_usd.gt(0)
close('Observed hold ratio',active.loc[observed,'observed_hold'],active.loc[observed,'house_win_usd']/active.loc[observed,'coin_in_usd'],1e-10)
close('Configured RTP theo identity',active.theo_usd,active.coin_in_usd*(1-active.configured_rtp),1e-7)
close('Observed RTP plus hold identity',(active.payout_usd/active.coin_in_usd)[observed]+active.loc[observed,'observed_hold'],1,1e-10)
close('Machine luck residual sign',active.luck_residual_usd,active.house_win_usd-active.theo_usd,1e-7)
for name in ['coin_in_usd','payout_usd','house_win_usd','theo_usd']:
    daily=active.groupby('gaming_date')[name].sum().sort_index();close('Property daily '+name,daily,prop.set_index('gaming_date').loc[daily.index,name],1e-6)
for name,raw_name in [('available_machine_hours','available_hours'),('occupied_machine_hours','occupied_hours')]:close('Property '+name,active.groupby('gaming_date')[raw_name].sum().sort_index(),prop.sort_values('gaming_date')[name],1e-7)
active['dateUtc']=pd.to_datetime(active.gaming_date.dt.strftime('%Y-%m-%d')+' 06:00').dt.tz_localize('America/Los_Angeles').dt.tz_convert('UTC').dt.tz_localize(None)
for mid,g in active.groupby('machine_id'):
    p=placements[placements.machine_id.eq(mid)].sort_values('effective_from_utc')
    start=pd.to_datetime(p.effective_from_utc).to_numpy();end=pd.to_datetime(p.effective_to_utc).fillna(pd.Timestamp('2100-01-01')).to_numpy()
    moments=g.dateUtc.to_numpy();matches=(moments[:,None]>=start)&(moments[:,None]<end)
    if not (matches.sum(axis=1)==1).all():raise AssertionError('Placement interval cardinality')
    positions=matches.argmax(axis=1)
    if not (g.location_id.to_numpy()==p.location_id.to_numpy()[positions]).all():raise AssertionError('Placement location mismatch')
    if not (g.config_id.to_numpy()==p.config_id.to_numpy()[positions]).all():raise AssertionError('Placement configuration mismatch')
check('Every active meter joins exactly one effective placement and configuration',True)
check('No two active machines share a daily slot',not active.duplicated(['gaming_date','location_id']).any())
close('Lease fixed cost rule',active.loc[active.lease_class.eq('leased_fixed'),'lease_cost_usd'],45,1e-8)
share=active.lease_class.eq('leased_revenue_share');close('Revenue-share lease rule',active.loc[share,'lease_cost_usd'],active.loc[share,'house_win_usd'].clip(lower=0)*.2,1e-7)
close('Owned lease cost',active.loc[active.lease_class.eq('owned'),'lease_cost_usd'],0,0)
service={'Northwind':5,'Ridgeline':4,'Halcyon':6}
close('Service and power cost rules',active.service_cost_usd+active.power_cost_usd,active.manufacturer.map(service)+6,1e-8)
fault=ops[ops.event_type.eq('fault_repair')].copy();fault['gaming_date']=gaming_dates(fault.opened_at_utc)
fault_cost=fault.groupby(['machine_id','gaming_date']).direct_cost_cents.sum()/100
expected_cost=active.set_index(['machine_id','gaming_date']).index.map(fault_cost).fillna(0)
close('Repair cost once on opened gaming date',active.repair_cost_usd,expected_cost,1e-8)
active['cost']=active[['lease_cost_usd','service_cost_usd','power_cost_usd','repair_cost_usd']].sum(axis=1)
active['theoContribution']=active.theo_usd-active.cost
close('Machine contribution accounting',active.contribution_after_supplied_costs_usd,active.house_win_usd-active.cost,1e-7)
close('Property machine costs',active.groupby('gaming_date').cost.sum().sort_index(),prop.sort_values('gaming_date').machine_supplied_costs_usd,1e-6)
close('Property contribution counts cogs once',prop.contribution_after_supplied_costs_usd,prop.house_win_usd+prop.pos_cash_usd-prop.pos_cogs_usd-prop.machine_supplied_costs_usd-prop.tech_labor_cost_usd,1e-6)
roster=load('shift_roster');unique(roster,['assignment_id'],'staff roster')
roster['gaming_date']=pd.to_datetime(roster.gaming_date);tech=roster[roster.role.eq('slot_tech')].copy();tech['hours']=(pd.to_datetime(tech.end_utc)-pd.to_datetime(tech.start_utc)).dt.total_seconds()/3600
close('Worked technician labor cost uses actual headcount',tech.assign(cost=tech.hours*tech.actual_headcount*48).groupby('gaming_date').cost.sum().sort_index(),prop.sort_values('gaming_date').tech_labor_cost_usd,1e-6)
for _,a in catalog.iterrows():
    original=next(x for x in PRIMARY['actions'] if x['action_type_id']==a.action_type_id)
    for key in ['unit_cost_cents','recurring_cost_cents_per_day','lead_days','downtime_minutes','quantity_limit']:
        if int(original[key])!=int(a[key]):raise AssertionError('Catalog mismatch '+a.action_type_id+' '+key)
check('All 13 catalog costs/lead/downtime/quantity values match source Parquet',len(catalog)==13)

print('Independent audit: carded sessions, trips, loyalty/POS and traffic...',flush=True)
sessions=load('sessions');unique(sessions,['session_segment_id'],'sessions')
close('Session fixed bets reproduce wagers',sessions.coin_in_cents,sessions.fixed_bet_cents*sessions.paid_spins,0)
close('Session bet-squared units',sessions.sum_bet_squared,sessions.fixed_bet_cents**2*sessions.paid_spins,1e-5)
sessions['gaming_date']=pd.to_datetime(sessions.gaming_date)
close('Session 6am gaming boundaries',(gaming_dates(sessions.start_utc)-sessions.gaming_date).dt.total_seconds(),0,0)
check('Session end after start',pd.to_datetime(sessions.end_utc).ge(pd.to_datetime(sessions.start_utc)).all())
close('Sessions do not cross an unsplit gaming-day boundary',(gaming_dates(pd.to_datetime(sessions.end_utc)-pd.Timedelta(nanoseconds=1))-sessions.gaming_date).dt.total_seconds(),0,0)
sg=sessions.groupby(['machine_id','gaming_date'])[['coin_in_cents','payout_cents','paid_spins']].sum()
rg=raw.set_index(['machine_id','gaming_date'])
for a,b in [('coin_in_cents','carded_coin_in_cents'),('payout_cents','carded_payout_cents'),('paid_spins','carded_spins')]:close('Carded session to meter '+a,sg[a],rg.loc[sg.index,b],0)
trips=load('trips');unique(trips,['observed_visit_id'],'trips')
check('Sessions refer to existing trips and same tracked identity',sessions.merge(trips[['observed_visit_id','player_id']],on='observed_visit_id',validate='many_to_one',suffixes=('','_trip')).eval('player_id == player_id_trip').all())
pp=load('player_period');unique(pp,['player_id','period_month'],'player-month')
close('Tracked player net sign',pp.tracked_net_usd,pp.tracked_payout_usd-pp.tracked_coin_in_usd,1e-8)
close('Tracked contribution once',pp.tracked_contribution_usd,-pp.tracked_net_usd+pp.linked_pos_cash_usd-pp.linked_pos_cogs_usd,1e-8)
close('Tracked wagers sessions versus player-period',sessions.coin_in_cents.sum()/100,pp.tracked_coin_in_usd.sum(),1e-6)
all_guests=pp.groupby('player_id')[['tracked_coin_in_usd','tracked_payout_usd','tracked_net_usd']].sum();gamblers=all_guests[all_guests.tracked_coin_in_usd.gt(0)]
guest_ref=next(g for g in PRIMARY['guests'] if g['start']=='2025-01' and g['end']=='2025-06' and g['dimension']=='all')
close('Guest full-period wagers and payout reconcile',[gamblers.tracked_coin_in_usd.sum(),gamblers.tracked_payout_usd.sum(),gamblers.tracked_net_usd.sum()],[guest_ref['wagers'],guest_ref['payout'],guest_ref['net']],1e-6)
check('Tracked gambler identity deduplication and ahead rate',len(gamblers)==guest_ref['players'] and int(gamblers.tracked_net_usd.gt(0).sum())==guest_ref['ahead'])
ranked_wagers=gamblers.tracked_coin_in_usd.sort_values(ascending=False);ranked_losses=(-gamblers.tracked_net_usd).clip(lower=0).sort_values(ascending=False);top=math.ceil(len(gamblers)*.1)
close('Tracked wager concentration top decile',ranked_wagers.iloc[:top].sum()/ranked_wagers.sum(),guest_ref['wagerConcentration'][2],1e-5)
close('Positive-loss concentration uses its own ranking and denominator',ranked_losses.iloc[:top].sum()/ranked_losses.sum(),guest_ref['top10LossShare'],1e-5)
ledger=load('loyalty_ledger');pos=load('fnb_transactions');unique(ledger,['loyalty_event_id'],'loyalty ledger');unique(pos,['transaction_id'],'POS')
redemption=ledger[ledger.event_type.eq('redeem')].copy();redemption['gaming_date']=gaming_dates(redemption.event_at_utc)
linked=redemption.merge(pos[['transaction_id','item','cogs_cents']],left_on='redeemed_pos_id',right_on='transaction_id',validate='one_to_one')
check('Every redemption links once to POS',len(linked)==len(redemption))
close('Ledger and POS economic cost',linked.economic_cost_cents,linked.cogs_cents,0)
close('Comp cost reconciles to property',redemption.economic_cost_cents.sum()/100,prop.comp_cost_usd.sum(),1e-6)
pos['gaming_date']=gaming_dates(pos.event_at_utc)
for source,target in [('cash_receipt_cents','pos_cash_usd'),('cogs_cents','pos_cogs_usd')]:close('POS daily '+source,pos.groupby('gaming_date')[source].sum().sort_index()/100,prop.sort_values('gaming_date')[target],1e-6)
close('Tracked linked POS cash and cogs independently reconcile',[pp.linked_pos_cash_usd.sum(),pp.linked_pos_cogs_usd.sum()],[pos.loc[pos.player_id.notna(),'cash_receipt_cents'].sum()/100,pos.loc[pos.player_id.notna(),'cogs_cents'].sum()/100],1e-6)
traffic=load('zone_traffic_hourly');unique(traffic,['sensor_id','hour_start_utc'],'traffic counters');traffic['gaming_date']=gaming_dates(traffic.hour_start_utc)
check('Missing traffic is not converted to observed zero',traffic.loc[traffic.coverage_minutes.eq(0),'entries_count'].isna().all())
traffic['month']=traffic.gaming_date.dt.strftime('%Y-%m')
tm=traffic.groupby(['zone_id','month']).agg(entries=('entries_count',lambda x:x.sum(min_count=1)),minutes=('coverage_minutes','sum'),rows=('sensor_id','size')).reset_index()
tm['entriesPerCoveredHour']=tm.entries/(tm.minutes/60);tm['coverage']=tm.minutes/(60*tm.rows)
old=pd.DataFrame(PRIMARY['traffic']).set_index(['zone_id','month']);new=tm.set_index(['zone_id','month']).loc[old.index]
close('Coverage-normalized traffic rates',old.entriesPerCoveredHour,new.entriesPerCoveredHour,1e-5)
check('Traffic coverage ratios bounded',new.coverage.between(0,1).all())
guest_month=pp.groupby('period_month').agg(wagers=('tracked_coin_in_usd','sum'),payout=('tracked_payout_usd','sum'),theo=('theo_usd','sum'),accounts=('player_id','nunique')).reset_index().rename(columns={'period_month':'month'})
del sessions,trips,all_guests,gamblers,ledger,pos,pp,linked

print('Peers, uncertainty, persistence and operational associations...',flush=True)
active=active.merge(raw[['machine_id','gaming_date','sum_bet_squared','paid_spins']],on=['machine_id','gaming_date'],validate='one_to_one').merge(games[['config_id','payout_multiplier_variance','max_bet_cents','max_multiplier']],on='config_id',validate='many_to_one')
active['variance']=active.sum_bet_squared*active.payout_multiplier_variance/10000
keys=['zone_id','config_id','month','local_weekday'];cols=['coin_in_usd','theo_usd','available_hours','occupied_hours','theoContribution']
total=active.groupby(keys)[cols].transform('sum');own=active.groupby(keys+['machine_id'])[cols].transform('sum');others=total-own
wide=active.groupby(keys[1:])[cols].transform('sum')-active.groupby(keys[1:]+['machine_id'])[cols].transform('sum')
support=others.available_hours;use=support.ge(24)
for column,output in [('theo_usd','expected'),('occupied_hours','expectedOccupied'),('coin_in_usd','expectedCoin'),('theoContribution','expectedContribution')]:
    rate=(others[column]/others.available_hours.replace(0,np.nan)).where(use,wide[column]/wide.available_hours)
    fixture_validated_rate,_=peer_reference(active,keys,column)
    close('Controlled-fixture peer implementation '+column,rate,fixture_validated_rate,1e-10)
    active[output]=rate*active.available_hours
active['peerHours']=support;active['fallback']=~use
active['lostTheo']=active.expected/active.available_hours*active.down
active['wideExpected']=wide.theo_usd/wide.available_hours*active.available_hours
check('All active peer references finite and positive',np.isfinite(active.expected).all() and active.expected.gt(0).all())
packed=pd.DataFrame(PRIMARY['rows'],columns=PRIMARY['columns']);packed['machine_id']=packed.machine.map(dict(enumerate(m['id'] for m in PRIMARY['machines'])));packed['gaming_date']=pd.to_datetime(packed.date.map(dict(enumerate(PRIMARY['dates']))))
ordered=active.set_index(['machine_id','gaming_date']).loc[pd.MultiIndex.from_frame(packed[['machine_id','gaming_date']])]
for source,target,tolerance in [('expected','expected',.00051),('lostTheo','lostTheo',.00051),('variance','variance',.00051),('peerHours','peerHours',.0051),('costs','cost',.0051)]:close('Displayed artifact '+source,packed[source],ordered[target],tolerance)
dates=np.sort(active.gaming_date.unique());ids=sorted(active.machine_id.unique());date_map={pd.Timestamp(v):i for i,v in enumerate(dates)}
active['di']=active.gaming_date.map(date_map);active['mi']=active.machine_id.map({v:i for i,v in enumerate(ids)})
def matrix(col):
    out=np.zeros((len(dates),len(ids)));np.add.at(out,(active.di.to_numpy(int),active.mi.to_numpy(int)),active[col].to_numpy(float));return out
weights=block_weights(len(dates),1200,7,20261108,pd.DatetimeIndex(dates).month)
index_ci,index_boot=ratio_intervals(matrix('theo_usd'),matrix('expected'),weights)
occupancy_ci,_=ratio_intervals(matrix('occupied_hours'),matrix('available_hours'),weights)
contribution_ci,_=ratio_intervals(matrix('theoContribution'),matrix('expectedContribution'),weights)
monthly=active.groupby(['machine_id','month']).agg(theo=('theo_usd','sum'),expected=('expected','sum'),expectedOccupied=('expectedOccupied','sum'),expectedContribution=('expectedContribution','sum'),coin=('coin_in_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),down=('down','sum'),cost=('cost','sum'),contribution=('contribution_after_supplied_costs_usd','sum'),theoContribution=('theoContribution','sum'),days=('gaming_date','size'),fallbackDays=('fallback','sum')).reset_index()
monthly['index']=monthly.theo/monthly.expected;monthly['contributionIndex']=monthly.theoContribution/monthly.expectedContribution
fault['waitHours']=(pd.to_datetime(fault.work_started_at_utc)-pd.to_datetime(fault.opened_at_utc)).dt.total_seconds()/3600
fault['repairHours']=(pd.to_datetime(fault.available_at_utc)-pd.to_datetime(fault.work_started_at_utc)).dt.total_seconds()/3600
check('Fault intervals have nonnegative queue and repair',fault.waitHours.ge(0).all() and fault.repairHours.ge(0).all())
fc=fault.groupby(['machine_id','gaming_date']).size().rename('faults')
active=active.merge(fc,on=['machine_id','gaming_date'],how='left',validate='one_to_one');active['faults']=active.faults.fillna(0)
summary=active.groupby('machine_id').agg(win=('house_win_usd','sum'),theo=('theo_usd','sum'),coin=('coin_in_usd','sum'),payout=('payout_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),scheduled=('scheduled','sum'),down=('down','sum'),cost=('cost','sum'),lease=('lease_cost_usd','sum'),service=('service_cost_usd','sum'),repairCost=('repair_cost_usd','sum'),contribution=('contribution_after_supplied_costs_usd','sum'),theoContribution=('theoContribution','sum'),expected=('expected','sum'),wideExpected=('wideExpected','sum'),expectedContribution=('expectedContribution','sum'),expectedOccupied=('expectedOccupied','sum'),variance=('variance','sum'),days=('gaming_date','size'),fallbackDays=('fallback','sum'),faults=('faults','sum'),lostTheo=('lostTheo','sum'),manufacturer=('manufacturer','last'),zone=('zone_id','last'),bank=('bank_id','last'),leaseClass=('lease_class','last'),configuration=('config_id','last'))
summary['index']=summary.theo/summary.expected;summary['wideIndex']=summary.theo/summary.wideExpected;summary['contributionIndex']=summary.theoContribution/summary.expectedContribution
summary['z']=(summary.win-summary.theo)/np.sqrt(summary.variance);summary['p']=summary.z.map(lambda z:math.erfc(abs(z)/math.sqrt(2)));summary['q']=bh(summary.p)
summary['occupancy']=summary.occupied/summary.available;summary['costShare']=summary.cost/summary.theo
summary['indexLo']=index_ci[0];summary['indexHi']=index_ci[1];summary['occupancyLo']=occupancy_ci[0];summary['occupancyHi']=occupancy_ci[1];summary['contributionIndexLo']=contribution_ci[0];summary['contributionIndexHi']=contribution_ci[1]
summary['monthsBelowPeer']=monthly.assign(below=monthly['index']<1).groupby('machine_id').below.sum();summary['monthsBelowContribution']=monthly.assign(below=monthly.contributionIndex<1).groupby('machine_id').below.sum();summary['monthsObserved']=monthly.groupby('machine_id').size()
fg=fault.groupby('machine_id').agg(queueHours=('waitHours','sum'),handsOnHours=('repairHours','sum'))
summary=summary.join(fg).fillna({'queueHours':0,'handsOnHours':0})
population_faults=summary.faults.sum();population_days=summary.days.sum()
summary['faultExpected']=(population_faults-summary.faults)/(population_days-summary.days)*summary.days
summary['faultP']=[poisson_tail(int(k),float(lam)) for k,lam in zip(summary.faults,summary.faultExpected)]
summary['faultQ']=bh(summary.faultP)
summary['categories']=''
for i,mid in enumerate(summary.index):
    row=summary.loc[mid];labels=[]
    if row.days<56 or row.monthsObserved<2 or row.fallbackDays/row.days>.25:labels.append('Insufficient evidence')
    if row.monthsBelowPeer>=4 and row.indexHi<1:labels.append('Persistent low utilization')
    if row.monthsBelowContribution>=4 and row.contributionIndexHi<1 and row.costShare>summary.costShare.median():labels.append('Weak relative economics')
    if row.z<0 and row.q<.05:labels.append('Unusual payout behavior')
    if row.faultQ<.05 and row.faults>row.faultExpected:labels.append('Excessive fault/downtime review')
    if row.zone=='Z-B40':labels.append('Possible location opportunity')
    if not labels:labels=['No substantial detected concern']
    summary.at[mid,'categories']='|'.join(labels)
check('Payout family independent reconciliation',summary[(summary.z<0)&(summary.q<.05)].index.tolist()==PRIMARY['facts']['flagMachines'])
check('Raw house-win ranks reproduce management list',summary.nsmallest(10,'win').index.tolist()==PRIMARY['facts']['bottom'])
rank_exact=summary['index'].rank();rank_wide=summary.wideIndex.rank();half=active.assign(half=np.where(active.gaming_date.lt('2025-04-01'),'Jan-Mar','Apr-Jun')).groupby(['machine_id','half'])[['theo_usd','expected']].sum();half['index']=half.theo_usd/half.expected
half_pivot=half['index'].unstack('half');stable=half_pivot.dropna()
stability={'exactVsCrossZoneSpearman':float(rank_exact.corr(rank_wide)),'firstVsSecondHalfSpearman':float(stable['Jan-Mar'].rank().corr(stable['Apr-Jun'].rank())),'conditionalIntervals':'95% pointwise intervals from 1,200 joint date block resamples within month, block 7, seed 20261108. Peer expectations are treated as fitted; not simultaneous intervals, causal effects or failure probabilities.','rankDisagreements':records(summary.assign(exactRank=rank_exact,wideRank=rank_wide,rankDifference=(rank_exact-rank_wide).abs()).nlargest(12,'rankDifference').reset_index()[['machine_id','index','wideIndex','rankDifference']]),'historySensitivity':[{ 'minimumDays':n,'machinesBelowHistory':int((summary.days<n).sum())} for n in [28,56,84]],'diagnosticPolicy':'Persistence requires at least four months below a benchmark plus a pointwise upper interval below 1. Economic review also requires above-median cost burden. Exploratory management screens, not multiplicity-adjusted defect tests. Fault Poisson flags use BH 5% but depend on a Poisson count assumption.'}

# Expose remaining analyses through functions, so source-audit failures stop publication.
cells=active.groupby(['manufacturer','config_id','zone_id','month','local_weekday']).agg(faults=('faults','sum'),exposure=('gaming_date','size')).reset_index()
features=pd.get_dummies(cells[['manufacturer','config_id','zone_id','month','local_weekday']],drop_first=True,dtype=float)
X=np.column_stack([np.ones(len(cells)),features.to_numpy()]);names=['intercept']+features.columns.tolist()
coef,cov,dispersion=poisson_glm(X,cells.faults,cells.exposure)
manufacturer=[]
for name,g in active.groupby('manufacturer'):
    term='manufacturer_'+name;j=names.index(term) if term in names else None
    manufacturer.append({'manufacturer':name,'activeDays':len(g),'machines':g.machine_id.nunique(),'faults':int(g.faults.sum()),'faultsPer1000Days':1000*g.faults.sum()/len(g),'downHours':g.down.sum(),'repairCost':g.repair_cost_usd.sum(),'adjustedRateRatio':math.exp(coef[j]) if j is not None else 1.,'adjustedInterval':[math.exp(coef[j]-1.96*math.sqrt(cov[j,j])),math.exp(coef[j]+1.96*math.sqrt(cov[j,j]))] if j is not None else None})
manufacturer_model={'referenceManufacturer':sorted(active.manufacturer.unique())[0],'features':names,'dispersion':dispersion,'rank':int(np.linalg.matrix_rank(X)),'columns':X.shape[1],'method':'Offset Poisson association adjusted for configuration, zone, month and weekday; quasi-Poisson dispersion interval. Observational, not a manufacturer treatment effect.'}

print('Hourly rollups, queue attribution and quiet maintenance windows...',flush=True)
h=load('machine_hour');unique(h,['machine_id','hour_start_utc'],'hourly meters');h['gaming_date']=pd.to_datetime(h.gaming_date)
check('Every hourly available/occupied denominator is bounded',h.available_seconds.between(0,3600).all() and h.occupied_seconds.between(0,h.available_seconds).all())
hg=h.groupby(['machine_id','gaming_date'])[['coin_in_cents','payout_cents','available_seconds','occupied_seconds','paid_spins','carded_coin_in_cents','carded_payout_cents','carded_spins']].sum().sort_index()
for column in hg.columns:close('Hourly to daily '+column,hg[column],raw.set_index(['machine_id','gaming_date']).loc[hg.index,column],0)
close('Hourly scheduled exposure handles DST',h.groupby(['machine_id','gaming_date']).size().sort_index()*3600,raw.set_index(['machine_id','gaming_date']).loc[hg.index,'scheduled_seconds'],0)
h=h.merge(active[['machine_id','gaming_date','configured_rtp','expected','available_hours','zone_id','manufacturer']],on=['machine_id','gaming_date'],validate='many_to_one')
h['theo']=h.coin_in_cents/100*(1-h.configured_rtp);h['available']=h.available_seconds/3600;h['down']=(3600-h.available_seconds)/3600
close('Hourly theo agrees with daily',h.theo.sum(),active.theo_usd.sum(),1e-5)
profile=h.groupby(['machine_id','local_hour']).agg(theo=('theo','sum'),available=('available','sum')).reset_index();profile['rate']=profile.theo/profile.available
jh=h[h.gaming_date.ge('2025-06-01')].groupby(['machine_id','local_hour']).agg(theo=('theo','sum'),available=('available','sum')).reset_index();jh['rate']=jh.theo/jh.available
hour_profiles={mid:g.set_index('local_hour').reindex(range(24)).rate.to_numpy().tolist() for mid,g in jh.groupby('machine_id')}
global_hour=h.groupby('local_hour').agg(theo=('theo','sum'),available=('available','sum'),coin=('coin_in_cents','sum'),down=('down','sum'),occupied=('occupied_seconds','sum')).reset_index();global_hour['theoPerHour']=global_hour.theo/global_hour.available;global_hour['coinPerHour']=global_hour.coin/100/global_hour.available;global_hour['occupancy']=global_hour.occupied/3600/global_hour.available
train_hour=h[h.gaming_date.lt('2025-05-01')].groupby('local_hour')[['theo','available']].sum();test_hour=h[h.gaming_date.ge('2025-05-01')].groupby('local_hour')[['theo','available']].sum()
frozen_quiet=quiet_window((train_hour.theo/train_hour.available).to_numpy(),2)
test_rates=(test_hour.theo/test_hour.available).to_numpy();test_quiet=quiet_window(test_rates,2)
hour_validation={'train':'Jan–Apr 2025','diagnostic':'May–Jun already-examined historical period','twoHourWindowStart':frozen_quiet[0],'frozenWindowTestDebitPerMachine':sum(test_rates[(frozen_quiet[0]+k)%24] for k in range(2)),'retrospectiveBestTestStart':test_quiet[0],'allHourTestDebitPerMachine':2*test_hour.theo.sum()/test_hour.available.sum(),'qualification':'Quieter-hour scheduling estimates displaced opportunity only. It does not establish outage recovery or future demand. June profiles are planning bases, not held-out forecasts.'}

# Union each machine's queue intervals before intersecting them with metered hours.
intervals=[]
for mid,g in fault.groupby('machine_id'):
    ranges=sorted(zip(pd.to_datetime(g.opened_at_utc),pd.to_datetime(g.work_started_at_utc)))
    merged=[]
    for start,end in ranges:
        if not merged or start>merged[-1][1]:merged.append([start,end])
        else:merged[-1][1]=max(merged[-1][1],end)
    for start,end in merged:
        hour=start.floor('h')
        while hour<end:
            seconds=(min(end,hour+pd.Timedelta(hours=1))-max(start,hour)).total_seconds()
            if seconds>0:intervals.append((mid,hour,seconds))
            hour+=pd.Timedelta(hours=1)
qf=pd.DataFrame(intervals,columns=['machine_id','hour_start_utc','queueSeconds']).groupby(['machine_id','hour_start_utc']).queueSeconds.sum()
h['hour_start_utc']=pd.to_datetime(h.hour_start_utc)
hi=pd.MultiIndex.from_frame(h[['machine_id','hour_start_utc']]);h['queueHours']=np.minimum(3600-h.available_seconds,hi.map(qf).fillna(0))/3600
h['queueTheo']=h.queueHours*h.expected/h.available_hours
check('Queue attribution is bounded by metered downtime',h.queueHours.le(h.down+1e-9).all())
local_tech_start=pd.to_datetime(tech.start_utc,utc=True).dt.tz_convert('America/Los_Angeles').dt.hour
shift_start={name:int(local_tech_start.loc[g.index].mode().iloc[0]) for name,g in tech.groupby('shift')}
def shift_for(hour):return next((name for name,start in shift_start.items() if (hour-start)%24<8),'unknown')
h['shift']=h.local_hour.map(shift_for)
queue=h.groupby('shift').agg(queueHours=('queueHours','sum'),queueTheo=('queueTheo','sum')).reset_index();queue['dailyOpportunity']=queue.queueTheo/181
repeat=fault.sort_values('opened_at_utc').copy();repeat['previousAvailable']=repeat.groupby('machine_id').available_at_utc.shift()
repeat['hoursSincePriorRepair']=(pd.to_datetime(repeat.opened_at_utc)-pd.to_datetime(repeat.previousAvailable)).dt.total_seconds()/3600
repeat_summary={'repeatWithin7Days':int(repeat.hoursSincePriorRepair.between(0,168).sum()),'tickets':len(repeat),'qualification':'Time since prior repair is descriptive. Unrecorded condition and repeated tickets can confound preventive-treatment claims.'}

print('Comparative closure design and recorded moves...',flush=True)
walk=load('floor_walkways');record=walk[walk.closed_from_utc.notna()].iloc[0]
start=gaming_dates(pd.Series([record.closed_from_utc])).iloc[0];end=gaming_dates(pd.Series([record.closed_to_utc])).iloc[0]
zg=active.groupby(['gaming_date','zone_id','config_id']).agg(coin=('coin_in_usd','sum'),available=('available_hours','sum')).reset_index();zg=zg[zg.coin.gt(0)&zg.available.gt(0)].copy()
zg['target']=zg.zone_id.eq('Z-B40').astype(float);zg['during']=zg.target*zg.gaming_date.ge(start)*zg.gaming_date.lt(end);zg['after']=zg.target*zg.gaming_date.ge(end);zg['time']=zg.target*(zg.gaming_date-zg.gaming_date.min()).dt.days/30
zone_cell=pd.factorize(zg.zone_id+'|'+zg.config_id)[0];date_index=pd.factorize(zg.gaming_date.sort_values().unique())[0]
date_codes=pd.Categorical(zg.gaming_date,categories=sorted(zg.gaming_date.unique())).codes
closure_models=[]
for trend in [False,True]:
    terms=['during','after']+(['time'] if trend else [])
    coef,se=fixed_effect_association(np.log(zg.coin/zg.available),zg[terms],zg.available,zone_cell,date_codes,7)
    closure_models.append({'name':'Zone×configuration and date fixed effects'+(' + Back Forty trend' if trend else ''),'duringAssociation':math.expm1(coef[0]),'duringInterval':[math.expm1(coef[0]-1.96*se[0]),math.expm1(coef[0]+1.96*se[0])],'afterAssociation':math.expm1(coef[1]),'afterInterval':[math.expm1(coef[1]-1.96*se[1]),math.expm1(coef[1]+1.96*se[1])],'differentialTrendPerMonth':math.expm1(coef[2]) if trend else None})
pre=zg[zg.gaming_date.lt(start)].copy();pre_cells=pd.factorize(pre.zone_id+'|'+pre.config_id)[0];pre_dates=pd.Categorical(pre.gaming_date,categories=sorted(pre.gaming_date.unique())).codes
pre_beta,pre_se=fixed_effect_association(np.log(pre.coin/pre.available),pre[['time']],pre.available,pre_cells,pre_dates,7)
closure_design={'models':closure_models,'preDifferentialTrendPerMonth':math.expm1(pre_beta[0]),'preTrendInterval':[math.expm1(pre_beta[0]-1.96*pre_se[0]),math.expm1(pre_beta[0]+1.96*pre_se[0])],'method':'Available-hour-weighted log wager-rate regression; zone×game-configuration and gaming-date fixed effects; Newey–West date-score covariance, lag 7. Date effects absorb shared weekday/calendar/event shifts. Trend specification is a sensitivity, not a causal repair.','limitations':'Access was not randomized; local events, time-varying selection, spillovers and counter trends remain. No causal return assigned to signage or relocation.'}
move_evidence=[]
for mid,g in placements.groupby('machine_id'):
    for _,move in g.sort_values('effective_from_utc').iloc[1:].iterrows():
        day=gaming_dates(pd.Series([move.effective_from_utc])).iloc[0];own=active[active.machine_id.eq(mid)];windows=[]
        for width in [14,21,28]:
            before=own[own.gaming_date.ge(day-pd.Timedelta(days=width))&own.gaming_date.lt(day)];after=own[own.gaming_date.ge(day)&own.gaming_date.lt(day+pd.Timedelta(days=width))]
            if len(before) and len(after):
                b=before.theo_usd.sum()/before.available_hours.sum();a=after.theo_usd.sum()/after.available_hours.sum();bi=before.theo_usd.sum()/before.expected.sum();ai=after.theo_usd.sum()/after.expected.sum()
                windows.append({'days':width,'beforeDays':len(before),'afterDays':len(after),'beforeTheoPerHour':b,'afterTheoPerHour':a,'rawRateRatio':a/b,'beforePeerIndex':bi,'afterPeerIndex':ai,'peerIndexRatio':ai/bi})
        if windows:move_evidence.append({'machine':mid,'date':day,'windows':windows})

print('Payout tail sensitivity and benchmark alternatives...',flush=True)
target='M-1158';tg=active[active.machine_id.eq(target)];rng=np.random.default_rng(20261108);draws=150000;residual=np.zeros(draws);assumptions=[]
for config,g in tg.groupby('config_id'):
    gm=games.set_index('config_id').loc[config];mean=float(gm.configured_rtp);variance=float(gm.payout_multiplier_variance)
    multipliers,probabilities=moment_distribution(mean,variance,float(gm.hit_probability),float(gm.max_multiplier))
    cents=g.coin_in_usd.sum()*100;squared=g.sum_bet_squared.sum();effective_bet=squared/cents;effective_count=int(round(cents*cents/squared))
    samples=rng.multinomial(effective_count,probabilities,size=draws);payout=samples@multipliers*effective_bet/100
    residual-=payout-effective_count*effective_bet/100*mean
    assumptions.append({'config':config,'multipliers':multipliers,'probabilities':probabilities,'effectiveBetCents':effective_bet,'effectiveSpins':effective_count})
threshold=abs(float(summary.loc[target,'win']-summary.loc[target,'theo']));extreme=int((np.abs(residual)>=threshold).sum());prob=(extreme+1)/(draws+1);z=1.96;phat=extreme/draws;den=1+z*z/draws;center=(phat+z*z/(2*draws))/den;radius=z*math.sqrt(phat*(1-phat)/draws+z*z/(4*draws*draws))/den
payout_sensitivity={'machine':target,'normalP':summary.loc[target,'p'],'normalBHq':summary.loc[target,'q'],'simulationTailFrequency':prob,'monteCarloInterval':[max(0,center-radius),min(1,center+radius)],'conservativeFamilyUpperAdjustment':min(1,prob*len(summary)),'draws':draws,'seed':20261108,'hypotheticalDistributions':assumptions,'qualification':'A constructed 0/a/max payout distribution matches RTP, hit probability and variance. Equal effective bets match aggregate first/second wager moments. It is not the actual unidentified paytable and need not respect every payout increment. Monte Carlo error interval covers this simulation only. It is a sensitivity check, not a replacement p-value or defect probability.'}
daily_standardized=(active.house_win_usd-active.theo_usd)/np.sqrt(active.variance.replace(0,np.nan))
acf=[]
for _,g in active.assign(standardized=daily_standardized).sort_values('gaming_date').groupby('machine_id'):
    s=g.standardized.dropna();acf.append(s.autocorr(1))
payout_sensitivity['dailyLag1CorrelationMedian']=float(np.nanmedian(acf));payout_sensitivity['dailyLag1CorrelationP95']=float(np.nanquantile(acf,.95))
pooled=[]
for prior_hours in [24,96,384]:
    blend=support/(support+prior_hours)
    local=others.theo_usd/others.available_hours.replace(0,np.nan);global_rate=wide.theo_usd/wide.available_hours
    expected=(blend*local.fillna(global_rate)+(1-blend)*global_rate)*active.available_hours
    scores=active.groupby('machine_id').theo_usd.sum()/expected.groupby(active.machine_id).sum()
    pooled.append({'priorEquivalentHours':prior_hours,'spearmanWithExact':float(scores.rank().corr(summary['index'].rank())),'medianAbsoluteRankChange':float((scores.rank()-summary['index'].rank()).abs().median()),'maximumAbsoluteRankChange':float((scores.rank()-summary['index'].rank()).abs().max())})
stability['partialPoolingSensitivity']=pooled
stability['benchmarkDecision']='Retain exact leave-machine-out peer score for transparent location-conditional comparison. Add conditional intervals and expose cross-zone/temporal disagreement; fixed-support pooling is a sensitivity, not a selected empirical Bayes failure model.'

print('Nested chronological forecast comparison (original frozen forecast preserved)...',flush=True)
prop=prop.sort_values('gaming_date').reset_index(drop=True);all_values=prop.coin_in_usd.to_numpy(float);all_dates=pd.DatetimeIndex(prop.gaming_date)
forecast_rows=[];forecasts=[]
for origin,end_date in [('2025-02-01','2025-02-28'),('2025-03-01','2025-03-31'),('2025-04-01','2025-04-30')]:
    train_mask=all_dates<pd.Timestamp(origin);test_mask=(all_dates>=pd.Timestamp(origin))&(all_dates<=pd.Timestamp(end_date));td,tv=all_dates[train_mask],all_values[train_mask];fd,fv=all_dates[test_mask],all_values[test_mask]
    alpha_scores={}
    for alpha in [.1,1,10,100]:
        errors=[]
        for cutoff in range(28,len(td)-13,14):
            pred=calendar_predict(td[:cutoff],tv[:cutoff],td[cutoff:cutoff+14],'ridgeCalendar',alpha);errors.extend(np.abs(pred-tv[cutoff:cutoff+14]))
        alpha_scores[alpha]=float(np.mean(errors)) if errors else None
    alpha=min((a for a,v in alpha_scores.items() if v is not None),key=lambda a:alpha_scores[a],default=1)
    for kind in ['constant','weekdayMean','weekdayMedian','seasonalNaive','recent56','ridgeCalendar']:
        prediction=calendar_predict(td,tv,fd,kind,alpha);error=prediction-fv;scale=np.mean(np.abs(tv[7:]-tv[:-7]))
        forecast_rows.append({'origin':origin,'end':end_date,'model':kind,'trainDays':len(td),'testDays':len(fd),'mae':np.abs(error).mean(),'rmse':np.sqrt(np.mean(error**2)),'wape':np.abs(error).sum()/fv.sum(),'mase':np.abs(error).mean()/scale,'ridgeAlpha':alpha if kind=='ridgeCalendar' else None})
        for date,actual,predicted in zip(fd,fv,prediction):forecasts.append({'date':date,'origin':origin,'model':kind,'actual':actual,'predicted':predicted,'error':predicted-actual})
        check(f'Forecast {origin}/{kind} uses strictly prior information',td.max()<fd.min() and len(prediction)==len(fd))
forecast_frame=pd.DataFrame(forecasts);fsummary=forecast_frame.assign(absError=lambda x:x.error.abs(),squaredError=lambda x:x.error**2).groupby('model').agg(mae=('absError','mean'),rmse=('squaredError',lambda v:math.sqrt(v.mean())),days=('date','size')).reset_index()
paired=forecast_frame.assign(absError=lambda x:x.error.abs()).pivot(index='date',columns='model',values='absError').sort_index();difference=(paired.weekdayMean-paired.weekdayMedian).to_numpy();fw=block_weights(len(paired),2000,7,20261108,pd.DatetimeIndex(paired.index).month);difference_ci=np.quantile(fw@difference/len(paired),[.025,.975])
frozen=pd.DataFrame(PRIMARY['model']['points']);frozen['date']=pd.to_datetime(frozen.date);train=prop[prop.gaming_date.lt('2025-05-01')]
frozen_prediction=calendar_predict(train.gaming_date,train.coin_in_usd,frozen.date,'weekdayMean')
close('Frozen May–June predictions unchanged',frozen_prediction,frozen.model,1e-5)
close('Frozen MAE independently recomputed',np.abs(frozen.actual-frozen.model).mean(),PRIMARY['model']['mae'],1e-5)
fold_breakdowns=[]
for name,g in frozen.groupby(frozen.date.dt.day_of_week.ge(5).map({True:'weekend',False:'weekday'})):
    fold_breakdowns.append({'segment':name,'days':len(g),'mae':np.abs(g.actual-g.model).mean(),'baselineMae':np.abs(g.actual-g.baseline).mean()})
for name,g in frozen.groupby(frozen.date.dt.strftime('%Y-%m')):fold_breakdowns.append({'segment':name,'days':len(g),'mae':np.abs(g.actual-g.model).mean(),'baselineMae':np.abs(g.actual-g.baseline).mean()})
median_train=float(train.coin_in_usd.median())
for name,mask in [('quiet',frozen.actual.le(median_train)),('busy',frozen.actual.gt(median_train))]:
    g=frozen[mask];fold_breakdowns.append({'segment':name,'days':len(g),'mae':np.abs(g.actual-g.model).mean(),'baselineMae':np.abs(g.actual-g.baseline).mean()})
forecast_research={'folds':forecast_rows,'summary':records(fsummary),'frozenBreakdowns':fold_breakdowns,'originalFrozen':{k:v for k,v in PRIMARY['model'].items() if k!='points'},'decision':'Keep the original April-selected weekday mean for the headline frozen evaluation. New February–April rolling-origin and nested ridge diagnostics are retrospective model research, not a newly untouched final test.','fairness':'All models receive the same information before each origin and predict the full following month without using observations from that month. Seasonal naive repeats the last available weekday cycle; it does not consume future actual lags.'}
forecast_research['medianVsMeanMaeDifference']={'meanMinusMedian':difference.mean(),'conditionalBlockInterval':difference_ci,'draws':2000,'blockDays':7,'seed':20261108,'qualification':'Paired, month-stratified circular block resampling of retrospective rolling-origin errors. Not an untouched external test or a causal scheduling benefit.'}

print('Publishing aggregate audit and operational evidence...',flush=True)
zone_month=active.groupby(['zone_id','month']).agg(coin=('coin_in_usd','sum'),theo=('theo_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),cost=('cost','sum'),down=('down','sum')).reset_index()
zone_month['coinPerHour']=zone_month.coin/zone_month.available;zone_month['theoPerHour']=zone_month.theo/zone_month.available;zone_month['occupancy']=zone_month.occupied/zone_month.available
banks=active.groupby('bank_id').agg(zone=('zone_id','last'),coin=('coin_in_usd','sum'),theo=('theo_usd','sum'),available=('available_hours','sum'),occupied=('occupied_hours','sum'),expected=('expected','sum'),cost=('cost','sum'),faults=('faults','sum'),down=('down','sum')).reset_index();banks['index']=banks.theo/banks.expected;banks['occupancy']=banks.occupied/banks.available;banks['theoPerHour']=banks.theo/banks.available
for key in ['coin','win','theo','downHours','lostTheo']:
    calculated={'coin':active.coin_in_usd.sum(),'win':active.house_win_usd.sum(),'theo':active.theo_usd.sum(),'downHours':active.down.sum(),'lostTheo':active.lostTheo.sum()}[key]
    close('Full-period displayed '+key,calculated,PRIMARY['facts'][key],1e-4)
result={'schemaVersion':1,'sourceVersion':manifest['version'],'sourceManifestSha256':source_hash,'analysisWindow':{'start':'2025-01-01','end':'2025-06-30'},'methodsVersion':'scientific-decision-v1','checks':checks,'sourceTables':used,'totals':{'wagers':active.coin_in_usd.sum(),'payout':active.payout_usd.sum(),'houseWin':active.house_win_usd.sum(),'theo':active.theo_usd.sum(),'hold':active.house_win_usd.sum()/active.coin_in_usd.sum(),'observedRtp':active.payout_usd.sum()/active.coin_in_usd.sum(),'availability':active.available_hours.sum()/active.scheduled.sum(),'occupancy':active.occupied_hours.sum()/active.available_hours.sum(),'suppliedMachineCosts':active.cost.sum(),'machineContribution':active.contribution_after_supplied_costs_usd.sum(),'propertyContribution':prop.contribution_after_supplied_costs_usd.sum()},'machines':records(summary.reset_index()),'machineMonths':records(monthly),'benchmarkValidation':stability,'manufacturer':manufacturer,'manufacturerModel':manufacturer_model,'hourly':records(global_hour),'juneHourlyProfiles':hour_profiles,'hourValidation':hour_validation,'queueByShift':records(queue),'shiftStartHours':shift_start,'repeatRepairs':repeat_summary,'closureDesign':closure_design,'moves':move_evidence,'payoutSensitivity':payout_sensitivity,'forecastResearch':forecast_research,'zoneMonths':records(zone_month),'banks':records(banks),'trafficMonths':records(tm),'guestMonths':records(guest_month),'qualifications':['All casino data are synthetic.','New diagnostics are retrospective/exploratory; no causal treatment effect or new untouched holdout is claimed.','Contribution includes only supplied costs and is not complete profit.','Conditional pointwise peer intervals do not estimate intrinsic machine defects or simultaneous failure probabilities.']}
aligned=active.set_index(['machine_id','gaming_date']).loc[pd.MultiIndex.from_frame(packed[['machine_id','gaming_date']])]
result['diagnosticColumns']=['expectedContribution','expectedOccupied','faults','lease_cost_usd','service_cost_usd','power_cost_usd','repair_cost_usd']
result['diagnosticRows']=aligned[result['diagnosticColumns']].round(5).values.tolist()
check('Diagnostic row alignment with existing floor artifact',len(result['diagnosticRows'])==len(PRIMARY['rows']) and ids==[m['id'] for m in PRIMARY['machines']])
write(ROOT/'public/data/decision.json',result)
write(ROOT/'docs/SCIENTIFIC_AUDIT.json',result)
print(json.dumps(safe({'checks':len(checks),'totals':result['totals'],'manufacturer':manufacturer,'closure':closure_models,'forecast':records(fsummary),'tail':{'simulatedFrequency':prob,'normalP':summary.loc[target,'p']},'diagnosticCounts':summary.categories.str.split('|').explode().value_counts().to_dict()}),indent=2),flush=True)
