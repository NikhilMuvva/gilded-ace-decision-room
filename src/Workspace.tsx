import { useEffect, useMemo, useRef, useState } from "react";
import {
  Spade,
  LayoutDashboard,
  Map as MapIcon,
  ChartNoAxesCombined,
  Wrench,
  Users,
  Gift,
  Wallet,
  FlaskConical,
  Menu,
  Download,
  RotateCcw,
  ArrowLeft,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { selectRows, aggregate, machineScores } from "./lib.mjs";
import { rankPeers, peerSupport } from "./diagnostics.mjs";
import { snapshotMachines, floorBounds, focusPoint } from "./floorGeometry.mjs";
import { HelpContext, HelpPage } from "./Help";
import { type HelpTopic } from "./helpContent";
import { type FloorView } from "./OperationalMap";
import {
  Overview,
  MachineView,
  DemandView,
  OperationsView,
  GuestsView,
  LoyaltyView,
  MethodsView,
} from "./Views";
import { Planner } from "./ActionPlanner";
import { CopilotPanel, savedPlan } from "./Copilot";
import { attachDecision } from "./machineDiagnostics.mjs";
import { OpportunityView } from "./DecisionViews";
import { month, download, type Data } from "./ui";

export const pages = [
  { id: "overview", name: "Executive briefing", icon: LayoutDashboard },
  { id: "machines", name: "Machine performance", icon: MapIcon },
  { id: "demand", name: "Demand & location", icon: ChartNoAxesCombined },
  { id: "downtime", name: "Availability & repairs", icon: Wrench },
  { id: "guests", name: "Tracked guest outcomes", icon: Users },
  { id: "loyalty", name: "Loyalty costs", icon: Gift },
  { id: "planner", name: "Investment planner", icon: Wallet },
  { id: "opportunities", name: "Opportunities", icon: ListChecks },
  { id: "methods", name: "Methods & evidence", icon: FlaskConical },
];
const floorPages = ["overview", "machines", "demand", "downtime"],
  monthPages = [...floorPages, "guests", "loyalty"];
export function App() {
  const [data, setData] = useState<Data>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState("overview"),
    [start, setStart] = useState("2025-01"),
    [end, setEnd] = useState("2025-06"),
    [zone, setZone] = useState("all"),
    [bank, setBank] = useState("all"),
    [machine, setMachine] = useState<number | null>(null),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("win"),
    [tablePage, setTablePage] = useState(0),
    [group, setGroup] = useState("all|All tracked guests"),
    [mobile, setMobile] = useState(false),
    [topic, setTopic] = useState<HelpTopic>("start"),
    [helpTerm, setHelpTerm] = useState<string | undefined>(),
    [floorView, setFloorView] = useState<FloorView>({ scale: 1, x: 0, y: 0 }),
    [floorDate, setFloorDate] = useState<number | null>(null),
    [plannerOrigin, setPlannerOrigin] = useState(""),
    [demandZones, setDemandZones] = useState<string[]>([]),
    [demandTab, setDemandTab] = useState("traffic"),
    [loyaltyMix, setLoyaltyMix] = useState(false),
    [copilotOpen, setCopilotOpen] = useState(false),
    [planEntries, setPlanEntries] = useState<Data[] | null>(null),
    [opportunityQuery, setOpportunityQuery] = useState(""),
    [opportunityId, setOpportunityId] = useState("manufacturer"),
    [riskCap, setRiskCap] = useState(20000),
    [portfolioId, setPortfolioId] = useState("recommended");
  const returnPage = useRef("overview"),
    returnScroll = useRef(0);
  useEffect(() => {
    fetch("/data/dashboard.json")
      .then((r) => {
        if (!r.ok)
          throw Error(
            "The analysis artifact could not be loaded. Run npm run data.",
          );
        return r.json();
      })
      .then(async (d) => {
        let combined = d;
        try {
          const response = await fetch("/data/decision.json");
          if (response.ok) combined = attachDecision(d, await response.json());
        } catch {}
        setData(combined);
        setDemandZones(d.zones.map((z: Data) => z.zone_id));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        document.getElementById("navigation-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [mobile]);
  const rows = useMemo(
    () => (data ? selectRows(data, start, end, zone, bank) : []),
    [data, start, end, zone, bank],
  );
  const availableBanks = useMemo(
    () =>
      data
        ? ([
            ...new Set(
              selectRows(data, start, end, zone).map((r: Data) => r[3]),
            ),
          ].sort() as string[])
        : [],
    [data, start, end, zone],
  );
  useEffect(() => {
    if (
      data &&
      floorPages.includes(page) &&
      bank !== "all" &&
      !availableBanks.includes(bank)
    )
      setBank("all");
  }, [data, page, bank, availableBanks]);
  const fullScores = useMemo(
    () => (data ? machineScores(data, selectRows(data, start, end)) : []),
    [data, start, end],
  );
  const scores = useMemo(() => {
    if (!data) return [];
    const groups = new Map<number, Data[]>();
    rows.forEach((r: Data) => {
      if (!groups.has(r[1])) groups.set(r[1], []);
      groups.get(r[1])!.push(r);
    });
    return rankPeers(
      fullScores
        .filter((s: Data) => groups.has(s.machineIndex))
        .map((s: Data) => {
          const rs = groups.get(s.machineIndex)!,
            last = rs.reduce((a, b) => (a[0] > b[0] ? a : b));
          return {
            ...s,
            ...aggregate(rs),
            support: peerSupport(rs),
            zone: data.zones[last[2]],
            bank: last[3],
            location: last[16],
            days: new Set(rs.map((r) => r[0])).size,
          };
        }),
    );
  }, [data, rows, fullScores]);
  const totals = useMemo(() => aggregate(rows), [rows]);
  const trend = useMemo(() => {
    if (!data) return [];
    const byDate = new Map<number, Data[]>();
    rows.forEach((r: Data) => {
      if (!byDate.has(r[0])) byDate.set(r[0], []);
      byDate.get(r[0])!.push(r);
    });
    return [...byDate]
      .sort((a, b) => a[0] - b[0])
      .map(([date, rs]) => ({ date: data.dates[date], ...aggregate(rs) }));
  }, [data, rows]);
  const zoneScores = useMemo(
    () =>
      data
        ? data.zones
            .map((z: Data, i: number) => ({
              ...z,
              ...aggregate(rows.filter((r: Data) => r[2] === i)),
            }))
            .filter((z: Data) => z.scheduled > 0)
        : [],
    [data, rows],
  );
  const validDates = useMemo(
    () =>
      data
        ? data.dates.filter(
            (d: string) => d.slice(0, 7) >= start && d.slice(0, 7) <= end,
          )
        : [],
    [data, start, end],
  );
  const layoutIndex =
    data && floorDate !== null && validDates.includes(data.dates[floorDate])
      ? floorDate
      : data
        ? data.dates.indexOf(validDates.at(-1))
        : -1;
  const markers = useMemo(
    () => (data ? snapshotMachines(data, rows, scores, layoutIndex) : []),
    [data, rows, scores, layoutIndex],
  );
  const navigate = (id: string) => {
    setPage(id);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openHelp = (nextTopic: HelpTopic = "start", term?: string) => {
    if (page !== "help") {
      returnPage.current = page;
      returnScroll.current = window.scrollY;
    }
    setTopic(nextTopic);
    setHelpTerm(term);
    setPage("help");
    setMobile(false);
  };
  const returnFromHelp = () => {
    setPage(returnPage.current);
    requestAnimationFrame(() => {
      window.scrollTo({ top: returnScroll.current, behavior: "auto" });
      document
        .getElementById("analysis-heading")
        ?.focus({ preventScroll: true });
    });
  };
  if (error)
    return (
      <div className="loading">
        <h1>Analysis unavailable</h1>
        <p>{error}</p>
        <button className="button" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <Spade size={24} />
        <h1>Loading operational data…</h1>
      </div>
    );
  const scope = `${month(start)}–${month(end)} 2025 · ${zone === "all" ? "All zones" : data.zones.find((z: Data) => z.zone_id === zone)?.name}${bank === "all" ? "" : ` · ${bank}`}`;
  const banks = availableBanks;
  const [dimension, groupName] = group.split("|"),
    guest = data.guests.find(
      (g: Data) =>
        g.start === start &&
        g.end === end &&
        g.dimension === dimension &&
        g.group === groupName,
    ),
    period = data.property.filter(
      (r: Data) =>
        r.gaming_date.slice(0, 7) >= start && r.gaming_date.slice(0, 7) <= end,
    );
  const goPlanner = (origin: string) => {
    setPlannerOrigin(origin);
    navigate("planner");
  };
  const selectMachine = (id: number, focus = true) => {
    setMachine(id);
    const clearQuery = !focus;
    const candidateScores = [...scores]
      .filter(
        (s: Data) =>
          clearQuery ||
          `${s.id} ${s.theme} ${s.bank}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a: Data, b: Data) => a[sort] - b[sort]);
    if (clearQuery) setQuery("");
    const index = candidateScores.findIndex((s: Data) => s.machineIndex === id);
    if (index >= 0) setTablePage(Math.floor(index / 12));
    if (focus) {
      const rs = rows.filter((r: Data) => r[1] === id),
        r =
          rs.find((r: Data) => r[0] === layoutIndex) ||
          rs.reduce((a: Data, b: Data) => (a[0] > b[0] ? a : b));
      if (r) {
        setFloorDate(r[0]);
        const l = data.locations[r[16]];
        setFloorView(
          focusPoint(
            floorBounds(data.locations),
            { x: l.x_m, y: -l.y_m },
            Math.max(4, floorView.scale),
          ),
        );
        requestAnimationFrame(() =>
          document
            .querySelector(".machine-workspace")
            ?.scrollIntoView?.({ block: "start", behavior: "auto" }),
        );
      }
    }
  };
  const openFlag = (id: string) => {
    const index = data.machines.findIndex((m: Data) => m.id === id),
      rs = data.rows.filter((r: Data) => r[1] === index),
      last = rs.reduce((a: Data, b: Data) => (a[0] > b[0] ? a : b)),
      l = data.locations[last[16]];
    setStart("2025-01");
    setEnd("2025-06");
    setZone("all");
    setBank("all");
    setMachine(index);
    setQuery("");
    setSort("win");
    setFloorDate(last[0]);
    setTablePage(
      Math.max(
        0,
        Math.floor(
          machineScores(data, data.rows).findIndex((s: Data) => s.id === id) /
            12,
        ),
      ),
    );
    setFloorView(
      focusPoint(floorBounds(data.locations), { x: l.x_m, y: -l.y_m }, 4),
    );
    navigate("machines");
  };
  const resetFloor = () => {
    setFloorDate(null);
    setFloorView({ scale: 1, x: 0, y: 0 });
    setTablePage(0);
  };
  const exportAnalysis = () => {
    let result: Data;
    if (page === "guests")
      result = {
        coverage: "carded play only",
        group: guest.group,
        metrics: guest,
      };
    else if (page === "loyalty")
      result = {
        coverage: "whole property",
        months: data.loyalty.filter(
          (r: Data) => r.month >= start && r.month <= end,
        ),
        economicCompCost: period.reduce(
          (s: number, r: Data) => s + r.comp_cost_usd,
          0,
        ),
        theoDenominator: period.reduce(
          (s: number, r: Data) => s + r.theo_usd,
          0,
        ),
      };
    else
      result = {
        scope,
        totals,
        machines: scores,
        payoutTestScope:
          "all machines in selected months before zone/bank filtering",
        floorLayoutDate: data.dates[layoutIndex],
        layoutMachineIds: markers.map((m: Data) => m.id),
      };
    download(`gilded-ace-${page}.json`, {
      view: page,
      period: { start, end },
      sourceVersion: data.version,
      syntheticCasino: true,
      primaryFinancialRecommendation: data.decision?.recommendation,
      experimentalAlternative: data.decision?.experimentalRecommendation,
      result,
    });
  };
  const title =
    page === "help"
      ? "Help & learning center"
      : pages.find((p) => p.id === page)?.name;
  return (
    <HelpContext.Provider value={openHelp}>
      <div className="app-shell">
        <a className="skip-link" href="#analysis-heading">
          Skip to analysis
        </a>
        <aside className={"sidebar " + (mobile ? "open" : "")}>
          <button className="brand" onClick={() => navigate("overview")}>
            <Spade size={23} />
            <span>
              The Gilded Ace<small>Operations analytics</small>
            </span>
          </button>
          <nav aria-label="Main navigation">
            {pages.map((p) => (
              <button
                key={p.id}
                className={page === p.id ? "active" : ""}
                aria-current={page === p.id ? "page" : undefined}
                onClick={() => {
                  setPlannerOrigin("");
                  navigate(p.id);
                }}
              >
                <p.icon size={17} />
                <span>{p.name}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-status">
            <span className="status">Synthetic dataset · draft</span>
            <a href="/docs/AI_DISCLOSURE.md" target="_blank" rel="noreferrer">
              AI-use disclosure ↗
            </a>
          </div>
        </aside>
        {mobile && (
          <button
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <button
                id="navigation-toggle"
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                aria-expanded={mobile}
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={20} />
              </button>
              <span>Casino operations workspace</span>
            </div>
            <div className="topbar-right">
              <span className="data-badge">Data: Jan–Jun 2025</span>
              <button
                id="ask-data"
                className="header-help"
                aria-expanded={copilotOpen}
                onClick={() => setCopilotOpen(!copilotOpen)}
              >
                <MessageSquare size={15} /> Ask about this data
              </button>
              {page === "help" && (
                <button
                  className="button secondary"
                  aria-label="Return to previous analysis"
                  onClick={returnFromHelp}
                >
                  <ArrowLeft size={14} /> Return
                </button>
              )}
              <button
                className="header-help"
                aria-label="Help and learning center"
                onClick={() => openHelp("start")}
              >
                ? Help
              </button>
            </div>
          </header>
          <main>
            <div className="page-heading">
              <h1 id="analysis-heading" tabIndex={-1}>
                {title}
              </h1>
              {monthPages.includes(page) && (
                <button
                  className="button secondary export"
                  title="Download JSON results for the current page and selected scope"
                  onClick={exportAnalysis}
                >
                  <Download size={14} /> Export JSON
                </button>
              )}
            </div>
            {monthPages.includes(page) && (
              <section
                className="analysis-filters"
                aria-label="Analysis filters"
              >
                <div className="filterbar">
                  <label>
                    From
                    <select
                      aria-label="Start month"
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        if (e.target.value > end) setEnd(e.target.value);
                        resetFloor();
                      }}
                    >
                      {data.months.map((m: string) => (
                        <option key={m} value={m}>
                          {month(m)} 2025
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Through
                    <select
                      aria-label="End month"
                      value={end}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        if (e.target.value < start) setStart(e.target.value);
                        resetFloor();
                      }}
                    >
                      {data.months.map((m: string) => (
                        <option key={m} value={m}>
                          {month(m)} 2025
                        </option>
                      ))}
                    </select>
                  </label>
                  {floorPages.includes(page) && (
                    <>
                      <label>
                        Zone
                        <select
                          aria-label="Zone"
                          value={zone}
                          onChange={(e) => {
                            setZone(e.target.value);
                            setBank("all");
                            resetFloor();
                          }}
                        >
                          <option value="all">All zones</option>
                          {data.zones.map((z: Data) => (
                            <option key={z.zone_id} value={z.zone_id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Bank
                        <select
                          aria-label="Bank"
                          value={bank}
                          onChange={(e) => {
                            setBank(e.target.value);
                            resetFloor();
                          }}
                        >
                          <option value="all">All banks</option>
                          {banks.map((b) => (
                            <option key={b}>{b}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <button
                    className="icon-button reset"
                    aria-label="Reset filters"
                    title="Reset current page filters"
                    onClick={() => {
                      setStart("2025-01");
                      setEnd("2025-06");
                      if (floorPages.includes(page)) {
                        setZone("all");
                        setBank("all");
                      }
                      resetFloor();
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="filter-help text-button"
                    onClick={() => openHelp("filters")}
                  >
                    Filter scope
                  </button>
                </div>
                <span className="active-scope">
                  {floorPages.includes(page)
                    ? scope
                    : `${month(start)}–${month(end)} 2025 · ${page === "guests" ? "carded guest results" : "whole-property loyalty"}`}
                </span>
              </section>
            )}
            {page === "methods" && (
              <div className="fixed-scope">
                Fixed validation · Jan–Apr training / May–Jun holdout ·
                historical floor filters do not apply
              </div>
            )}
            {page === "planner" && (
              <div className="fixed-scope">
                July 1–30, 2025 · $100,000 maximum · historical filters do not
                change scenario baselines
              </div>
            )}
            {page === "overview" && (
              <Overview
                data={data}
                totals={totals}
                trend={trend}
                scope={scope}
                onNavigate={navigate}
                onFlag={openFlag}
              />
            )}
            {page === "machines" && (
              <MachineView
                data={data}
                scores={scores}
                rows={rows}
                start={start}
                end={end}
                fullScores={fullScores}
                totals={totals}
                scope={scope}
                selected={machine}
                onSelect={selectMachine}
                query={query}
                onQuery={setQuery}
                sort={sort}
                onSort={setSort}
                page={tablePage}
                onPage={setTablePage}
                markers={markers}
                view={floorView}
                onView={setFloorView}
                layoutDate={data.dates[layoutIndex]}
                dates={validDates}
                onDate={(d) => setFloorDate(data.dates.indexOf(d))}
                onMethods={() => navigate("methods")}
                onPlan={() => goPlanner("machines")}
              />
            )}
            {page === "demand" && (
              <DemandView
                data={data}
                rows={rows}
                scope={scope}
                start={start}
                end={end}
                selectedZones={demandZones}
                onZones={setDemandZones}
                tab={demandTab}
                onTab={setDemandTab}
                onPlan={() => goPlanner("demand")}
              />
            )}
            {page === "downtime" && (
              <OperationsView
                data={data}
                totals={totals}
                trend={trend}
                zoneScores={zoneScores}
                scope={scope}
                onPlan={() => goPlanner("downtime")}
              />
            )}
            {page === "guests" && guest && (
              <GuestsView
                data={data}
                guest={guest}
                group={group}
                onGroup={setGroup}
              />
            )}
            {page === "loyalty" && (
              <LoyaltyView
                data={data}
                period={period}
                start={start}
                end={end}
                showMix={loyaltyMix}
                onMix={setLoyaltyMix}
                onPlan={() => goPlanner("loyalty")}
              />
            )}
            {page === "planner" && (
              <>
                {plannerOrigin && (
                  <div className="decision-context">
                    <span>
                      From {pages.find((p) => p.id === plannerOrigin)?.name}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => navigate(plannerOrigin)}
                    >
                      Return to the investigation <ArrowLeft size={13} />
                    </button>
                  </div>
                )}
                <Planner
                  data={data}
                  onPlanChange={setPlanEntries}
                  riskCap={riskCap}
                  setRiskCap={setRiskCap}
                  portfolioId={portfolioId}
                  setPortfolioId={setPortfolioId}
                  onEvidence={() => navigate("methods")}
                  contextMachine={
                    plannerOrigin === "machines" &&
                    machine !== null &&
                    data.planner.machines.some(
                      (m: Data) => m.id === data.machines[machine].id,
                    )
                      ? data.machines[machine].id
                      : undefined
                  }
                />
              </>
            )}
            {page === "opportunities" && (
              <OpportunityView
                data={data}
                query={opportunityQuery}
                setQuery={setOpportunityQuery}
                selected={opportunityId}
                setSelected={setOpportunityId}
                onPlan={() => goPlanner("opportunities")}
                onInvestigate={(target: Data) => {
                  if (target.machine) {
                    openFlag(target.machine);
                    return;
                  }
                  setStart("2025-01");
                  setEnd("2025-06");
                  setZone("all");
                  setBank("all");
                  navigate(target.page);
                }}
              />
            )}
            {page === "methods" && <MethodsView data={data} />}
            {page === "help" && (
              <HelpPage
                topic={topic}
                focusTerm={helpTerm}
                onReturn={returnFromHelp}
                returnLabel={
                  pages.find((p) => p.id === returnPage.current)?.name ||
                  "Executive briefing"
                }
                onNavigate={navigate}
              />
            )}
            <footer>
              <span>The Gilded Ace · fictional casino · {data.version}</span>
              <div>
                <a
                  href="/docs/CLAIMS_AND_EVIDENCE.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Claims & Evidence ↗
                </a>
                <a
                  href="/docs/AI_DISCLOSURE.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  AI disclosure ↗
                </a>
              </div>
            </footer>
          </main>
          {copilotOpen && (
            <CopilotPanel
              data={data}
              context={{
                page,
                start,
                end,
                zone,
                bank,
                machine: machine === null ? null : data.machines[machine].id,
                group,
                plan: planEntries ?? savedPlan(data),
                sourceVersion: data.version,
                opportunityId,
                portfolioId,
                riskCap,
              }}
              onClose={() => setCopilotOpen(false)}
              onOpen={(target: Data) => {
                // Applying a suggestion is an explicit button action; no chat turn mutates navigation or plans.
                if (target.portfolioId) setPortfolioId(target.portfolioId);
                if (target.riskCap !== undefined) setRiskCap(target.riskCap);
                if (target.opportunityId)
                  setOpportunityId(target.opportunityId);
                if (target.start) {
                  setStart(target.start);
                  setEnd(target.end);
                  setZone(target.zone);
                  setBank(target.bank);
                  resetFloor();
                }
                if (target.machine) {
                  const index = data.machines.findIndex(
                    (m: Data) => m.id === target.machine,
                  );
                  setMachine(index);
                  setQuery(target.machine);
                  setTablePage(0);
                  const rs = selectRows(
                    data,
                    target.start ?? start,
                    target.end ?? end,
                    target.zone ?? zone,
                    target.bank ?? bank,
                  ).filter((r: Data) => r[1] === index);
                  if (rs.length) {
                    const last = rs.reduce((a: Data, b: Data) =>
                        a[0] > b[0] ? a : b,
                      ),
                      l = data.locations[last[16]];
                    setFloorDate(last[0]);
                    setFloorView(
                      focusPoint(
                        floorBounds(data.locations),
                        { x: l.x_m, y: -l.y_m },
                        4,
                      ),
                    );
                  }
                }
                navigate(target.page);
                setCopilotOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </HelpContext.Provider>
  );
}
