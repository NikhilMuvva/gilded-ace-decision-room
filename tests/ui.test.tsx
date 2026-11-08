import React from "react";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import fs from "node:fs";
import { App } from "../src/main";
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
beforeEach(() => {
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
  localStorage.clear();
  // Isolate custom-plan editing from the separately tested recommended portfolio.
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
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function open() {
  render(<App />);
  await screen.findByRole(
    "heading",
    { name: "Executive briefing", level: 1 },
    { timeout: 15000 },
  );
}
test("all eight analytical sections mount with computed evidence", async () => {
  await open();
  const routes = [
    ["Machine performance", "Casino floor"],
    ["Demand & location", "Floor demand by zone"],
    ["Availability & repairs", "Unavailable machine-hours by day"],
    ["Tracked guest outcomes", "Wager concentration"],
    ["Loyalty costs", "Monthly loyalty cost and menu value"],
    ["Investment planner", "Your 30-day plan"],
    ["Methods & evidence", "Demand forecast and model validation"],
  ];
  for (const [nav, heading] of routes) {
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(nav.replace("&", "&")) }),
    );
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  }
});
test("period, zone and bank filters recompute and reset", async () => {
  await open();
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-06" },
  });
  expect(screen.getByText("$39.7M")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Zone" }), {
    target: { value: "Z-B40" },
  });
  expect(
    screen.getByRole("combobox", { name: "Bank" }).querySelectorAll("option")
      .length,
  ).toBeLessThan(20);
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByText("$248.9M")).toBeTruthy();
});
test("machine search and dossier use selected real machine", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: /Machine performance/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: "M-1158" },
  });
  fireEvent.click(screen.getByRole("button", { name: "M-1158", exact: true }));
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
  expect(screen.getByText(/Inspection is justified/)).toBeTruthy();
});
test("guest group filters change the cohort", async () => {
  await open();
  fireEvent.click(
    screen.getByRole("button", { name: /Tracked guest outcomes/ }),
  );
  const select = screen.getByLabelText("Guest group");
  const option = select.querySelectorAll("option")[1] as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
  expect(
    screen.getByText(option.text, { selector: ".panel-head .panel-subtitle" }),
  ).toBeTruthy();
});
test("planner exposes comp conflicts, effect assumptions and preserves edits on navigation", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: /Investment planner/ }));
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add Comp policy pilot with control group",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add Change comp redemption rate floor-wide",
    }),
  );
  expect(screen.getByRole("alert").textContent).toContain("cannot be combined");
  expect(
    (screen.getByLabelText("Points per comp dollar") as HTMLInputElement).value,
  ).toBe("10");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Remove Change comp redemption rate floor-wide",
    }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Compare configured subsets" }),
  );
  expect(screen.getByRole("status").textContent).toContain("Preserving cash");
  fireEvent.click(screen.getByRole("button", { name: /Methods & evidence/ }));
  fireEvent.click(screen.getByRole("button", { name: /Investment planner/ }));
  expect(
    screen.getByRole("button", {
      name: "Remove Comp policy pilot with control group",
    }),
  ).toBeTruthy();
});
test("loading failure shows useful recovery state", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false })),
  );
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Analysis unavailable" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});
