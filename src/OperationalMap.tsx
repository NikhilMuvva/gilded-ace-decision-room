import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, Minus, Expand } from "lucide-react";
import {
  floorBounds,
  viewBox,
  constrainView,
  pixelToWorld,
  zoomAt,
  focusPoint,
  nearestMachines,
} from "./floorGeometry.mjs";
import { money, pct, number } from "./ui";
export type FloorView = { scale: number; x: number; y: number };
export function Floor({
  data,
  markers,
  onSelect,
  selected,
  view,
  onView,
  layoutDate,
  dates,
  onDate,
}: {
  data: any;
  markers: any[];
  onSelect: (id: number) => void;
  selected: number | null;
  view: FloorView;
  onView: (v: FloorView) => void;
  layoutDate: string;
  dates: string[];
  onDate: (date: string) => void;
}) {
  const bounds = useMemo(() => floorBounds(data.locations), [data]),
    box = viewBox(bounds, view),
    svg = useRef<SVGSVGElement>(null),
    root = useRef<HTMLDivElement>(null),
    live = useRef({ view, markers }),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    origin = useRef({ x: 0, y: 0 }),
    dragged = useRef(false),
    ignoreClickUntil = useRef(0),
    [hover, setHover] = useState<{ machine: any; x: number; y: number } | null>(
      null,
    ),
    [choices, setChoices] = useState<any[]>([]),
    [size, setSize] = useState({ width: 800, height: 500 }),
    pattern = useId().replace(/:/g, "");
  live.current = { view, markers };
  const rect = () =>
    svg.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: size.width,
      height: size.height,
    };
  const point = (x: number, y: number) =>
    pixelToWorld(x, y, rect(), viewBox(bounds, live.current.view));
  const setView = (v: FloorView) => onView(constrainView(bounds, v));
  const zoom = (factor: number, anchor?: { x: number; y: number }) => {
    const old = viewBox(bounds, live.current.view);
    onView(
      zoomAt(
        bounds,
        live.current.view,
        factor,
        anchor || { x: old.x + old.width / 2, y: old.y + old.height / 2 },
      ),
    );
    setHover(null);
  };
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      if (r.width && r.height) setSize({ width: r.width, height: r.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(
        Math.exp(
          Math.max(
            -0.5,
            Math.min(0.5, -e.deltaY * (e.ctrlKey?.valueOf() ? 0.006 : 0.002)),
          ),
        ),
        point(e.clientX, e.clientY),
      );
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      node.removeEventListener("wheel", wheel);
    };
  }, [data]);
  const banks = [...new Set(markers.map((m) => m.bank))].map((id) => {
    const ms = markers.filter((m) => m.bank === id),
      xs = ms.map((m) => m.x),
      ys = ms.map((m) => m.y);
    return {
      id,
      name: `${id} · ${ms[0].zone.name}`,
      x: Math.min(...xs) - 1.5,
      y: Math.min(...ys) - 1.5,
      width: Math.max(...xs) - Math.min(...xs) + 3,
      height: Math.max(...ys) - Math.min(...ys) + 3,
    };
  });
  const units = 1 / Math.min(size.width / box.width, size.height / box.height),
    r = Math.max(0.4, Math.min(0.95, 3.8 * units)),
    hubs = Object.fromEntries(data.zones.map((z: any) => [z.zone_id, z]));
  const choose = (id: number) => {
    onSelect(id);
    setChoices([]);
  };
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (dragged.current) ignoreClickUntil.current = Date.now() + 250;
    if (!pointers.current.size) dragged.current = false;
  };
  return (
    <div className="floor-component">
      <div className="map-context">
        <label>
          Floor layout date
          <input
            aria-label="Floor layout date"
            type="date"
            value={layoutDate}
            min={dates[0]}
            max={dates[dates.length - 1]}
            onChange={(e) => {
              if (dates.includes(e.target.value)) {
                onDate(e.target.value);
                setChoices([]);
                setHover(null);
              }
            }}
          />
        </label>
        <label>
          Locate a bank
          <select
            aria-label="Locate bank on map"
            value=""
            onChange={(e) => {
              const b = banks.find((b) => b.id === e.target.value);
              if (b)
                onView(
                  focusPoint(
                    bounds,
                    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
                    Math.min(
                      14,
                      Math.max(
                        3,
                        Math.min(
                          bounds.width / (b.width + 10),
                          bounds.height / (b.height + 10),
                        ),
                      ),
                    ),
                  ),
                );
            }}
          >
            <option value="">Choose bank…</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <span className="map-layout-label">
          {markers.length} installed · {layoutDate}
        </span>
      </div>
      <div className="floor-viewport" ref={root}>
        <div className="map-toolbar" aria-label="Floor map controls">
          <button
            aria-label="Zoom in floor map"
            title="Zoom in (+)"
            disabled={view.scale >= 14}
            onClick={() => zoom(1.4)}
          >
            <Plus size={16} />
          </button>
          <button
            aria-label="Zoom out floor map"
            title="Zoom out (−)"
            disabled={view.scale <= 1}
            onClick={() => zoom(1 / 1.4)}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Fit floor"
            title="Fit floor (Home)"
            onClick={() => {
              onView({ scale: 1, x: 0, y: 0 });
              setChoices([]);
            }}
          >
            <Expand size={16} />
          </button>
          <output aria-label="Map zoom">{Math.round(view.scale * 100)}%</output>
        </div>
        <svg
          ref={svg}
          className="floor-canvas"
          role="group"
          tabIndex={0}
          aria-label="Interactive casino floor map"
          aria-describedby={`map-instructions-${pattern}`}
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={(e) => {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            origin.current = { x: e.clientX, y: e.clientY };
            dragged.current = false;
            setHover(null);
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
          }}
          onPointerMove={(e) => {
            const previous = pointers.current.get(e.pointerId);
            if (!previous) return;
            const before = [...pointers.current.values()];
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size >= 2) {
              const after = [...pointers.current.values()],
                [a, b] = before,
                [c, d] = after,
                oldDistance = Math.hypot(a.x - b.x, a.y - b.y),
                newDistance = Math.hypot(c.x - d.x, c.y - d.y),
                anchor = point((a.x + b.x) / 2, (a.y + b.y) / 2);
              if (oldDistance) {
                const next = zoomAt(
                    bounds,
                    live.current.view,
                    newDistance / oldDistance,
                    anchor,
                  ),
                  shift = pixelToWorld(
                    (c.x + d.x) / 2,
                    (c.y + d.y) / 2,
                    rect(),
                    viewBox(bounds, next),
                  );
                setView({
                  ...next,
                  x: next.x + anchor.x - shift.x,
                  y: next.y + anchor.y - shift.y,
                });
              }
              dragged.current = true;
              return;
            }
            if (
              dragged.current ||
              Math.hypot(
                e.clientX - origin.current.x,
                e.clientY - origin.current.y,
              ) > 4
            ) {
              dragged.current = true;
              const v = live.current.view,
                u = point(e.clientX, e.clientY).unitsPerPixel;
              setView({
                ...v,
                x: v.x - (e.clientX - previous.x) * u,
                y: v.y - (e.clientY - previous.y) * u,
              });
            }
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onClick={(e) => {
            if (Date.now() < ignoreClickUntil.current) return;
            const target = (e.target as Element).closest("[data-machine]");
            if (e.detail === 0 && target) {
              choose(Number(target.getAttribute("data-index")));
              return;
            }
            const nearest = nearestMachines(
              live.current.markers,
              point(e.clientX, e.clientY),
            );
            if (nearest.length === 1) choose(nearest[0].machineIndex);
            else setChoices(nearest);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            zoom(1.8, point(e.clientX, e.clientY));
          }}
          onMouseMove={(e) => {
            if (pointers.current.size) return;
            const m = nearestMachines(
                live.current.markers,
                point(e.clientX, e.clientY),
                13,
              )[0],
              b = root.current?.getBoundingClientRect();
            setHover(
              m && b
                ? {
                    machine: m,
                    x: Math.max(
                      8,
                      Math.min(e.clientX - b.left + 14, b.width - 240),
                    ),
                    y: Math.max(
                      8,
                      Math.min(e.clientY - b.top + 14, b.height - 110),
                    ),
                  }
                : null,
            );
          }}
          onMouseLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            const v = live.current.view,
              step = box.width * 0.12;
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "+",
                "=",
                "-",
                "Home",
              ].includes(e.key)
            ) {
              e.preventDefault();
              if (e.key === "ArrowLeft") setView({ ...v, x: v.x - step });
              if (e.key === "ArrowRight") setView({ ...v, x: v.x + step });
              if (e.key === "ArrowUp") setView({ ...v, y: v.y - step });
              if (e.key === "ArrowDown") setView({ ...v, y: v.y + step });
              if (e.key === "+" || e.key === "=") zoom(1.4);
              if (e.key === "-") zoom(1 / 1.4);
              if (e.key === "Home") onView({ scale: 1, x: 0, y: 0 });
            }
          }}
        >
          <defs>
            <pattern
              id={`grid-${pattern}`}
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="0" cy="0" r=".09" fill="#ced9cc" />
            </pattern>
          </defs>
          <rect
            x={bounds.x - 100}
            y={bounds.y - 100}
            width={bounds.width + 200}
            height={bounds.height + 200}
            fill={`url(#grid-${pattern})`}
          />
          {data.walkways.map((l: any) => {
            const a = hubs[l.zone_a],
              b = hubs[l.zone_b],
              closed =
                l.closed_from_utc &&
                layoutDate >= l.closed_from_utc &&
                layoutDate < l.closed_to_utc;
            return (
              <g
                key={l.walkway_id}
                role="img"
                aria-label={`Walkway ${a.name} to ${b.name}${closed ? ", closed for renovation on layout date" : ""}`}
              >
                <title>
                  {a.name} ↔ {b.name}
                  {closed ? " · renovation closure" : ""}
                </title>
                <line
                  x1={a.x_m}
                  y1={-a.y_m}
                  x2={b.x_m}
                  y2={-b.y_m}
                  stroke={closed ? "#ac7923" : "#c3cfbf"}
                  strokeWidth={closed ? 0.8 : 0.55}
                  strokeDasharray={closed ? "2 1" : undefined}
                />
              </g>
            );
          })}
          {banks.map((b) => (
            <g key={b.id} role="img" aria-label={`Bank ${b.id}`}>
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx=".7"
                fill="#f6f9f3"
                fillOpacity=".85"
                stroke="#c0cfb5"
                strokeWidth=".2"
              />
              {view.scale > 2.5 && (
                <text
                  x={b.x + b.width / 2}
                  y={b.y - 1}
                  textAnchor="middle"
                  fontSize={9 * units}
                  fill="#718064"
                >
                  {b.id}
                </text>
              )}
            </g>
          ))}
          {data.zones.map((z: any) => (
            <text
              key={z.zone_id}
              x={z.x_m}
              y={-z.y_m + 16}
              textAnchor="middle"
              fontSize={11 * units}
              fontWeight="600"
              fill="#667961"
            >
              {z.name}
            </text>
          ))}
          {markers.map((m) => {
            const flag = m.q < 0.05 && m.z < 0,
              color = flag
                ? "#ad493d"
                : m.index < 0.95
                  ? "#af8b32"
                  : m.index > 1.05
                    ? "#216a51"
                    : "#7e9b7e";
            return (
              <g
                key={m.id}
                className="machine-marker"
                data-machine={m.id}
                data-index={m.machineIndex}
                data-location={m.position.location_id}
                data-x={m.x}
                data-y={m.y}
                role="button"
                tabIndex={0}
                aria-label={`${m.id}, ${m.zone.name}, bank ${m.bank}, peer index ${m.index?.toFixed(2)}`}
                aria-pressed={selected === m.machineIndex}
                onFocus={() => setHover({ machine: m, x: 12, y: 12 })}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    choose(m.machineIndex);
                  }
                }}
              >
                <title>
                  {m.id} · {m.position.location_id}
                </title>
                {selected === m.machineIndex && (
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r + 1.4 * units + 0.3}
                    fill="#e1bd56"
                    fillOpacity=".2"
                    stroke="#172f25"
                    strokeWidth={Math.max(0.18, 1.8 * units)}
                  />
                )}
                {m.index < 0.95 && !flag ? (
                  <rect
                    x={m.x - r}
                    y={m.y - r}
                    width={r * 2}
                    height={r * 2}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={Math.max(0.08, 0.7 * units)}
                    pointerEvents="none"
                  />
                ) : m.index > 1.05 && !flag ? (
                  <path
                    d={`M${m.x} ${m.y - r * 1.2} l${r * 1.2} ${r * 1.2} l${-r * 1.2} ${r * 1.2} l${-r * 1.2} ${-r * 1.2}z`}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={Math.max(0.08, 0.7 * units)}
                    pointerEvents="none"
                  />
                ) : (
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={Math.max(0.08, 0.7 * units)}
                    pointerEvents="none"
                  />
                )}
                {flag && (
                  <path
                    d={`M${m.x},${m.y - r * 0.65} l${r * 0.6},${r * 1.1} h${-r * 1.2}z`}
                    fill="#fff"
                    pointerEvents="none"
                  />
                )}
                {view.scale >= 6 && (
                  <text
                    x={m.x}
                    y={m.y + r + 1.8 * units}
                    textAnchor="middle"
                    fontSize={10 * units}
                    fill="#314a37"
                    pointerEvents="none"
                  >
                    {m.id.replace("M-", "")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className="map-tooltip"
            role="tooltip"
            style={{ left: hover.x, top: hover.y }}
          >
            <strong>
              {hover.machine.id} <span>{hover.machine.bank}</span>
            </strong>
            <div>
              Theo / available hour <b>{money(hover.machine.rate, false, 2)}</b>
            </div>
            <div>
              Peer index <b>{number(hover.machine.index, 2)}×</b> · availability{" "}
              <b>{pct(hover.machine.availability)}</b>
            </div>
          </div>
        )}
        {choices.length > 1 && (
          <div
            className="map-candidates"
            role="dialog"
            aria-label="Choose a machine at this position"
          >
            <strong>Machines at this position</strong>
            {choices.map((m) => (
              <button key={m.id} onClick={() => choose(m.machineIndex)}>
                {m.id} · {m.position.location_id}
              </button>
            ))}
            <button onClick={() => setChoices([])}>Cancel</button>
          </div>
        )}
        {!markers.length && (
          <div className="map-empty">
            No installed machines match this layout date and floor scope.
          </div>
        )}
      </div>
      <div className="map-legend">
        <span>● Machine</span>
        <span>▱ Bank</span>
        <span>Zone name</span>
        <span>— Walkway</span>
        <span>◎ Selected</span>
        <span className="warning">▲ Payout flag</span>
        <span>■ Below 0.95× · ● Near peers · ◆ Above 1.05×</span>
      </div>
      <p className="map-instructions" id={`map-instructions-${pattern}`}>
        Wheel to zoom at cursor · drag to pan · pinch or double-click to zoom ·
        keyboard arrows, +/− and Home. Supplied coordinates in metres.
      </p>
    </div>
  );
}
