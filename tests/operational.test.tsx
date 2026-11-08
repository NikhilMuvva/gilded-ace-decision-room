import React from "react";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import fs from "node:fs";
import { App } from "../src/main";
import { pixelToWorld } from "../src/floorGeometry.mjs";
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
beforeEach(() => {
  localStorage.clear();
  // Explicit custom-plan fixture; the comprehensive recommendation is tested separately.
  localStorage.setItem(
    "gilded-ace-plan-v1",
    JSON.stringify([
      {
        id: "A-INSPECT",
        quantity: 1,
        targets: ["M-1158"],
        effect: 0,
        extraCost: 0,
      },
    ]),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => data })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const height = this.classList.contains("recharts-legend-wrapper")
        ? 24
        : this.id === "recharts_measurement_span"
          ? 14
          : 500;
      return {
        width: 800,
        height,
        left: 0,
        top: 0,
        right: 800,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.getElementById("test-production-css")?.remove();
});
async function start() {
  render(<App />);
  await screen.findByRole(
    "heading",
    { name: "Executive briefing", level: 1 },
    { timeout: 15000 },
  );
}
const go = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("button", { name, exact: true }),
  );
const box = (map: Element) => {
  const [x, y, width, height] = map
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  return { x, y, width, height };
};
function wheel(map: Element, deltaY: number, x = 400, y = 250) {
  const e = new WheelEvent("wheel", {
    deltaY,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperties(e, { clientX: { value: x }, clientY: { value: y } });
  fireEvent(map, e);
  return e;
}

test("production map controls are 34px with 16px icons and cannot inherit canvas dimensions", async () => {
  const style = document.createElement("style");
  style.id = "test-production-css";
  style.textContent = fs
    .readFileSync("src/app.css", "utf8")
    .replace(/@import[^;]+;/g, "");
  document.head.append(style);
  await start();
  go("Machine performance");
  for (const name of ["Zoom in floor map", "Zoom out floor map", "Fit floor"]) {
    const b = screen.getByRole("button", { name });
    expect(getComputedStyle(b).width).toBe("34px");
    expect(getComputedStyle(b).height).toBe("34px");
    expect(getComputedStyle(b.querySelector("svg")!).width).toBe("16px");
    expect(getComputedStyle(b.querySelector("svg")!).height).toBe("16px");
  }
  expect(document.querySelectorAll(".map-toolbar button")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Pan floor right" })).toBeNull();
});
test("wheel anchors to the cursor, outside scrolling is untouched, and a bank locator focuses the map", async () => {
  await start();
  go("Machine performance");
  const map = screen.getByRole("group", {
      name: "Interactive casino floor map",
    }),
    before = box(map),
    rect = { left: 0, top: 0, width: 800, height: 500 },
    point = pixelToWorld(380, 230, rect, before);
  const e = wheel(map, -160, 380, 230);
  expect(e.defaultPrevented).toBe(true);
  await waitFor(() => expect(box(map).width).toBeLessThan(before.width));
  const after = pixelToWorld(380, 230, rect, box(map));
  expect(after.x).toBeCloseTo(point.x, 7);
  expect(after.y).toBeCloseTo(point.y, 7);
  const current = map.getAttribute("viewBox"),
    outside = wheel(
      screen.getByRole("heading", { name: "Machine performance", level: 1 }),
      -100,
    );
  expect(outside.defaultPrevented).toBe(false);
  expect(map.getAttribute("viewBox")).toBe(current);
  fireEvent.change(
    screen.getByRole("combobox", { name: "Locate bank on map" }),
    { target: { value: "B-31" } },
  );
  expect(box(map).width).toBeLessThan(before.width / 3);
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  expect(box(map)).toEqual(before);
});
test("layout dates use actual placements and date-range changes cannot leave a stale floor snapshot", async () => {
  await start();
  go("Machine performance");
  expect(document.querySelectorAll("[data-machine]")).toHaveLength(308);
  const date = screen.getByLabelText("Floor layout date");
  fireEvent.change(date, { target: { value: "2025-02-03" } });
  expect(
    document
      .querySelector('[data-machine="M-1152"]')
      ?.getAttribute("data-location"),
  ).toBe("L-33-4");
  fireEvent.change(date, { target: { value: "2025-02-04" } });
  expect(
    document
      .querySelector('[data-machine="M-1152"]')
      ?.getAttribute("data-location"),
  ).toBe("L-03-7");
  fireEvent.change(screen.getByRole("combobox", { name: "End month" }), {
    target: { value: "2025-01" },
  });
  expect(
    (screen.getByLabelText("Floor layout date") as HTMLInputElement).value,
  ).toBe("2025-01-31");
});
test("selecting a historical machine from the table switches to its last active layout and selects the correct marker", async () => {
  await start();
  go("Machine performance");
  const last = data.dates.length - 1,
    retired = data.machines.findIndex(
      (_: any, i: number) =>
        !data.rows.some((r: any) => r[0] === last && r[1] === i),
    ),
    id = data.machines[retired].id,
    source = data.rows
      .filter((r: any) => r[1] === retired)
      .sort((a: any, b: any) => b[0] - a[0])[0];
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: id },
  });
  fireEvent.click(screen.getByRole("button", { name: id, exact: true }));
  expect(
    (screen.getByLabelText("Floor layout date") as HTMLInputElement).value,
  ).toBe(data.dates[source[0]]);
  const marker = document.querySelector(`[data-machine="${id}"]`)!;
  expect(marker.getAttribute("aria-pressed")).toBe("true");
  expect(marker.getAttribute("data-location")).toBe(
    data.locations[source[16]].location_id,
  );
  expect(
    screen.getByRole("heading", { name: new RegExp(id + " ·") }),
  ).toBeTruthy();
});
test("map selection synchronizes a paginated table and the dossier, and table selection focuses the map", async () => {
  await start();
  go("Machine performance");
  const marker = document.querySelector('[data-machine="M-1299"]')!;
  fireEvent.keyDown(marker, { key: "Enter" });
  const row = document.querySelector(
    `[data-row-machine="${data.machines.findIndex((m: any) => m.id === "M-1299")}"]`,
  );
  expect(row?.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("heading", { name: /M-1299 ·/ })).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: "M-1158" },
  });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Search machines" }), {
    key: "Enter",
  });
  expect(
    document
      .querySelector('[data-machine="M-1158"]')
      ?.getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    Number(screen.getByLabelText("Map zoom").textContent?.replace("%", "")),
  ).toBeGreaterThanOrEqual(400);
});
test("loyalty trends and validation results are visible first, with technical reference separate", async () => {
  await start();
  go("Loyalty costs");
  const cost = screen.getByRole("heading", {
      name: "Monthly loyalty cost and menu value",
    }),
    price = screen.getByRole("heading", {
      name: "Points charged per benefit dollar",
    });
  expect(cost.closest("details")).toBeNull();
  expect(price.closest("details")).toBeNull();
  await waitFor(() =>
    expect(
      price.closest("section")?.querySelectorAll(".recharts-line"),
    ).toHaveLength(1),
  );
  fireEvent.click(screen.getByLabelText("Fixed mix comparison"));
  await waitFor(() =>
    expect(
      price.closest("section")?.querySelectorAll(".recharts-line"),
    ).toHaveLength(2),
  );
  go("Methods & evidence");
  const model = screen.getByRole("heading", {
      name: "Demand forecast and model validation",
    }),
    reference = screen.getByRole("heading", {
      name: "Metrics, methods, sources and limits",
    });
  expect(
    model.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText("$68,699")).toBeTruthy();
});
test("zone-series controls allow a focused demand comparison without changing global filter scope", async () => {
  await start();
  go("Demand & location");
  const controls = screen.getByLabelText("Zone chart series");
  for (const z of data.zones.filter((z: any) => z.zone_id !== "Z-B40"))
    fireEvent.click(within(controls).getByRole("checkbox", { name: z.name }));
  expect(
    screen
      .getByRole("heading", { name: "Floor demand by zone" })
      .closest("section")
      ?.querySelectorAll(".recharts-line"),
  ).toHaveLength(1);
  expect(
    (screen.getByRole("combobox", { name: "Zone" }) as HTMLSelectElement).value,
  ).toBe("all");
});
test("scope-aware JSON export returns selected guest results rather than irrelevant floor data", async () => {
  let captured: Blob | undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
    captured = b as Blob;
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await start();
  go("Tracked guest outcomes");
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-05" },
  });
  fireEvent.change(screen.getByLabelText("Guest group"), {
    target: { value: "home_region|Local" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
  const result = JSON.parse(await captured!.text());
  expect(result.period).toEqual({ start: "2025-05", end: "2025-06" });
  expect(result.result.coverage).toBe("carded play only");
  expect(result.result.group).toBe("Local");
  expect(result.result.machines).toBeUndefined();
  expect(result.result.metrics.net).toBe(
    data.guests.find(
      (g: any) =>
        g.start === "2025-05" &&
        g.end === "2025-06" &&
        g.dimension === "home_region" &&
        g.group === "Local",
    ).net,
  );
});
test("acceptance workflow: wheel into Back Forty, drag, click a machine, select another from search, fit, and configure a priced response", async () => {
  await start();
  go("Machine performance");
  const map = screen.getByRole("group", {
      name: "Interactive casino floor map",
    }),
    original = box(map),
    marker = document.querySelector('[data-machine="M-1158"]')!;
  const toPixel = (x: number, y: number) => {
    const b = box(map),
      scale = Math.min(800 / b.width, 500 / b.height);
    return {
      x: (800 - b.width * scale) / 2 + (x - b.x) * scale,
      y: (500 - b.height * scale) / 2 + (y - b.y) * scale,
    };
  };
  let point = toPixel(
    Number(marker.getAttribute("data-x")),
    Number(marker.getAttribute("data-y")),
  );
  wheel(map, -300, point.x, point.y);
  expect(box(map).width).toBeLessThan(original.width);
  const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
  fireEvent.pointerDown(map, { pointerId: 1, clientX: 400, clientY: 250 });
  fireEvent.pointerMove(map, { pointerId: 1, clientX: 440, clientY: 270 });
  fireEvent.pointerUp(map, { pointerId: 1 });
  clock.mockReturnValue(2000);
  point = toPixel(
    Number(marker.getAttribute("data-x")),
    Number(marker.getAttribute("data-y")),
  );
  fireEvent.click(map, { clientX: point.x, clientY: point.y, detail: 1 });
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
  expect(marker.getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: "M-1299" },
  });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Search machines" }), {
    key: "Enter",
  });
  expect(
    document
      .querySelector('[data-machine="M-1299"]')
      ?.getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByRole("heading", { name: /M-1299 ·/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  expect(box(map)).toEqual(original);
  fireEvent.click(screen.getByRole("button", { name: "Evidence & methods" }));
  expect(
    screen.getByRole("heading", { name: "Recommendation evidence" }),
  ).toBeTruthy();
  go("Machine performance");
  fireEvent.click(screen.getByRole("button", { name: "Evaluate action" }));
  const lease = "Replace a machine with a leased new title";
  fireEvent.click(screen.getByRole("button", { name: "Add " + lease }));
  expect(
    (
      screen.getByRole("combobox", {
        name: lease + " target 1",
      }) as HTMLSelectElement
    ).value,
  ).toBe("M-1299");
  fireEvent.change(
    screen.getByRole("spinbutton", { name: lease + " quantity" }),
    { target: { value: "2" } },
  );
  expect(document.querySelector(".planner-summary")?.textContent).toContain(
    "$7,960",
  );
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Compare configured subsets" }),
  );
  expect(screen.getByRole("status").textContent).toContain("Preserving cash");
});
test("small-screen production styles stack working panels and mobile navigation remains usable", async () => {
  const style = document.createElement("style");
  style.id = "test-production-css";
  style.textContent = fs
    .readFileSync("src/app.css", "utf8")
    .replace(/@import[^;]+;/g, "");
  document.head.append(style);
  const api = (window as any).happyDOM;
  const priorWidth = window.innerWidth,
    priorHeight = window.innerHeight;
  api.setWindowSize({ width: 390, height: 844 });
  try {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen
        .getByRole("button", { name: "Open navigation" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    go("Machine performance");
    expect(
      screen
        .getByRole("button", { name: "Open navigation" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      getComputedStyle(document.querySelector(".machine-workspace")!)
        .gridTemplateColumns,
    ).toBe("1fr");
    expect(
      parseInt(
        getComputedStyle(
          screen.getByRole("button", { name: "Zoom in floor map" }),
        ).width,
      ),
    ).toBe(34);
    fireEvent.click(
      screen.getByRole("button", { name: "Help and learning center" }),
    );
    expect(
      screen.getByRole("heading", { name: "Help & learning center", level: 1 }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Return to previous analysis" }),
    );
    expect(
      screen.getByRole("heading", { name: "Machine performance", level: 1 }),
    ).toBeTruthy();
  } finally {
    api.setWindowSize({ width: priorWidth, height: priorHeight });
  }
});
