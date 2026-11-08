import unittest,sys,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'.python-deps'),str(ROOT/'scripts')]
import numpy as np
import pandas as pd
from scientific_core import bh,ratio,block_weights,ratio_intervals,poisson_tail,poisson_glm,fixed_effect_association,moment_distribution,calendar_predict,quiet_window
from scientific_core import peer_reference

class ScientificMathTests(unittest.TestCase):
    def test_bh_known_adjustment_and_ties(self):
        np.testing.assert_allclose(bh([.01,.04,.03,.2]),[.04,.053333333333,.053333333333,.2])
        np.testing.assert_allclose(bh([.01,.01,1]),[.015,.015,1])
        with self.assertRaises(ValueError):bh([float('nan')])
    def test_null_false_discoveries_and_injected_signal(self):
        rng=np.random.default_rng(777);families=3000
        # Under independent all-null p-values, FDR equals probability of any rejection.
        flagged=sum(np.any(bh(rng.uniform(size=100))<.05) for _ in range(families))
        self.assertLess(flagged/families,.065);self.assertGreater(flagged/families,.035)
        p=rng.uniform(.1,1,310);p[10]=math.erfc(5/math.sqrt(2));self.assertLess(bh(p)[10],.05)
    def test_zero_denominator_is_unavailable(self):
        values=ratio([0,2],[0,4]);self.assertTrue(np.isnan(values[0]));self.assertEqual(values[1],.5)
    def test_sparse_peers_exclude_all_target_rows_and_widen_without_fabricating_data(self):
        f=pd.DataFrame({'zone_id':['a','a','a','b'],'config_id':['x']*4,'machine_id':['one','one','two','three'],'available_hours':[1,1,2,3],'theo':[10,10,20,60]})
        rate,support=peer_reference(f,['zone_id','config_id'],'theo');self.assertEqual(rate.iloc[0],16);self.assertEqual(support.iloc[0],2)
        rate,_=peer_reference(f,['zone_id','config_id'],'theo',minimum=0);self.assertEqual(rate.iloc[0],10)
        alone=f.iloc[:2];rate,_=peer_reference(alone,['zone_id','config_id'],'theo');self.assertTrue(rate.isna().all())
    def test_blocks_preserve_strata_and_ratio_identity(self):
        w=block_weights(20,100,7,123,[0]*10+[1]*10)
        np.testing.assert_allclose(w.sum(axis=1),20);np.testing.assert_allclose(w[:,:10].sum(axis=1),10)
        den=np.arange(1,21)[:,None];ci,_=ratio_intervals(2*den,den,w);np.testing.assert_allclose(ci,2)
        np.testing.assert_array_equal(w,block_weights(20,100,7,123,[0]*10+[1]*10))
    def test_poisson_tail_reference(self):
        self.assertAlmostEqual(poisson_tail(1,1),1-math.exp(-1),12)
        self.assertAlmostEqual(poisson_tail(2,1),1-2*math.exp(-1),12)
        self.assertEqual(poisson_tail(3,0),0)
    def test_poisson_offset_association_known_rate_ratio(self):
        X=np.column_stack([np.ones(8),[0]*4+[1]*4]);exposure=np.array([10,20,30,40]*2)
        y=exposure*np.array([.2]*4+[.6]*4)
        beta,cov,dispersion=poisson_glm(X,y,exposure)
        self.assertAlmostEqual(math.exp(beta[1]),3,6);self.assertGreaterEqual(dispersion,1)
    def test_two_way_fixed_effects_remove_calendar_and_cell_bias(self):
        date=np.tile(np.arange(60),4);cell=np.repeat(np.arange(4),60)
        treatment=((cell==0)&(date>=30)).astype(float)
        y=2+cell*.5+np.sin(date/7)+treatment*-.3
        beta,se=fixed_effect_association(y,treatment[:,None],np.ones(len(y)),cell,date)
        self.assertAlmostEqual(beta[0],-.3,8);self.assertLess(se[0],1e-7)
    def test_moment_distribution_matches_supplied_moments(self):
        for mu,var,hit,mx in [(.9,118.97,.31544,500),(.92,17.5536,.046,20),(.93,4.2551,.5105,40)]:
            x,p=moment_distribution(mu,var,hit,mx)
            self.assertAlmostEqual(p.sum(),1,10);self.assertTrue((p>=0).all())
            self.assertAlmostEqual(x@p,mu,8);self.assertAlmostEqual((x*x)@p-mu**2,var,7)
    def test_forecast_never_uses_future_values_and_known_weekday_cycle(self):
        dates=pd.date_range('2025-01-01',periods=42);future=pd.date_range('2025-02-12',periods=14)
        values=100+dates.day_of_week.to_numpy()*10
        pred=calendar_predict(dates,values,future,'weekdayMean')
        np.testing.assert_allclose(pred,100+future.day_of_week.to_numpy()*10)
        with self.assertRaises(ValueError):calendar_predict(dates,values,dates[-2:])
        np.testing.assert_allclose(calendar_predict(dates,values,future,'seasonalNaive'),pred)
    def test_quiet_window_wraps_and_charges_fractional_downtime(self):
        rates=np.full(24,10.);rates[23]=1;rates[0]=2
        start,cost=quiet_window(rates,1.5);self.assertEqual(start,23);self.assertEqual(cost,2)
        with self.assertRaises(ValueError):quiet_window(rates,25)

if __name__=='__main__':unittest.main()
