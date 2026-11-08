"""Small numerical routines with independent controlled-fixture tests."""
import math
import numpy as np

def bh(p):
    p=np.asarray(p,dtype=float)
    if not np.isfinite(p).all() or ((p<0)|(p>1)).any():raise ValueError('Invalid p-values')
    if not len(p):return p.copy()
    order=np.argsort(p);q=np.minimum.accumulate((p[order]*len(p)/np.arange(1,len(p)+1))[::-1])[::-1]
    out=np.empty(len(p));out[order]=np.minimum(1,q);return out

def ratio(numerator,denominator):
    numerator,denominator=np.broadcast_arrays(np.asarray(numerator,float),np.asarray(denominator,float))
    return np.divide(numerator,denominator,out=np.full(numerator.shape,np.nan),where=denominator>0)

def peer_reference(frame,keys,numerator,hours='available_hours',machine='machine_id',minimum=24):
    total=frame.groupby(keys)[[numerator,hours]].transform('sum')
    own=frame.groupby(keys+[machine])[[numerator,hours]].transform('sum')
    wide_keys=[k for k in keys if k!='zone_id']
    wide=frame.groupby(wide_keys)[[numerator,hours]].transform('sum')-frame.groupby(wide_keys+[machine])[[numerator,hours]].transform('sum')
    support=total[hours]-own[hours]
    local=(total[numerator]-own[numerator])/support.replace(0,np.nan)
    fallback=wide[numerator]/wide[hours].replace(0,np.nan)
    return local.where((support>=minimum)&(support>0),fallback),support

def block_weights(n,draws=1000,block=7,seed=20261108,groups=None):
    """Resample contiguous circular blocks within declared time strata; counts sum to n."""
    if n<1 or draws<1 or block<1:raise ValueError('Positive dimensions required')
    rng=np.random.default_rng(seed);weights=np.zeros((draws,n))
    groups=np.zeros(n,int) if groups is None else np.asarray(groups)
    if len(groups)!=n:raise ValueError('Invalid time strata')
    for value in dict.fromkeys(groups):
        positions=np.flatnonzero(groups==value);size=len(positions)
        starts=rng.integers(0,size,size=(draws,math.ceil(size/block)))
        ix=(starts[:,:,None]+np.arange(block))%size;ix=ix.reshape(draws,-1)[:,:size]
        for draw,row in enumerate(ix):np.add.at(weights[draw],positions[row],1)
    return weights

def ratio_intervals(numerators,denominators,weights):
    sampled=ratio(weights@numerators,weights@denominators)
    return np.nanquantile(sampled,[.025,.975],axis=0),sampled

def poisson_tail(k,lam):
    if lam<0 or k<0:raise ValueError('Invalid Poisson inputs')
    if k==0:return 1.
    if lam==0:return 0.
    # Sum the survival tail directly to avoid cancellation at small probabilities.
    term=math.exp(k*math.log(lam)-lam-math.lgamma(k+1));total=term;j=k
    while j<max(k+100,int(lam+20*math.sqrt(lam)+100)):
        j+=1;term*=lam/j;total+=term
        if term<1e-15*max(total,1e-100):break
    return min(1,total)

def poisson_glm(X,y,exposure):
    """Offset Poisson association fit, quasi-Poisson covariance; no causal interpretation."""
    X,y,exposure=np.asarray(X,float),np.asarray(y,float),np.asarray(exposure,float)
    if (exposure<=0).any():raise ValueError('Positive exposure required')
    beta=np.zeros(X.shape[1]);offset=np.log(exposure);beta[0]=math.log((y.sum()+.01)/exposure.sum())
    ridge=np.eye(X.shape[1])*1e-7;ridge[0,0]=0
    for _ in range(80):
        eta=np.clip(X@beta+offset,-25,25);mu=np.exp(eta)
        working=eta+(y-mu)/mu-offset
        updated=np.linalg.solve((X.T*mu)@X+ridge,(X.T*mu)@working)
        if np.max(np.abs(updated-beta))<1e-8:beta=updated;break
        beta=updated
    mu=np.exp(np.clip(X@beta+offset,-25,25));df=max(1,len(y)-np.linalg.matrix_rank(X))
    dispersion=max(1,float(np.sum((y-mu)**2/np.maximum(mu,1e-10))/df))
    cov=np.linalg.pinv((X.T*mu)@X)*dispersion
    return beta,cov,dispersion

def fixed_effect_association(y,treat,weights,cell,date,lag=7):
    """Weighted two-way FE residualization and date-score Newey-West covariance."""
    y=np.asarray(y,float);T=np.asarray(treat,float);w=np.asarray(weights,float)
    residual=np.column_stack([y,T]);cell=np.asarray(cell,int);date=np.asarray(date,int)
    for _ in range(120):
        old=residual.copy()
        for group in [cell,date]:
            den=np.bincount(group,weights=w)
            for j in range(residual.shape[1]):
                means=np.bincount(group,weights=w*residual[:,j])/np.maximum(den,1e-12)
                residual[:,j]-=means[group]
        if np.max(np.abs(old-residual))<1e-10:break
    Y,A=residual[:,0],residual[:,1:]
    bread=np.linalg.pinv((A.T*w)@A);beta=bread@((A.T*w)@Y);errors=Y-A@beta
    scores=np.zeros((date.max()+1,A.shape[1]));np.add.at(scores,date,A*(w*errors)[:,None])
    meat=scores.T@scores
    for l in range(1,min(lag+1,len(scores))):
        cross=scores[l:].T@scores[:-l];meat+=(1-l/(lag+1))*(cross+cross.T)
    covariance=bread@meat@bread
    return beta,np.sqrt(np.maximum(0,np.diag(covariance)))

def moment_distribution(mean,variance,hit,maximum):
    """One hypothetical three-point distribution consistent with supplied moments.

    This is NOT an identified paytable; payout increments/rare awards can differ.
    """
    mu=mean/hit;second=(variance+mean**2)/hit
    if abs(second-mu**2)<1e-8:return np.array([0.,mu]),np.array([1-hit,hit])
    a=(maximum*mu-second)/(maximum-mu);q=(mu-a)/(maximum-a)
    if a<0 or not 0<=q<=1:raise ValueError('Infeasible moments')
    return np.array([0.,a,maximum]),np.array([1-hit,hit*(1-q),hit*q])

def calendar_predict(train_dates,train_values,future_dates,kind='weekdayMean',alpha=1):
    import pandas as pd
    dates=pd.DatetimeIndex(train_dates);future=pd.DatetimeIndex(future_dates);values=np.asarray(train_values,float)
    if len(dates)<1 or dates.max()>=future.min():raise ValueError('Forecast must be strictly future')
    weekday=dates.day_of_week.to_numpy();future_w=future.day_of_week.to_numpy()
    if kind=='constant':return np.full(len(future),values.mean())
    if kind=='ridgeCalendar':
        origin=dates.min();t=(dates-origin).days.to_numpy()/30
        ft=(future-origin).days.to_numpy()/30
        X=np.column_stack([np.ones(len(dates)),np.eye(7)[weekday][:,1:],t]);Z=np.column_stack([np.ones(len(future)),np.eye(7)[future_w][:,1:],ft])
        penalty=np.eye(X.shape[1])*alpha;penalty[0,0]=0
        return np.maximum(0,Z@np.linalg.solve(X.T@X+penalty,X.T@values))
    if kind=='recent56':
        keep=dates>=dates.max()-pd.Timedelta(days=55);values=values[keep];weekday=weekday[keep]
    predictions=[]
    for w in future_w:
        group=values[weekday==w]
        if not len(group):predictions.append(values.mean());continue
        predictions.append(np.median(group) if kind=='weekdayMedian' else group[-1] if kind=='seasonalNaive' else group.mean())
    return np.array(predictions)

def quiet_window(rates,duration):
    rates=np.asarray(rates,float)
    if len(rates)!=24 or duration<=0 or duration>24 or not np.isfinite(rates).all():raise ValueError('Invalid profile')
    costs=[]
    for start in range(24):
        full=int(duration);fraction=duration-full
        cost=sum(rates[(start+k)%24] for k in range(full))
        if fraction:cost+=fraction*rates[(start+full)%24]
        costs.append(cost)
    start=int(np.argmin(costs));return start,float(costs[start])
