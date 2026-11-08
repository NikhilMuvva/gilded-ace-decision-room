"""Independent CSV-source recomputation; never imports or executes build_data.py.

Only aggregate diagnostics are published. Existing holdout predictions are not changed.
"""
from pathlib import Path
import sys
import json
import math
import hashlib
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.python-deps'))
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'sources/dashboard-royale-main/data'
VERSION = json.loads((SOURCE/'manifest.json').read_text(encoding='utf-8'))['version']
if VERSION != '0.9.0-draft':
    raise RuntimeError('Source version changed. Revisit audit references before recomputation.')
hashes = {}

def read(name):
    path, = SOURCE.rglob(name + '.csv.gz')
    hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return pd.read_csv(path)

def payout(frame, multiplier=1):
    g = frame.groupby('machine_id').agg(win=('house_win_usd','sum'), theo=('theo_usd','sum'), variance=('variance','sum'))
    g['z'] = (g.win-g.theo)/np.sqrt(g.variance*multiplier)
    g['p'] = g.z.map(lambda z: math.erfc(abs(z)/math.sqrt(2)))
    order = g.p.sort_values().index
    adjusted = g.loc[order,'p'].to_numpy()*len(g)/np.arange(1,len(g)+1)
    g.loc[order,'q'] = np.minimum(1,np.minimum.accumulate(adjusted[::-1])[::-1])
    return g

checks = []
def check(name, passed):
    if not bool(passed):
        raise AssertionError(name)
    checks.append(name)

prepared = read('prepared_daily_view')
raw = read('machine_day')
games = read('game_math')
prop = read('property_day').sort_values('gaming_date')
cal = read('calendar_day')
check('Source active/off-floor accounting', len(prepared)==56110 and prepared.active.sum()==55092 and (~prepared.active).sum()==1018)
check('Raw integer accounting', (raw.coin_in_cents-raw.payout_cents==raw.house_win_cents).all())
d = prepared.loc[prepared.active].copy()
d = d.merge(raw[['machine_id','gaming_date','scheduled_seconds','available_seconds','sum_bet_squared']], on=['machine_id','gaming_date'],validate='one_to_one')
d = d.merge(games[['config_id','payout_multiplier_variance']],on='config_id',validate='many_to_one')
check('Meter exposure matches prepared', np.allclose(d.available_hours,d.available_seconds/3600))
check('Prepared money matches raw active meters', np.isclose(d.coin_in_usd.sum(),raw.loc[raw.active,'coin_in_cents'].sum()/100) and np.isclose(d.house_win_usd.sum(),raw.loc[raw.active,'house_win_cents'].sum()/100))
check('Configured RTP reproduces theo',np.allclose(d.theo_usd,d.coin_in_usd*(1-d.configured_rtp)))
check('DST uses 23 elapsed hours',int(cal.loc[cal.gaming_date.eq('2025-03-08'),'scheduled_seconds'].iloc[0])==82800)
d['date'] = pd.to_datetime(d.gaming_date)
d['variance'] = d.sum_bet_squared*d.payout_multiplier_variance/10000
d['down'] = d.scheduled_seconds/3600-d.available_hours
keys = ['zone_id','config_id','month','local_weekday']
cols = ['theo_usd','coin_in_usd','available_hours']
tot = d.groupby(keys)[cols].transform('sum')
own = d.groupby(keys+['machine_id'])[cols].transform('sum')
fallback = d.groupby(keys[1:])[cols].transform('sum')-d.groupby(keys[1:]+['machine_id'])[cols].transform('sum')
others = tot-own
support = others.available_hours
peer_sensitivity = []
for minimum in [0,24,96]:
    valid_support = support.ge(minimum) & support.gt(0)
    rate = (others.theo_usd/others.available_hours.replace(0,np.nan)).where(valid_support, fallback.theo_usd/fallback.available_hours)
    check(f'Peer references complete at {minimum}h',rate.notna().all())
    expected = rate*d.available_hours
    scores = d.groupby('machine_id').theo_usd.sum()/expected.groupby(d.machine_id).sum()
    peer_sensitivity.append({'minimumHours':minimum,'fallbackDays':int((~valid_support).sum()),'minIndex':scores.min(),'p05':scores.quantile(.05),'p10':scores.quantile(.1),'belowLegacy080':int((scores<.8).sum())})
    if minimum==24:
        d['expected'] = expected
        d['lostTheo'] = rate*d.down
check('24-hour fallback count',peer_sensitivity[1]['fallbackDays']==307)
full = payout(d)
flag = full.loc['M-1158']
check('Independent payout family and reference q',full[(full.z<0)&(full.q<.05)].index.tolist()==['M-1158'] and abs(flag.q-.0015109)<.000001)
subperiods=[]
for name,lo,hi in [('Jan–Mar','2025-01-01','2025-03-31'),('April','2025-04-01','2025-04-30'),('May–June','2025-05-01','2025-06-30')]:
    s=payout(d[d.gaming_date.between(lo,hi)]).loc['M-1158']
    subperiods.append({'period':name,'z':s.z,'q':s.q,'flag':bool(s.z<0 and s.q<.05)})
variance_sensitivity=[]
for multiplier in [1,1.25,1.5,2]:
    g=payout(d,multiplier)
    variance_sensitivity.append({'varianceMultiplier':multiplier,'m1158Z':g.loc['M-1158','z'],'m1158Q':g.loc['M-1158','q'],'negativeFlags':int(((g.z<0)&(g.q<.05)).sum())})
by_volatility=[]
metadata=d.groupby('machine_id').volatility_class.last()
for name,ids in metadata.groupby(metadata).groups.items():
    z=full.loc[ids,'z']
    by_volatility.append({'volatility':name,'machines':len(z),'meanZ':z.mean(),'sampleSdZ':z.std()})

walk=read('floor_walkways').dropna(subset=['closed_from_utc']).iloc[0]
gaming_day=lambda value:(pd.to_datetime(value,utc=True).tz_convert('America/Los_Angeles').tz_localize(None)-pd.Timedelta(hours=6)).normalize()
start,end=gaming_day(walk.closed_from_utc),gaming_day(walk.closed_to_utc)
def zone_rates(frame):
    return [g.coin_in_usd.sum()/g.available_hours.sum() for g in [frame[frame.zone_id.eq('Z-B40')],frame[frame.zone_id.ne('Z-B40')]]]
during=zone_rates(d[d.date.ge(start)&d.date.lt(end)])
closure=[]
for name,lo in [('Broad pre-period',d.date.min()),('Adjacent 35 days',start-pd.Timedelta(days=35))]:
    before=zone_rates(d[d.date.ge(lo)&d.date.lt(start)])
    closure.append({'window':name,'beforeStart':str(lo.date()),'duringStart':str(start.date()),'duringEndExclusive':str(end.date()),'relativeChange':(during[0]/before[0])/(during[1]/before[1])-1})
check('Closure reference reproduced',abs(closure[0]['relativeChange']+.307719)<.00001)
moves=[]
placements=read('placements')
for mid,g in placements.groupby('machine_id'):
    for _,row in g.sort_values('effective_from_utc').iloc[1:].iterrows():
        day=gaming_day(row.effective_from_utc)
        own=d[d.machine_id.eq(mid)]
        windows=[]
        for n in [14,21,28]:
            b=own[own.date.ge(day-pd.Timedelta(days=n))&own.date.lt(day)]
            a=own[own.date.ge(day)&own.date.lt(day+pd.Timedelta(days=n))]
            if len(a) and len(b):
                br=b.theo_usd.sum()/b.available_hours.sum()
                ar=a.theo_usd.sum()/a.available_hours.sum()
                windows.append({'days':n,'beforeDays':len(b),'afterDays':len(a),'beforeTheoPerHour':br,'afterTheoPerHour':ar,'ratio':ar/br})
        if windows:moves.append({'machine':mid,'date':str(day.date()),'windows':windows})

prop['date']=pd.to_datetime(prop.gaming_date)
prop['weekday']=prop.date.dt.day_of_week
inner=prop[prop.gaming_date<'2025-04-01']
val=prop[prop.gaming_date.between('2025-04-01','2025-04-30')]
train=prop[prop.gaming_date<'2025-05-01']
test=prop[prop.gaming_date>='2025-05-01']
def predict(frame,future,kind):
    if kind=='constant':return np.full(len(future),frame.coin_in_usd.mean())
    if kind=='recent56':frame=frame[frame.date>=frame.date.max()-pd.Timedelta(days=55)]
    grouped=frame.groupby('weekday').coin_in_usd
    means=grouped.median() if kind=='weekdayMedian' else grouped.mean()
    if kind=='shrunk5':means=(grouped.sum()+5*frame.coin_in_usd.mean())/(grouped.count()+5)
    return future.weekday.map(means).to_numpy()
validation={kind:float(np.mean(np.abs(predict(inner,val,kind)-val.coin_in_usd))) for kind in ['constant','weekdayMean','weekdayMedian','recent56','shrunk5']}
check('April alone selects weekday mean',min(validation,key=validation.get)=='weekdayMean')
check('Chronological split sizes',len(inner)==90 and len(val)==30 and len(train)==120 and len(test)==61)
mae=float(np.mean(np.abs(predict(train,test,'weekdayMean')-test.coin_in_usd)))
base=float(np.mean(np.abs(predict(train,test,'constant')-test.coin_in_usd)))
schedule=[{'weekday':int(w),'predictedDailyWagers':float(v)} for w,v in train.groupby('weekday').coin_in_usd.mean().sort_values().items()]

ledger=read('loyalty_ledger')
pos=read('fnb_transactions')
r=ledger[ledger.event_type.eq('redeem')].copy()
r['month']=(pd.to_datetime(r.event_at_utc,utc=True).dt.tz_convert('America/Los_Angeles').dt.tz_localize(None)-pd.Timedelta(hours=6)).dt.strftime('%Y-%m')
j=r.merge(pos[['transaction_id','item','cogs_cents']],left_on='redeemed_pos_id',right_on='transaction_id',validate='one_to_one')
check('Every redemption reconciles one-to-one to POS cost',len(r)==len(j) and (j.economic_cost_cents==j.cogs_cents).all())
check('Economic cost reconciles to property once',np.isclose(r.economic_cost_cents.sum()/100,prop.comp_cost_usd.sum()))
cells=j.groupby(['tier_before','item','month']).agg(n=('loyalty_event_id','size'),points=('points_delta','sum'),face=('face_value_cents','sum')).reset_index()
loyalty=[]
for minimum in [1,5,10,20,30,50,100]:
    eligible=cells.groupby(['tier_before','item']).filter(lambda g:len(g)==6 and g.n.min()>=minimum)
    january=eligible[eligible.month.eq('2025-01')].set_index(['tier_before','item']).face
    weights=january/january.sum()
    values={}
    for mo,g in eligible.groupby('month'):
        rates=(-g.points/(g.face/100)).set_axis(pd.MultiIndex.from_frame(g[['tier_before','item']]))
        values[mo]=float((rates*weights).sum())
    loyalty.append({'minimumRedemptions':minimum,'cells':len(weights),'januaryFaceCoverage':january.sum()/r.loc[r.month.eq('2025-01'),'face_value_cents'].sum(),'januaryPointsPerDollar':values['2025-01'],'junePointsPerDollar':values['2025-06'],'juneJanuaryRatio':values['2025-06']/values['2025-01']})

daily=d.groupby('gaming_date').lostTheo.sum().to_numpy()
rng=np.random.default_rng(2026)
draws=[]
for _ in range(5000):
    starts=rng.integers(0,len(daily),size=math.ceil(len(daily)/7))
    indexes=np.concatenate([(s+np.arange(7))%len(daily) for s in starts])[:len(daily)]
    draws.append(daily[indexes].sum())
result={'sourceVersion':'0.9.0-draft','method':'Independent CSV-source audit; no pipeline imports; only aggregate results published','totals':{'rows':len(prepared),'activeRows':len(d),'offFloorRows':len(prepared)-len(d),'coin':d.coin_in_usd.sum(),'win':d.house_win_usd.sum(),'theo':d.theo_usd.sum(),'downHours':d.down.sum(),'downtimeTheoProxy':d.lostTheo.sum()},'peerSensitivity':peer_sensitivity,'payout':{'m1158':flag.to_dict(),'subperiods':subperiods,'varianceSensitivity':variance_sensitivity,'byVolatility':by_volatility,'sampleSdZ':full.z.std(),'qualification':'Variance multipliers are hypothetical moment sensitivity, not a fitted heavy-tail or dependence model. Moments alone cannot identify payout tails.'},'closureSensitivity':closure,'moveSensitivity':moves,'forecast':{'aprilValidationMae':validation,'selected':'weekdayMean','frozenTestMae':mae,'frozenBaselineMae':base,'improvement':1-mae/base,'lowDemandWeekdays':schedule,'qualification':'Additional candidate diagnostics are retrospective; May–June was already examined. No reselection on holdout.'},'loyaltySensitivity':loyalty,'downtimeResampling':{'blockDays':7,'draws':5000,'seed':2026,'interval':np.quantile(draws,[.025,.975]).tolist(),'qualification':'Historical proxy variability only; not recoverable contribution, predictive interval or causal ROI.'},'sourceCsvSha256':hashes,'checks':checks}
def serial(value):
    if isinstance(value,np.integer):return int(value)
    if isinstance(value,np.floating):return float(value)
    raise TypeError(type(value).__name__)
output=ROOT/'docs/ALGORITHM_AUDIT.json'
output.write_text(json.dumps(result,indent=2,default=serial,allow_nan=False)+'\n',encoding='utf-8')
(ROOT/'public/data/diagnostics.json').write_text(output.read_text(encoding='utf-8'),encoding='utf-8')
print(json.dumps({'totals':result['totals'],'peerSensitivity':peer_sensitivity,'payout':flag.to_dict(),'aprilValidationMae':validation,'checks':len(checks)},indent=2,default=serial))
