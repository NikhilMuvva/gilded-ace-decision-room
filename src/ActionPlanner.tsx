import React, { useEffect, useState } from "react";
import {
  Download,
  Plus,
  Check,
  Trash2,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { MetricHelp } from "./Help";
import { money, number, pct, Panel, Note, type Data } from "./ui";
import {
  unitCost,
  targetOptions,
  affectedMachines,
  validatePlan,
  estimateAction,
  estimatePlan,
} from "./lib.mjs";
import { download } from "./ui";
import { PortfolioBoard } from "./DecisionViews";
export function Planner({
  data,
  onEvidence,
  contextMachine,
  onPlanChange,
  riskCap,
  setRiskCap,
  portfolioId,
  setPortfolioId,
}: {
  data: Data;
  onEvidence: () => void;
  contextMachine?: string;
  onPlanChange?: (entries: Data[]) => void;
  riskCap: number;
  setRiskCap: (value: number) => void;
  portfolioId: string;
  setPortfolioId: (value: string) => void;
}) {
  const [entries, setEntries] = useState<Data[]>(() => {
      try {
        const saved = localStorage.getItem("gilded-ace-plan-v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed) &&
            parsed.every((e) =>
              data.actions.some((a: Data) => a.action_type_id === e.id),
            )
          )
            return parsed;
        }
      } catch {}
      return data.planner.recommended.map((e: Data) => ({
        ...e,
        effect: 0,
        extraCost: 0,
      }));
    }),
    [tab, setTab] = useState("all"),
    [solution, setSolution] = useState("");
  useEffect(() => {
    localStorage.setItem("gilded-ace-plan-v1", JSON.stringify(entries));
    onPlanChange?.(entries);
  }, [entries]);
  const validation = validatePlan(data, entries),
    estimate = estimatePlan(data, entries),
    byId = Object.fromEntries(
      data.actions.map((a: Data) => [a.action_type_id, a]),
    );
  const add = (a: Data) => {
    if (entries.length === 3 || entries.some((e) => e.id === a.action_type_id))
      return;
    setEntries([
      ...entries,
      {
        id: a.action_type_id,
        quantity: 1,
        targets: [
          a.unit === "machine" && contextMachine
            ? contextMachine
            : targetOptions(data, a)[0],
        ],
        effect: 0,
        extraCost: 0,
        pointsRate: 10,
        destinations: [],
      },
    ]);
    setSolution("");
  };
  const update = (i: number, patch: Data) => {
    setEntries(entries.map((e, j) => (i === j ? { ...e, ...patch } : e)));
    setSolution("");
  };
  const vacant = data.locations.filter(
    (l: Data) =>
      !data.planner.machines.some((m: Data) => m.location === l.location_id) ||
      entries
        .filter((e) => e.id.startsWith("A-MOVE"))
        .some((e) =>
          affectedMachines(data, byId[e.id], e).includes(
            data.planner.machines.find(
              (m: Data) => m.location === l.location_id,
            )?.id,
          ),
        ),
  );
  const optimize = () => {
    // Exhaustively compare all subsets of configured action types against preserving cash.
    let best: Data[] = [],
      bestNet = 0;
    for (let mask = 1; mask < 1 << entries.length; mask++) {
      const candidates = entries.filter((_, i) => mask & (1 << i));
      if (!validatePlan(data, candidates).valid) continue;
      const net = estimatePlan(data, candidates).net;
      if (net > bestNet) {
        bestNet = net;
        best = candidates;
      }
    }
    setSolution(
      best.length
        ? `Best of ${2 ** entries.length} subsets of your configured actions: ${best.map((e) => byId[e.id].name).join(" + ")}. Scenario net ${money(bestNet, false)}. Information benefits excluded.`
        : `Preserving cash has the highest quantified 30-day net among ${2 ** entries.length} subsets of your configured actions. An inspection can still be worth funding for information; that value is not monetized.`,
    );
  };
  return (
    <>
      <PortfolioBoard
        data={data}
        riskCap={riskCap}
        setRiskCap={setRiskCap}
        selected={portfolioId}
        setSelected={setPortfolioId}
        onApply={(next) => {
          setEntries(next);
          setSolution(
            "Portfolio loaded with explicitly stated base assumptions; review and edit below.",
          );
        }}
      />
      <p className="planner-steps">
        1. Choose action <span>→</span> 2. Set targets & quantity <span>→</span>{" "}
        3. Enter assumed effect <span>→</span> 4. Review costs & compare subsets
      </p>
      {contextMachine && (
        <p className="context-label">
          New machine actions start with {contextMachine} as the target; saved
          plan entries are unchanged.
        </p>
      )}
      <div className="planner-summary">
        <div>
          <span>
            Budget committed <MetricHelp term="recurring" />
          </span>
          <strong>
            {money(validation.cost, false)} <small>/ $100,000</small>
          </strong>
          {validation.cost > data.planner.budget && (
            <small className="warning">
              Over budget by{" "}
              {money(validation.cost - data.planner.budget, false)}
            </small>
          )}
          <div className="budget-track">
            <i style={{ width: Math.min(100, validation.cost / 1000) + "%" }} />
          </div>
        </div>
        <div>
          <span>Budget preserved</span>
          <strong>{money(validation.remaining, false)}</strong>
          <small>{entries.length} / 3 action types</small>
        </div>
        <div>
          <span>
            Assumed gross gain <MetricHelp term="assumption" />
          </span>
          <strong>{money(estimate.gain, false)}</strong>
          <small>After overlap rules</small>
        </div>
        <div>
          <span>
            Downtime theo debit <MetricHelp term="downtime-debit" />
          </span>
          <strong>{money(estimate.outage, false)}</strong>
          <small>Expected-win opportunity</small>
        </div>
        <div>
          <span>
            Scenario net after action costs <MetricHelp term="net-scenario" />
          </span>
          <strong className={estimate.net < 0 ? "negative" : ""}>
            {money(estimate.net, false)}
          </strong>
          <small>Information value unpriced · not a forecast</small>
        </div>
      </div>
      <div className="grid planner-grid">
        <Panel
          title="Build your portfolio"
          eyebrow="OFFICIAL ACTION CATALOG"
          tools={
            <select
              aria-label="Action category"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
            >
              <option value="all">All actions</option>
              <option value="machine">Machines & banks</option>
              <option value="operations">Operations & policy</option>
            </select>
          }
        >
          <p className="catalog-limit">
            {entries.length}/3 action types selected · prices cover the 30-day
            horizon
          </p>
          <div className="catalog">
            {data.actions
              .filter(
                (a: Data) =>
                  a.action_type_id !== "A-HOLD" &&
                  (tab === "all" ||
                    (tab === "machine"
                      ? ["machine", "bank"].includes(a.unit)
                      : !["machine", "bank"].includes(a.unit))),
              )
              .map((a: Data) => (
                <div className="catalog-item" key={a.action_type_id}>
                  <div>
                    <h4>{a.name}</h4>
                    <p>
                      {a.lead_days} day lead · {30 - a.lead_days} benefit days ·
                      max {a.quantity_limit}
                    </p>
                    <small>
                      {a.downtime_minutes
                        ? `${a.downtime_minutes} min downtime per ${a.unit === "manufacturer" ? "affected machine" : a.unit === "bank" ? "machine (conservative assumption)" : a.unit}`
                        : "No required machine downtime"}
                      {a.recurring_cost_cents_per_day
                        ? ` · ${money(a.recurring_cost_cents_per_day / 100, false)}/operating day`
                        : ""}
                    </small>
                  </div>
                  <div className="catalog-price">
                    <strong>{money(unitCost(a), false)}</strong>
                    <small>per {a.unit.replace("_", " ")}</small>
                    <button
                      aria-label={`Add ${a.name}`}
                      className="add-action"
                      disabled={
                        entries.length === 3 ||
                        entries.some((e) => e.id === a.action_type_id)
                      }
                      onClick={() => add(a)}
                    >
                      {entries.some((e) => e.id === a.action_type_id) ? (
                        <>
                          <Check size={15} /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={15} /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
        <div>
          <Panel
            title="Your 30-day plan"
            eyebrow="TARGETS, ASSUMPTIONS & CONSTRAINTS"
          >
            <div className="plan-items">
              {entries.map((e, i) => {
                const a = byId[e.id],
                  v = estimateAction(data, e),
                  options = targetOptions(data, a),
                  affected = affectedMachines(data, a, e),
                  entryErrors = [
                    ...new Set([
                      ...validatePlan(data, [e]).errors,
                      ...validation.errors.filter(
                        (message: string) =>
                          affected.some((id: string) => message.includes(id)) ||
                          (a.incompatibility_group === "comp_policy" &&
                            message.includes("cannot be combined")),
                      ),
                    ]),
                  ];
                return (
                  <div className="plan-item" key={e.id}>
                    <div className="plan-item-head">
                      <h4>{a.name}</h4>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${a.name}`}
                        onClick={() => {
                          setEntries(entries.filter((_, j) => j !== i));
                          setSolution("");
                        }}
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    </div>
                    <div className="plan-quantity">
                      <label>
                        Quantity
                        <input
                          type="number"
                          min="1"
                          max={a.quantity_limit}
                          value={e.quantity}
                          aria-label={`${a.name} quantity`}
                          onChange={(ev) => {
                            const q = Math.max(
                              1,
                              Math.min(
                                a.quantity_limit,
                                Math.trunc(Number(ev.target.value) || 1),
                              ),
                            );
                            update(i, {
                              quantity: q,
                              targets: (() => {
                                const used = new Set<string>();
                                return Array.from({ length: q }, (_, j) => {
                                  const prior = e.targets[j],
                                    target =
                                      prior && !used.has(prior)
                                        ? prior
                                        : options.find(
                                            (o: string) => !used.has(o),
                                          ) || options[0];
                                  used.add(target);
                                  return target;
                                });
                              })(),
                              destinations: [],
                            });
                          }}
                        />
                      </label>
                      <strong>{money(v.cost, false)}</strong>
                    </div>
                    <label className="form-label">Targets</label>
                    <div className="target-selects">
                      {Array.from({ length: e.quantity }, (_, j) => (
                        <select
                          aria-label={`${a.name} target ${j + 1}`}
                          aria-invalid={entryErrors.some((message: string) =>
                            /valid target|conflicting move/.test(message),
                          )}
                          aria-describedby={
                            entryErrors.length
                              ? `entry-error-${e.id}`
                              : undefined
                          }
                          key={j}
                          value={e.targets[j] || ""}
                          onChange={(ev) =>
                            update(i, {
                              targets: e.targets.map((t: string, k: number) =>
                                j === k ? ev.target.value : t,
                              ),
                            })
                          }
                        >
                          {options.map((o: string) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ))}
                    </div>
                    {entryErrors.length > 0 && (
                      <div
                        className="entry-errors"
                        id={`entry-error-${e.id}`}
                        aria-live="polite"
                      >
                        {entryErrors.map((message: string) => (
                          <p key={message}>{message}</p>
                        ))}
                      </div>
                    )}
                    {e.id.startsWith("A-MOVE") && (
                      <>
                        <label className="form-label">
                          Empty or concurrently vacated destination for each
                          affected machine
                        </label>
                        <div className="target-selects">
                          {affected.map((id: string, j: number) => (
                            <select
                              key={id}
                              aria-label={`Destination for ${id}`}
                              aria-invalid={entryErrors.some(
                                (message: string) =>
                                  /destination/.test(message),
                              )}
                              aria-describedby={
                                entryErrors.length
                                  ? `entry-error-${e.id}`
                                  : undefined
                              }
                              value={e.destinations?.[j] || ""}
                              onChange={(ev) => {
                                const dest = [...(e.destinations || [])];
                                dest[j] = ev.target.value;
                                update(i, { destinations: dest });
                              }}
                            >
                              <option value="">
                                Select destination for {id}
                              </option>
                              {vacant.map((l: Data) => (
                                <option
                                  key={l.location_id}
                                  value={l.location_id}
                                >
                                  {l.location_id} · {l.zone_id}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </>
                    )}
                    {["A-COMP-PILOT", "A-COMP-CHANGE"].includes(e.id) && (
                      <label className="form-label">
                        Additional comp cost budget ($)
                        <input
                          type="number"
                          min="0"
                          value={e.extraCost}
                          onChange={(ev) =>
                            update(i, {
                              extraCost: Math.max(0, Number(ev.target.value)),
                            })
                          }
                        />
                      </label>
                    )}
                    {e.id === "A-COMP-CHANGE" && (
                      <label className="form-label">
                        Policy rate (5–20 points / comp dollar)
                        <input
                          aria-label="Points per comp dollar"
                          aria-invalid={e.pointsRate < 5 || e.pointsRate > 20}
                          aria-describedby={
                            entryErrors.length
                              ? `entry-error-${e.id}`
                              : undefined
                          }
                          type="number"
                          min="5"
                          max="20"
                          value={e.pointsRate}
                          onChange={(ev) =>
                            update(i, { pointsRate: Number(ev.target.value) })
                          }
                        />
                      </label>
                    )}
                    {!["A-INSPECT", "A-SURVEY", "A-COMP-PILOT"].includes(
                      e.id,
                    ) && (
                      <label className="assumption-label">
                        <span>
                          Assumed{" "}
                          {e.id === "A-COMP-CHANGE"
                            ? "cost saving"
                            : e.id === "A-TECH-SHIFT" || e.id === "A-PREVENTIVE"
                              ? "opportunity recovery"
                              : "incremental uplift"}{" "}
                          <b>{e.effect}%</b>
                        </span>
                        <input
                          aria-label={`${a.name} assumed effect`}
                          type="range"
                          min="0"
                          max={
                            [
                              "A-TECH-SHIFT",
                              "A-PREVENTIVE",
                              "A-COMP-CHANGE",
                            ].includes(e.id)
                              ? 100
                              : 30
                          }
                          step="0.5"
                          value={e.effect}
                          onChange={(ev) =>
                            update(i, { effect: Number(ev.target.value) })
                          }
                        />
                      </label>
                    )}
                    <details className="plan-details">
                      <summary>Benefit assumption & catalog notes</summary>
                      <p>{v.description}</p>
                      <p>{a.notes}</p>
                    </details>
                    <div className="plan-metrics">
                      <span>
                        Benefit days <b>{v.days}</b>
                      </span>
                      <span>
                        Required downtime <b>{number(v.downtimeHours, 1)} h</b>
                      </span>
                      <span>
                        Scenario gross gain <b>{money(v.gain, false)}</b>
                      </span>
                      <span>
                        Downtime theo debit <MetricHelp term="downtime-debit" />{" "}
                        <b>{money(v.outageCost, false)}</b>
                      </span>
                      {v.startHour !== null && (
                        <span>
                          Planned start <b>{v.startHour}:00 local</b>
                        </span>
                      )}
                      <span>
                        Break-even effect <MetricHelp term="break-even" />{" "}
                        <b>
                          {v.breakeven == null ? "Unpriced" : pct(v.breakeven)}
                        </b>
                      </span>
                      <span>
                        Zero-effect net{" "}
                        <b>{money(-v.cost - v.outageCost, false)}</b>
                      </span>
                    </div>
                    <p className="scope-note">
                      {v.scheduleMode}.{" "}
                      {v.breakeven == null
                        ? `Information value is unknown. A future decision improvement would need to exceed ${money(v.cost + v.outageCost, false)} to cover this action and downtime.`
                        : `Break-even requires ${pct(v.breakeven)} ${e.id === "A-COMP-CHANGE" ? "cost saving" : e.id === "A-TECH-SHIFT" || e.id === "A-PREVENTIVE" ? "opportunity recovery" : "incremental uplift"} on the stated baseline. This is a scenario condition, not a forecast.`}
                    </p>
                  </div>
                );
              })}
              {!entries.length && (
                <div className="empty">
                  <Wallet size={30} />
                  <h4>Keeping the budget is a valid plan.</h4>
                  <p>
                    Add an action to price a test. Every dollar needs evidence.
                  </p>
                </div>
              )}
            </div>
            {validation.errors.length > 0 ? (
              <div className="errors" role="alert">
                {validation.errors.map((e: string) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            ) : (
              <div className="valid">
                <Check size={16} /> Budget and catalog constraints pass.
              </div>
            )}
            <Note>
              Effect percentages are assumptions, not demonstrated returns.
              Information value is unpriced.
            </Note>
            <div className="plan-buttons">
              <button className="button primary" onClick={optimize}>
                Compare configured subsets
              </button>
              <button
                className="button secondary"
                disabled={!validation.valid}
                onClick={() =>
                  download("gilded-ace-july-plan.json", {
                    horizon: "July 1–30, 2025",
                    entries,
                    validation,
                    estimate,
                    method: "Scenario analysis, not causal optimization",
                  })
                }
              >
                <Download size={15} /> Export plan
              </button>
            </div>
            {solution && (
              <div className="solver-result" role="status">
                {solution}
              </div>
            )}
            <details className="detail-block">
              <summary>Comparison and overlap rules</summary>
              <p>
                The comparator evaluates up to eight subsets of the configured
                action types at their current quantities, targets and
                assumptions, including preserving cash. It does not search all
                catalog portfolios.
              </p>
              <p>
                Tech/preventive recovery retains the larger gain; demand
                interventions retain only the largest assumed gain. The
                zero-gain scenario remains possible.
              </p>
            </details>
          </Panel>
        </div>
      </div>
      {data.decision ? (
        <Panel title="Prospective measurement and stop rules">
          <div className="measurement-grid">
            <div>
              <h4>Pre-register treatments and controls</h4>
              <p>
                Keep payout diagnosis, reliability inspection, access testing
                and the loyalty experiment separate. Use the exact targets and
                eligible dates in the portfolio details.
              </p>
            </div>
            <div>
              <h4>Measure contribution and displacement</h4>
              <p>
                Reconcile availability, faults, covered traffic and economic
                comp cost. Compare property-wide outcomes as well as targeted
                machines; improving one zone can displace another.
              </p>
            </div>
            <div>
              <h4>Allow inconclusive results</h4>
              <p>
                Freeze primary outcomes and cost/guest-protection stop rules
                before launch. Twenty to twenty-five eligible days may not
                establish a small causal effect. Information value remains
                unpriced.
              </p>
            </div>
          </div>
          <button className="text-button" onClick={onEvidence}>
            Trace the recommendation to evidence <ArrowRight size={14} />
          </button>
        </Panel>
      ) : (
        <Panel title="Recommended inspection and measurement plan">
          <div className="measurement-grid">
            <div>
              <span>Target</span>
              <h4>
                {data.planner.recommended
                  .flatMap((e: Data) => e.targets)
                  .join(", ") || "Preserve budget"}
              </h4>
              <p>
                Inspect the negative residual exception at{" "}
                {money(unitCost(byId["A-INSPECT"]), false)} per machine.
                Downtime is debited at June’s expected win per hour.
              </p>
            </div>
            <div>
              <span>Test</span>
              <h4>Settings, meters and paytable</h4>
              <p>
                Document inspection results. Reconcile meters to sessions and
                game configuration. A residual alone is not evidence of
                wrongdoing.
              </p>
            </div>
            <div>
              <span>Decision rule</span>
              <h4>Retain if configuration is correct</h4>
              <p>
                If configuration is correct, retain the machine. For demand
                tests, pre-register matched banks, theo per available hour,
                downtime, spillover and a 30-day stop rule.
              </p>
            </div>
          </div>
          <button className="text-button" onClick={onEvidence}>
            Trace the recommendation to evidence <ArrowRight size={14} />
          </button>
        </Panel>
      )}
    </>
  );
}
