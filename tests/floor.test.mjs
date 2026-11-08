import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  floorBounds,
  viewBox,
  pixelToWorld,
  zoomAt,
  focusPoint,
  constrainView,
  snapshotMachines,
  nearestMachines,
} from "../src/floorGeometry.mjs";
import { machineScores, selectRows } from "../src/lib.mjs";
const data = JSON.parse(
    fs.readFileSync(
      new URL("../public/data/dashboard.json", import.meta.url),
      "utf8",
    ),
  ),
  bounds = floorBounds(data.locations),
  fit = { scale: 1, x: 0, y: 0 },
  scores = machineScores(data, data.rows);
const almost = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("cursor anchored zoom preserves the same supplied world point at the same pixel", () => {
  const rect = { left: 70, top: 120, width: 830, height: 490 },
    before = viewBox(bounds, fit),
    anchor = pixelToWorld(420, 360, rect, before),
    next = zoomAt(bounds, fit, 2.7, anchor),
    after = pixelToWorld(420, 360, rect, viewBox(bounds, next));
  almost(anchor.x, after.x);
  almost(anchor.y, after.y);
});
test("zoom and pan have bounds and focus uses a real unshifted point", () => {
  assert.equal(constrainView(bounds, { scale: 100, x: 0, y: 0 }).scale, 14);
  assert.equal(constrainView(bounds, { scale: 0.01, x: 0, y: 0 }).scale, 1);
  const point = { x: 65, y: -50 },
    v = focusPoint(bounds, point, 5),
    box = viewBox(bounds, v);
  almost(box.x + box.width / 2, point.x);
  almost(box.y + box.height / 2, point.y);
  const far = viewBox(
    bounds,
    constrainView(bounds, { scale: 8, x: 10000, y: -10000 }),
  );
  assert.ok(far.x < bounds.x + bounds.width);
  assert.ok(far.y + far.height > bounds.y);
});
test("dated floor snapshots exclude retired machines and contain every active installed machine once", () => {
  const end = data.dates.indexOf("2025-06-30"),
    markers = snapshotMachines(data, data.rows, scores, end),
    source = data.rows.filter((r) => r[0] === end);
  assert.equal(markers.length, 308);
  assert.equal(new Set(markers.map((m) => m.id)).size, 308);
  assert.deepEqual(
    markers.map((m) => m.machineIndex).sort((a, b) => a - b),
    source.map((r) => r[1]).sort((a, b) => a - b),
  );
  for (const m of markers) {
    const l = data.locations[m.location];
    assert.equal(m.x, l.x_m);
    assert.equal(m.y, -l.y_m);
  }
});
test("the same moved machine has its actual different placements on either side of the move", () => {
  const index = data.machines.findIndex((m) => m.id === "M-1152");
  const before = snapshotMachines(
    data,
    data.rows,
    scores,
    data.dates.indexOf("2025-02-03"),
  ).find((m) => m.machineIndex === index);
  const after = snapshotMachines(
    data,
    data.rows,
    scores,
    data.dates.indexOf("2025-02-04"),
  ).find((m) => m.machineIndex === index);
  assert.equal(before.position.location_id, "L-33-4");
  assert.equal(after.position.location_id, "L-03-7");
  assert.notEqual(before.zone.zone_id, after.zone.zone_id);
});
test("month and bank filtering preserve dated physical positions without inventing coordinates", () => {
  const rows = selectRows(data, "2025-02", "2025-02", "Z-B40", "B-31"),
    ms = snapshotMachines(
      data,
      rows,
      machineScores(data, rows),
      data.dates.indexOf("2025-02-20"),
    );
  assert.ok(ms.length > 0);
  assert.ok(
    ms.every(
      (m) =>
        m.bank === "B-31" &&
        m.zone.zone_id === "Z-B40" &&
        m.position.bank_id === "B-31",
    ),
  );
});
test("spatial hit testing selects the nearest machine and returns a list for coincident targets", () => {
  const markers = [
      { id: "A", x: 10, y: 15 },
      { id: "B", x: 10, y: 15 },
      { id: "C", x: 20, y: 15 },
    ],
    point = { x: 10, y: 15, unitsPerPixel: 0.1 };
  assert.deepEqual(
    nearestMachines(markers, point).map((m) => m.id),
    ["A", "B"],
  );
  assert.deepEqual(
    nearestMachines(markers, { ...point, x: 20 }).map((m) => m.id),
    ["C"],
  );
  assert.deepEqual(nearestMachines(markers, { ...point, x: 100 }), []);
});
