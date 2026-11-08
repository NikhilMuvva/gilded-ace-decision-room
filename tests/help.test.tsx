import React from "react";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import fs from "node:fs";
import { App } from "../src/main";
import { glossary, helpTopics } from "../src/helpContent";
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
beforeEach(() => {
  localStorage.clear();
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
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 300,
    top: 0,
    left: 0,
    bottom: 300,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function start() {
  render(<App />);
  await screen.findByRole(
    "heading",
    { name: "Executive briefing", level: 1 },
    { timeout: 15000 },
  );
}
const openHelp = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Help and learning center" }),
  );
const back = (name: string) =>
  fireEvent.click(
    screen.getAllByRole("button", {
      name: `Return to ${name}`,
      exact: true,
    })[0],
  );
const go = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("button", { name: new RegExp(name) }),
  );

test("the header return restores the prior scroll position and focuses the analysis heading", async () => {
  await start();
  go("Demand & location");
  const prior = Object.getOwnPropertyDescriptor(window, "scrollY");
  try {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 420,
    });
    openHelp();
    fireEvent.click(
      screen.getByRole("button", { name: "Return to previous analysis" }),
    );
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 420,
        behavior: "auto",
      });
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Demand & location", level: 1 }),
      );
    });
  } finally {
    if (prior) Object.defineProperty(window, "scrollY", prior);
    else Reflect.deleteProperty(window, "scrollY");
  }
});

test("header Help opens from every major page, stays separate from Methods and returns to its origin", async () => {
  await start();
  for (const name of [
    "Executive briefing",
    "Machine performance",
    "Demand & location",
    "Availability & repairs",
    "Tracked guest outcomes",
    "Loyalty costs",
    "Investment planner",
    "Methods & evidence",
  ]) {
    go(name);
    openHelp();
    expect(
      screen.getByRole("heading", { name: "Help & learning center", level: 1 }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "Demand forecast and model validation",
      }),
    ).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Start month" })).toBeNull();
    back(name);
    expect(screen.getByRole("heading", { name, level: 1 })).toBeTruthy();
  }
});
test("Help return retains months, zone, bank, search, sort, machine selection and map viewport", async () => {
  await start();
  go("Machine performance");
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-05" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Zone" }), {
    target: { value: "Z-B40" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Bank" }), {
    target: { value: "B-31" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: "M-1158" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Sort machines" }), {
    target: { value: "index" },
  });
  fireEvent.click(screen.getByRole("button", { name: "M-1158", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in floor map" }));
  const before = screen
    .getByRole("group", { name: "Interactive casino floor map" })
    .getAttribute("viewBox");
  openHelp();
  back("Machine performance");
  expect(
    (screen.getByRole("combobox", { name: "Start month" }) as HTMLSelectElement)
      .value,
  ).toBe("2025-05");
  expect(
    (screen.getByRole("combobox", { name: "Zone" }) as HTMLSelectElement).value,
  ).toBe("Z-B40");
  expect(
    (screen.getByRole("combobox", { name: "Bank" }) as HTMLSelectElement).value,
  ).toBe("B-31");
  expect(
    (
      screen.getByRole("combobox", {
        name: "Sort machines",
      }) as HTMLSelectElement
    ).value,
  ).toBe("index");
  expect(
    (
      screen.getByRole("textbox", {
        name: "Search machines",
      }) as HTMLInputElement
    ).value,
  ).toBe("M-1158");
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
  expect(
    screen
      .getByRole("group", { name: "Interactive casino floor map" })
      .getAttribute("viewBox"),
  ).toBe(before);
});
test("guest group and months survive Help and inapplicable floor filters are hidden", async () => {
  await start();
  go("Tracked guest outcomes");
  expect(screen.queryByRole("combobox", { name: "Zone" })).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-03" },
  });
  fireEvent.change(screen.getByLabelText("Guest group"), {
    target: { value: "home_region|Local" },
  });
  openHelp();
  back("Tracked guest outcomes");
  expect(
    (screen.getByLabelText("Guest group") as HTMLSelectElement).value,
  ).toBe("home_region|Local");
  expect(
    (screen.getByRole("combobox", { name: "Start month" }) as HTMLSelectElement)
      .value,
  ).toBe("2025-03");
  go("Loyalty costs");
  expect(screen.queryByRole("combobox", { name: "Bank" })).toBeNull();
  go("Investment planner");
  expect(screen.queryByRole("combobox", { name: "Start month" })).toBeNull();
  go("Methods & evidence");
  expect(screen.queryByRole("combobox", { name: "Zone" })).toBeNull();
});
test("contextual explanations open their Help topic and Escape closes them with focus restored", async () => {
  await start();
  const trigger = screen.getByRole("button", {
    name: "Explain Expected house win",
  });
  fireEvent.click(trigger);
  expect(screen.getByRole("note").textContent).toContain(
    "configured game edge",
  );
  fireEvent.keyDown(screen.getByRole("note"), { key: "Escape" });
  expect(screen.queryByRole("note")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Learn with examples" }));
  expect(
    screen.getByRole("heading", {
      name: "Understand the numbers, one idea at a time",
    }),
  ).toBeTruthy();
  expect(document.activeElement?.id).toBe("learn-metrics");
  back("Executive briefing");
  expect(screen.getByText("$248.9M")).toBeTruthy();
});
test("glossary searches aliases, handles no results and clears; all ten topics are reachable", async () => {
  await start();
  openHelp();
  const search = screen.getByRole("searchbox", { name: "Search glossary" });
  fireEvent.change(search, { target: { value: "q-value" } });
  expect(
    screen.getByText("Adjusted p-value / q", { selector: "dt" }),
  ).toBeTruthy();
  expect(
    screen.queryByText("Game payout", { selector: ".glossary-results dt" }),
  ).toBeNull();
  fireEvent.change(search, { target: { value: "zz-no-such-term" } });
  expect(
    screen.getByRole("heading", { name: "No matching term yet." }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Clear glossary search" }),
  );
  expect((search as HTMLInputElement).value).toBe("");
  const nav = screen.getByRole("navigation", { name: "Help topics" });
  for (const t of helpTopics) {
    const button = within(nav).getByRole("button", { name: t.name });
    fireEvent.click(button);
    expect(button.getAttribute("aria-current")).toBe("location");
    expect(document.activeElement?.id).toBe("learn-" + t.id);
  }
  expect(glossary.length).toBeGreaterThan(65);
  expect(new Set(glossary.map((t) => t.id)).size).toBe(glossary.length);
});
test("learning examples recompute without changing actual analysis", async () => {
  await start();
  openHelp();
  const wagers = screen.getByLabelText("Total wagers ($)"),
    payout = screen.getByLabelText("Game payouts ($)");
  fireEvent.change(wagers, { target: { value: "1000" } });
  fireEvent.change(payout, { target: { value: "900" } });
  const example = screen
    .getByRole("heading", { name: "The same play, two sides of the ledger" })
    .closest(".learning-example")!;
  expect(within(example as HTMLElement).getByText("$100.00")).toBeTruthy();
  expect(within(example as HTMLElement).getByText("-$100.00")).toBeTruthy();
  expect(within(example as HTMLElement).getByText("10.0%")).toBeTruthy();
  fireEvent.change(wagers, { target: { value: "0" } });
  expect(screen.getByText("Undefined: no wagers")).toBeTruthy();
  fireEvent.change(
    screen.getByRole("slider", { name: "Learning available hours" }),
    { target: { value: "12" } },
  );
  const hours = screen
    .getByRole("heading", { name: "Being open is different from being busy" })
    .closest(".learning-example")!;
  expect(within(hours as HTMLElement).getByText("50.0%")).toBeTruthy();
  fireEvent.change(screen.getByRole("slider", { name: "Learning lead days" }), {
    target: { value: "30" },
  });
  expect(screen.getByText("Unavailable: no benefit days")).toBeTruthy();
  back("Executive briefing");
  expect(screen.getByText("$248.9M")).toBeTruthy();
});
test("planner targets, quantities and effects survive a Help round trip", async () => {
  await start();
  go("Investment planner");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add Wayfinding and signage refresh for a zone",
    }),
  );
  const effect = screen.getByRole("slider", {
    name: "Wayfinding and signage refresh for a zone assumed effect",
  });
  fireEvent.change(effect, { target: { value: "7" } });
  const target = screen.getByRole("combobox", {
    name: "Wayfinding and signage refresh for a zone target 1",
  });
  fireEvent.change(target, { target: { value: "Z-B40" } });
  openHelp();
  back("Investment planner");
  expect(
    (
      screen.getByRole("slider", {
        name: "Wayfinding and signage refresh for a zone assumed effect",
      }) as HTMLInputElement
    ).value,
  ).toBe("7");
  expect(
    (
      screen.getByRole("combobox", {
        name: "Wayfinding and signage refresh for a zone target 1",
      }) as HTMLSelectElement
    ).value,
  ).toBe("Z-B40");
});
test("floor zoom, keyboard pan, fit and machine selection work; wheel zooms inside the map", async () => {
  await start();
  go("Machine performance");
  const map = screen.getByRole("group", {
      name: "Interactive casino floor map",
    }),
    original = map.getAttribute("viewBox");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in floor map" }));
  expect(map.getAttribute("viewBox")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Zoom out floor map" }));
  expect(map.getAttribute("viewBox")).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Zoom in floor map" }));
  const zoomed = map.getAttribute("viewBox");
  fireEvent.keyDown(map, { key: "ArrowRight" });
  expect(map.getAttribute("viewBox")).not.toBe(zoomed);
  fireEvent.keyDown(map, { key: "Home" });
  expect(map.getAttribute("viewBox")).toBe(original);
  fireEvent.keyDown(map, { key: "+" });
  expect(map.getAttribute("viewBox")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  expect(map.getAttribute("viewBox")).toBe(original);
  fireEvent.wheel(map, { deltaY: -100, ctrlKey: false });
  expect(map.getAttribute("viewBox")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  // happy-dom's WheelEvent omits MouseEvent modifier keys; supply the real-browser property explicitly.
  const zoomEvent = new WheelEvent("wheel", {
    deltaY: -100,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(zoomEvent, "ctrlKey", { value: true });
  fireEvent(map, zoomEvent);
  await waitFor(() => expect(map.getAttribute("viewBox")).not.toBe(original));
  const m = screen.getByRole("button", {
    name: /M-1158, Back Forty, bank B-31/,
  });
  fireEvent.keyDown(m, { key: "Enter" });
  expect(m.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
});
test("map pointer drag and touch pinch change its viewport and fit restores it", async () => {
  await start();
  go("Machine performance");
  const map = screen.getByRole("group", {
      name: "Interactive casino floor map",
    }),
    original = map.getAttribute("viewBox");
  fireEvent.pointerDown(map, {
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    pointerType: "mouse",
  });
  fireEvent.pointerMove(map, {
    pointerId: 1,
    clientX: 40,
    clientY: 20,
    pointerType: "mouse",
  });
  fireEvent.pointerUp(map, { pointerId: 1 });
  expect(map.getAttribute("viewBox")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  fireEvent.pointerDown(map, {
    pointerId: 2,
    clientX: 10,
    clientY: 10,
    pointerType: "touch",
  });
  fireEvent.pointerDown(map, {
    pointerId: 3,
    clientX: 30,
    clientY: 10,
    pointerType: "touch",
  });
  fireEvent.pointerMove(map, {
    pointerId: 3,
    clientX: 50,
    clientY: 10,
    pointerType: "touch",
  });
  fireEvent.pointerMove(map, {
    pointerId: 3,
    clientX: 70,
    clientY: 10,
    pointerType: "touch",
  });
  fireEvent.pointerUp(map, { pointerId: 2 });
  fireEvent.pointerUp(map, { pointerId: 3 });
  expect(map.getAttribute("viewBox")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Fit floor" }));
  expect(map.getAttribute("viewBox")).toBe(original);
});
test("briefing leads to the flagged machine and an investigation leads to the single planner", async () => {
  await start();
  fireEvent.click(
    screen.getByRole("button", { name: /Review M-1158 · Jan–Jun/ }),
  );
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Evaluate action",
    }),
  );
  expect(screen.getByText("From Machine performance")).toBeTruthy();
  expect(
    screen.getAllByRole("heading", { name: "Your 30-day plan" }),
  ).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Return to the investigation" }),
  );
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
});
