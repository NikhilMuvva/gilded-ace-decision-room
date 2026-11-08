"""Reproducible, retrospective analytics. Never writes to the supplied sources."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT / 'sources/dashboard-royale-main')
args = parser.parse_args()
SOURCE = args.source.resolve()
OUT = ROOT / 'public/data'
OUT.mkdir(parents=True, exist_ok=True)
DOC = ROOT / 'docs'
DOC.mkdir(exist_ok=True)
checks = []


def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    if not passed:
        raise AssertionError(name)


def load(name):
    files = list((SOURCE / 'data').rglob(name + '.parquet'))
    if len(files) != 1:
        raise ValueError(f'Expected one source for {name}: {files}')
    df = pd.read_parquet(files[0])
    for c in df.select_dtypes(include=['object', 'str']):
        first = df[c].dropna()
        if len(first) and not isinstance(first.iloc[0], str):
            try:
                df[c] = pd.to_numeric(df[c])
            except (ValueError, TypeError):
                pass
    return df


def clean(obj):
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, np.ndarray)):
        return [clean(v) for v in obj]
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        return str(obj)[:10]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        return round(float(obj), 5) if math.isfinite(float(obj)) else None
    if obj is pd.NA or obj is pd.NaT:
        return None
    return obj


def records(df):
    return clean(df.to_dict('records'))


def write(path, data):
    path.write_text(json.dumps(clean(data), separators=(',', ':'), allow_nan=False), encoding='utf-8')


print('Reading challenge data...', flush=True)
d = load('prepared_daily_view')
raw = load('machine_day')
prop = load('property_day')
cal = load('calendar_day')
games = load('game_math')
locations = load('floor_locations')
actions = load('action_catalog')
ops = load('operations')
placements = load('placements')
walkways = load('floor_walkways')
for frame in [d, raw, prop, cal]:
    frame['gaming_date'] = pd.to_datetime(frame.gaming_date)

check('56,110 unique machine-day keys', len(d) == 56110 and not d.duplicated(['machine_id', 'gaming_date']).any())
check('1,018 off-floor rows excluded', (~d.active).sum() == 1018)
check('Integer machine accounting', (raw.house_win_cents == raw.coin_in_cents - raw.payout_cents).all())
check('Prepared monetary accounting', np.allclose(d.house_win_usd, d.coin_in_usd - d.payout_usd))
check('Property contribution counts POS cogs once', np.allclose(prop.contribution_after_supplied_costs_usd, prop.house_win_usd + prop.pos_cash_usd - prop.pos_cogs_usd - prop.machine_supplied_costs_usd - prop.tech_labor_cost_usd))
check('Daily rollup matches property', np.allclose(d.groupby('gaming_date').coin_in_usd.sum(), prop.sort_values('gaming_date').coin_in_usd))
check('DST gaming day is 23 hours', cal.loc[cal.gaming_date.eq('2025-03-08'), 'scheduled_seconds'].iloc[0] == 82800)
d = d[d.active].copy().reset_index(drop=True)
d = d.merge(raw[['machine_id', 'gaming_date', 'scheduled_seconds', 'sum_bet_squared']], on=['machine_id', 'gaming_date'], validate='one_to_one')
d = d.merge(games[['config_id', 'payout_multiplier_variance']], on='config_id', validate='many_to_one')
d['scheduled'] = d.scheduled_seconds / 3600
d['down'] = d.scheduled - d.available_hours
d['variance'] = d.sum_bet_squared * d.payout_multiplier_variance.astype(float) / 10000
check('Availability respects scheduled time', d.down.ge(-1e-8).all())
d['costs'] = d.lease_cost_usd + d.service_cost_usd + d.power_cost_usd + d.repair_cost_usd

# Leave the target machine out of its zone/configuration/month/weekday reference.
# Retrospective descriptive comparison, never used by the forecast.
keys = ['zone_id', 'config_id', 'month', 'local_weekday']
total = d.groupby(keys)[['coin_in_usd', 'theo_usd', 'available_hours']].transform('sum')
own = d.groupby(keys + ['machine_id'])[['coin_in_usd', 'theo_usd', 'available_hours']].transform('sum')
den = total.available_hours - own.available_hours
fallback = d.groupby(['config_id', 'month', 'local_weekday'])[['coin_in_usd', 'theo_usd', 'available_hours']].transform('sum')
fallback_own = d.groupby(['config_id', 'month', 'local_weekday', 'machine_id'])[['coin_in_usd', 'theo_usd', 'available_hours']].transform('sum')
d['peer_hours'] = den
for col, out in [('theo_usd', 'peer_theo_rate'), ('coin_in_usd', 'peer_coin_rate')]:
    rate = (total[col] - own[col]) / den.replace(0, np.nan)
    alt = (fallback[col] - fallback_own[col]) / (fallback.available_hours - fallback_own.available_hours).replace(0, np.nan)
    d[out] = rate.where(den >= 24, alt)
check('Every active row has a valid peer reference', d.peer_coin_rate.notna().all() and d.peer_theo_rate.notna().all())
d['expected'] = d.peer_theo_rate * d.available_hours
d['lost_coin'] = d.peer_coin_rate * d.down
d['lost_theo'] = d.peer_theo_rate * d.down

dates = sorted(d.gaming_date.dt.strftime('%Y-%m-%d').unique())
ids = sorted(d.machine_id.unique())
ztable = locations[locations.node_type.eq('zone')].sort_values('zone_id')
zones = records(ztable[['zone_id', 'name', 'x_m', 'y_m']])
zids = list(ztable.zone_id)
configs = sorted(d.config_id.unique())
loc = locations[locations.node_type.eq('slot')].sort_values('location_id')
locids = list(loc.location_id)
metadata = []
for mid, group in d.groupby('machine_id', sort=True):
    last = group.sort_values('gaming_date').iloc[-1]
    metadata.append({'id': mid, 'theme': last.theme, 'manufacturer': last.manufacturer, 'volatility': last.volatility_class, 'lease': last.lease_class})
columns = ['date', 'machine', 'zone', 'bank', 'config', 'coin', 'win', 'theo', 'available', 'scheduled', 'occupied', 'costs', 'variance', 'expected', 'lostCoin', 'lostTheo', 'location', 'peerHours']
packed = pd.DataFrame({
    'date': d.gaming_date.dt.strftime('%Y-%m-%d').map({v:i for i,v in enumerate(dates)}),
    'machine': d.machine_id.map({v:i for i,v in enumerate(ids)}),
    'zone': d.zone_id.map({v:i for i,v in enumerate(zids)}), 'bank': d.bank_id,
    'config': d.config_id.map({v:i for i,v in enumerate(configs)}),
    'coin': d.coin_in_usd, 'win': d.house_win_usd, 'theo': d.theo_usd,
    'available': d.available_hours, 'scheduled': d.scheduled, 'occupied': d.occupied_hours,
    'costs': d.costs, 'variance': d.variance, 'expected': d.expected,
    'lostCoin': d.lost_coin, 'lostTheo': d.lost_theo,
    'location': d.location_id.map({v:i for i,v in enumerate(locids)}), 'peerHours': d.peer_hours})
packed = packed.round({'available':4, 'scheduled':4, 'occupied':4, 'costs':2, 'variance':3, 'expected':3, 'lostCoin':3, 'lostTheo':3, 'peerHours':2, 'theo':3})

print('Forecast: fixed origin, Jan-Apr training / May-Jun holdout...', flush=True)
# Choose between two simple time-series specifications using an inner chronological split.
prop = prop.sort_values('gaming_date').reset_index(drop=True)
prop['weekday'] = prop.gaming_date.dt.day_of_week
train = prop[prop.gaming_date < '2025-05-01']
test = prop[prop.gaming_date >= '2025-05-01']
inner = train[train.gaming_date < '2025-04-01']
val = train[train.gaming_date >= '2025-04-01']


def predict(training, future, recent=False):
    use = training[training.gaming_date >= training.gaming_date.max() - pd.Timedelta(days=55)] if recent else training
    means = use.groupby('weekday').coin_in_usd.mean()
    return future.weekday.map(means).to_numpy(dtype=float)


scores = {name: float(np.abs(predict(inner, val, recent) - val.coin_in_usd).mean()) for name, recent in [('Weekday mean', False), ('Recent 8-week weekday mean', True)]}
chosen = min(scores, key=scores.get)
recent = chosen.startswith('Recent')
pred = predict(train, test, recent)
baseline = np.full(len(test), train.coin_in_usd.mean())
errors = np.abs(pred - test.coin_in_usd.to_numpy())
base_errors = np.abs(baseline - test.coin_in_usd.to_numpy())
rng = np.random.default_rng(2026)
# Paired circular seven-day block bootstrap preserves short-range error dependence.
boot = []
diff = base_errors - errors
for _ in range(2000):
    starts = rng.integers(0, len(diff), size=math.ceil(len(diff)/7))
    ix = np.concatenate([(s + np.arange(7)) % len(diff) for s in starts])[:len(diff)]
    boot.append(float(diff[ix].mean()))
check('Forecast split is strictly chronological', train.gaming_date.max() < test.gaming_date.min() and len(train) == 120 and len(test) == 61)
model = {'name': chosen, 'trainStart':'2025-01-01', 'trainEnd':'2025-04-30', 'testStart':'2025-05-01', 'testEnd':'2025-06-30', 'trainDays':len(train), 'testDays':len(test), 'innerValidation':scores, 'mae':errors.mean(), 'baselineMae':base_errors.mean(), 'improvement':1-errors.mean()/base_errors.mean(), 'improvementUsdCI':np.quantile(boot,[.025,.975]), 'points':[{'date':str(dt)[:10], 'actual':a, 'model':p, 'baseline':b} for dt,a,p,b in zip(test.gaming_date,test.coin_in_usd,pred,baseline)]}

print('Aggregating tracked guests without publishing identities...', flush=True)
p = load('player_period')
check('Tracked player net has player sign', np.allclose(p.tracked_net_usd, p.tracked_payout_usd - p.tracked_coin_in_usd))
check('Tracked contribution includes comp cost once', np.allclose(p.tracked_contribution_usd, -p.tracked_net_usd + p.linked_pos_cash_usd - p.linked_pos_cogs_usd))
months = sorted(p.period_month.unique())
regions = sorted(p.home_region.dropna().unique())
tiers = sorted(p.opening_tier.dropna().unique())
guest_summaries = []
for i, start in enumerate(months):
    for end in months[i:]:
        window = p[p.period_month.between(start, end)]
        for dimension, values in [('all', ['All tracked guests']), ('home_region', regions), ('opening_tier', tiers)]:
            for value in values:
                sub = window if dimension == 'all' else window[window[dimension].eq(value)]
                per = sub.groupby('player_id')[['tracked_coin_in_usd','tracked_payout_usd','tracked_net_usd','theo_usd','comp_cost_usd','tracked_contribution_usd']].sum()
                gamers = per[per.tracked_coin_in_usd.gt(0)]
                losses = (-gamers.tracked_net_usd).clip(lower=0).sort_values(ascending=False)
                wagers = gamers.tracked_coin_in_usd.sort_values(ascending=False)
                n = len(gamers)
                cuts = [float(wagers.iloc[:max(1, math.ceil(n*q))].sum()/wagers.sum()) if wagers.sum() else 0 for q in [.01,.05,.1,.2,.5,1]]
                guest_summaries.append({'start':start, 'end':end, 'dimension':dimension, 'group':value, 'accounts':len(per),'players':n, 'wagers':per.tracked_coin_in_usd.sum(), 'payout':per.tracked_payout_usd.sum(), 'net':per.tracked_net_usd.sum(), 'theo':per.theo_usd.sum(), 'compCost':per.comp_cost_usd.sum(), 'contribution':per.tracked_contribution_usd.sum(), 'ahead':int(gamers.tracked_net_usd.gt(0).sum()), 'medianNet':gamers.tracked_net_usd.median(), 'top10LossShare':losses.iloc[:max(1,math.ceil(n*.1))].sum()/losses.sum() if losses.sum() else 0, 'wagerConcentration':cuts})

ledger = load('loyalty_ledger')
fnb = load('fnb_transactions')
redeem = ledger[ledger.event_type.eq('redeem')].copy()
redeem['gaming_date'] = (pd.to_datetime(redeem.event_at_utc).dt.tz_localize('UTC').dt.tz_convert('America/Los_Angeles').dt.tz_localize(None) - pd.Timedelta(hours=6)).dt.normalize()
joined = redeem.merge(fnb[['transaction_id','cogs_cents','item']], left_on='redeemed_pos_id', right_on='transaction_id', validate='one_to_one')
check('Every redeemed comp links to one POS ticket', len(joined) == len(redeem))
check('Ledger cost equals POS cogs: subtract once', (joined.economic_cost_cents == joined.cogs_cents).all())
check('Redeemed comp cost reconciles to property', np.isclose(redeem.economic_cost_cents.sum()/100, prop.comp_cost_usd.sum()))
redeem['month'] = redeem.gaming_date.dt.strftime('%Y-%m')
joined['month'] = joined.gaming_date.dt.strftime('%Y-%m')
# Same-item / same-tier comparison with fixed January face-dollar weights.
cells = joined.groupby(['month','tier_before','item']).agg(points=('points_delta','sum'),face=('face_value_cents','sum'),n=('loyalty_event_id','size')).reset_index()
common = cells.groupby(['tier_before','item']).filter(lambda x: len(x)==6 and x.n.min()>=20)
weights = common[common.month.eq('2025-01')].set_index(['tier_before','item']).face
weights = weights/weights.sum()
standardized = {}
for mo,g in common.groupby('month'):
    rates = (-g.points/(g.face/100)).set_axis(pd.MultiIndex.from_frame(g[['tier_before','item']]))
    standardized[mo] = float((rates*weights).sum())
loyalty = []
for month, g in redeem.groupby('month'):
    pp = prop[prop.gaming_date.dt.strftime('%Y-%m').eq(month)]
    loyalty.append({'month':month,'redemptions':len(g),'points':-g.points_delta.sum(),'face':g.face_value_cents.sum()/100,'cost':g.economic_cost_cents.sum()/100,'pointsPerFaceDollar':-g.points_delta.sum()/(g.face_value_cents.sum()/100),'standardizedPoints':standardized.get(month),'standardizedCells':len(weights),'reinvestment':g.economic_cost_cents.sum()/100/pp.theo_usd.sum()})

# Real NOAA context is permitted with attribution; later revisions stay out of forecasts.
weather = load('weather_daily')
weather['month'] = pd.to_datetime(weather.source_date).dt.strftime('%Y-%m')
weather_month = weather.groupby('month').agg(meanDailyMaxC=('tmax_c','mean'),rainMm=('prcp_mm','sum')).reset_index()
event_stats = []
for _,ev in load('events').iterrows():
    event_days = prop[prop.gaming_date.between(pd.Timestamp(ev.start_date),pd.Timestamp(ev.end_date))]
    expected = []
    observed = []
    for _,day in event_days.iterrows():
        peers = prop[(prop.gaming_date.dt.strftime('%Y-%m')==day.gaming_date.strftime('%Y-%m')) & (prop.weekday==day.weekday) & prop.events_active.fillna('').eq('')]
        if len(peers):
            expected.append(float(peers.coin_in_usd.sum()/peers.available_machine_hours.sum()*day.available_machine_hours))
            observed.append(float(day.coin_in_usd))
    event_stats.append({'name':ev['name'],'start':str(ev.start_date)[:10],'end':str(ev.end_date)[:10],'scope':ev.local_scope,'days':len(observed),'relativeRate':sum(observed)/sum(expected)-1 if expected else None})

# Demand and walkway comparison with unaffected floor as contemporaneous control.
closure = walkways[walkways.closed_from_utc.notna()].iloc[0]
start = pd.Timestamp(closure.closed_from_utc).tz_localize('UTC').tz_convert('America/Los_Angeles').tz_localize(None).normalize()
end = pd.Timestamp(closure.closed_to_utc).tz_localize('UTC').tz_convert('America/Los_Angeles').tz_localize(None).normalize()
d['phase'] = np.select([d.gaming_date < start, d.gaming_date < end], ['Before closure','During closure'], default='After reopening')
closure_stats = []
for phase, g in d.groupby('phase', sort=False):
    back = g[g.zone_id.eq('Z-B40')]
    control = g[~g.zone_id.eq('Z-B40')]
    closure_stats.append({'phase':phase,'start':str(g.gaming_date.min())[:10],'end':str(g.gaming_date.max())[:10], 'backRate':back.coin_in_usd.sum()/back.available_hours.sum(), 'otherRate':control.coin_in_usd.sum()/control.available_hours.sum()})
before, during, after = closure_stats
closure_relative = (during['backRate']/before['backRate'])/(during['otherRate']/before['otherRate']) - 1
traffic = load('zone_traffic_hourly')
traffic['gaming_date'] = (pd.to_datetime(traffic.hour_start_utc).dt.tz_localize('UTC').dt.tz_convert('America/Los_Angeles').dt.tz_localize(None) - pd.Timedelta(hours=6)).dt.normalize()
traffic['month'] = traffic.gaming_date.dt.strftime('%Y-%m')
traffic_month = traffic.groupby(['zone_id','month']).agg(entries=('entries_count',lambda x:x.sum(min_count=1)), coverageMinutes=('coverage_minutes','sum'),sensorRows=('sensor_id','size')).reset_index()
traffic_month['entriesPerCoveredHour'] = traffic_month.entries / (traffic_month.coverageMinutes/60)
traffic_month['coverage'] = traffic_month.coverageMinutes/(traffic_month.sensorRows*60)

move_rows = []
for mid,g in placements.groupby('machine_id'):
    g = g.sort_values('effective_from_utc')
    if len(g) < 2:
        continue
    for _, row in g.iloc[1:].iterrows():
        day = pd.Timestamp(row.effective_from_utc).tz_localize('UTC').tz_convert('America/Los_Angeles').tz_localize(None).normalize()
        own = d[d.machine_id.eq(mid)]
        b = own[own.gaming_date.between(day-pd.Timedelta(days=28),day-pd.Timedelta(days=1))]
        a = own[own.gaming_date.between(day,day+pd.Timedelta(days=27))]
        if len(b) and len(a):
            move_rows.append({'machine':mid,'date':str(day)[:10],'beforeZone':b.zone_name.iloc[-1], 'afterZone':a.zone_name.iloc[0], 'beforeRate':b.theo_usd.sum()/b.available_hours.sum(), 'afterRate':a.theo_usd.sum()/a.available_hours.sum(), 'beforeIndex':b.theo_usd.sum()/b.expected.sum(),'afterIndex':a.theo_usd.sum()/a.expected.sum(), 'beforeDays':len(b),'afterDays':len(a)})

faults = ops[ops.event_type.eq('fault_repair')].copy()
faults['waitHours'] = (pd.to_datetime(faults.work_started_at_utc) - pd.to_datetime(faults.opened_at_utc)).dt.total_seconds()/3600
faults['repairHours'] = (pd.to_datetime(faults.available_at_utc) - pd.to_datetime(faults.work_started_at_utc)).dt.total_seconds()/3600
faults = faults.merge(d.groupby('machine_id')[['peer_theo_rate']].mean(), left_on='machine_id', right_index=True, validate='many_to_one')
check('Operations have nonnegative wait and repair time', faults.waitHours.ge(0).all() and faults.repairHours.ge(0).all())
op_summary = {'tickets':len(faults),'waitHours':faults.waitHours.sum(),'repairHours':faults.repairHours.sum(),'medianWait':faults.waitHours.median(),'medianRepair':faults.repairHours.median(),'waitTheo':(faults.waitHours*faults.peer_theo_rate).sum(), 'note':'Ticket durations can overlap and do not replace meter-based downtime.'}

print('Optional hourly timing audit...', flush=True)
h = load('machine_hour')
h['gaming_date'] = pd.to_datetime(h.gaming_date)
h['down'] = (3600-h.available_seconds)/3600
hourly = h.groupby('local_hour').agg(down=('down','sum'),coin=('coin_in_cents','sum'),available=('available_seconds','sum')).reset_index()
hourly['coin'] /= 100
hourly['available'] /= 3600
hourly['coinPerHour'] = hourly.coin / hourly.available
hourly_gap = h.down.sum()-d.down.sum()
check('Hourly downtime reconciles to exact daily scheduled downtime', np.isclose(hourly_gap,0))
check('Configured RTP reproduces theo', np.allclose(d.theo_usd,d.coin_in_usd*(1-d.configured_rtp.astype(float))))

score = d.groupby('machine_id').agg(win=('house_win_usd','sum'),theo=('theo_usd','sum'),available=('available_hours','sum'),expected=('expected','sum'),variance=('variance','sum'))
bottom = score.nsmallest(10,'win').index.tolist()
latest_zone = d.sort_values('gaming_date').groupby('machine_id').zone_id.last()
back_count = int(latest_zone.loc[bottom].eq('Z-B40').sum())
score['z'] = (score.win-score.theo)/np.sqrt(score.variance)
score['p'] = score.z.map(lambda x: math.erfc(abs(x)/math.sqrt(2)))
order = score.p.sort_values().index
q = np.minimum.accumulate((score.loc[order,'p'].to_numpy()*len(score)/np.arange(1,len(score)+1))[::-1])[::-1]
score.loc[order,'q'] = np.minimum(q,1)
flags = score[(score.q < .05) & (score.z < 0)].sort_values('z')
screen = score[score.theo/score.expected < .8]

# Benefit rates are observed exposure/opportunity bases; effects are explicit scenario assumptions.
june = d[d.month.eq('2025-06')]
machine_plan = []
for mid,g in june.groupby('machine_id'):
    if g.gaming_date.max() != pd.Timestamp('2025-06-30'):
        continue
    row = g.sort_values('gaming_date').iloc[-1]
    machine_plan.append({'id':mid,'zone':row.zone_id,'bank':row.bank_id,'location':row.location_id,'manufacturer':row.manufacturer,'dailyTheo':g.theo_usd.sum()/g.gaming_date.nunique(),'dailyDowntimeTheo':g.lost_theo.sum()/g.gaming_date.nunique(),'hourlyTheo':g.theo_usd.sum()/g.available_hours.sum(),'peerDaily':g.expected.sum()/g.gaming_date.nunique(),'q':score.loc[mid,'q'],'z':score.loc[mid,'z']})
best = sorted(machine_plan, key=lambda x:x['z'])
source_manifest_hash=hashlib.sha256((SOURCE/'data/manifest.json').read_bytes()).hexdigest()
decision_path=OUT/'decision.json'
decision=json.loads(decision_path.read_text()) if decision_path.exists() else {}
recommended=decision.get('recommendation',{}).get('entries',[]) if decision.get('sourceManifestSha256')==source_manifest_hash and decision.get('recommendation',{}).get('objective')=='financial' else []
check('Planner starts with machines active on June 30', len(machine_plan)==june[june.gaming_date.eq('2025-06-30')].machine_id.nunique())
# Preserve funds if benefits are not identified. Information value is deliberately unmonetized.
planner = {'machines':machine_plan,'techDailyOpportunity':op_summary['waitTheo']/181,'maintenanceDailyOpportunity':float(june.lost_theo.sum()/30), 'compDailyCost':float(prop[prop.gaming_date.ge('2025-06-01')].comp_cost_usd.sum()/30),'recommended':recommended,'horizonStart':'2025-07-01','horizonEnd':'2025-07-30','budget':100000}
planner['recommendationSource']='source-matched decision engine; run build_decision_evidence.py and build_portfolios.mjs to refresh'
planner['recommendationObjective']='financial'

inventory = []
for path in sorted((SOURCE/'data').rglob('*.parquet')):
    import pyarrow.parquet as pq
    md = pq.read_metadata(path)
    inventory.append({'table':path.stem,'rows':md.num_rows,'columns':md.num_columns,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'use':'local context only; excluded from public payload' if 'real_sources' in str(path) else 'synthetic source'})

facts = {'coin':d.coin_in_usd.sum(),'win':d.house_win_usd.sum(),'theo':d.theo_usd.sum(),'downHours':d.down.sum(),'lostCoin':d.lost_coin.sum(),'lostTheo':d.lost_theo.sum(),'backBottomCount':back_count,'bottom':bottom,'closureRelative':closure_relative,'payoutFlags':len(flags),'lowPeerScreens':len(screen),'flagMachines':flags.index.tolist(),'hourlyDownGap':hourly_gap}
payload = {'version':'0.9.0-draft','dates':dates,'months':months,'machines':metadata,'zones':zones,'configs':configs,'locations':records(loc[['location_id','x_m','y_m','zone_id','bank_id']]),'columns':columns,'rows':packed.values.tolist(),'property':records(prop.drop(columns='weekday')),'model':model,'guests':guest_summaries,'guestGroups':{'home_region':regions,'opening_tier':tiers},'loyalty':loyalty,'weather':records(weather_month),'events':event_stats,'traffic':records(traffic_month),'closures':closure_stats,'closureRelative':closure_relative,'walkways':records(walkways),'moves':move_rows,'operations':op_summary,'hourly':records(hourly),'actions':records(actions.fillna('')),'planner':planner,'facts':facts,'checks':checks,'inventory':inventory}
payload['sourceManifestSha256']=source_manifest_hash
write(OUT/'dashboard.json',payload)
write(DOC/'analysis-results.json',{'facts':facts,'model':model,'operations':op_summary,'closures':closure_stats,'loyalty':loyalty,'moves':move_rows,'checks':checks})
write(DOC/'source-inventory.json',inventory)
shutil.copyfile(SOURCE/'LICENSE',DOC/'UPSTREAM-LICENSE.txt')
score.reset_index().to_csv(DOC/'machine-audit.csv',index=False)
(DOC/'pipeline-checks.md').write_text('# Pipeline verification\n\n'+'\n'.join(f"- PASS: {x['name']}" for x in checks)+f'\n\nHourly full-hour downtime minus scheduled meter downtime: {hourly_gap:.6f} hours. Hourly timing is descriptive; daily loss estimates always use exact meter scheduled time.\n',encoding='utf-8')
print(json.dumps(clean(facts),indent=2),flush=True)
print(f'Model: {chosen}; MAE ${model["mae"]:,.0f}; baseline ${model["baselineMae"]:,.0f}',flush=True)
print(f'{len(checks)} checks passed. Payload {(OUT/"dashboard.json").stat().st_size/1e6:.2f} MB',flush=True)
