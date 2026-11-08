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
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
const analysis = JSON.parse(
  fs.readFileSync("public/data/decision.json", "utf8"),
);
const diagnostic = JSON.parse(
  fs.readFileSync("public/data/diagnostics.json", "utf8"),
);
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const height = this.classList.contains("recharts-legend-wrapper")
        ? 24
        : 300;
      return {
        width: 800,
        height,
        top: 0,
        left: 0,
        right: 800,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === "/api/chat"
        ? { ok: false, status: 503 }
        : {
            ok: true,
            json: async () =>
              url.includes("/decision.json")
                ? analysis
                : url.includes("/diagnostics.json")
                  ? diagnostic
                  : data,
          },
    ),
  );
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
    { level: 1, name: "Executive briefing" },
    { timeout: 15000 },
  );
}
const go = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("button", { name, exact: true }),
  );
test("executive recommendation and Opportunity Register expose broader evidence and trace controls", async () => {
  await start();
  expect(screen.getByText(/Model-selected financial investment/).textContent).toContain(
    "$0",
  );
  expect(screen.getByText(/Model-selected financial investment/).textContent).toContain("$100,000");
  expect(screen.getByText("Manufacturer reliability")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-06" },
  });
  go("Opportunities");
  expect(
    screen.getByRole("heading", { name: "Opportunity Register" }),
  ).toBeTruthy();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search opportunities" }),
    { target: { value: "loyalty" } },
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Point-price change warrants a controlled policy test",
    }),
  );
  expect(
    screen.getByRole("heading", {
      name: "Point-price change warrants a controlled policy test",
    }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Open full-window evidence" }),
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Loyalty costs" }),
  ).toBeTruthy();
  expect(
    (screen.getByRole("combobox", { name: "Start month" }) as HTMLSelectElement)
      .value,
  ).toBe("2025-01");
});
test("machine dimensions follow the selected period instead of leaking six-month flags into June", async () => {
  await start();
  go("Machine performance");
  const search = screen.getByRole("textbox", { name: "Search machines" });
  fireEvent.change(search, { target: { value: "M-1158" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await screen.findByText("Diagnostic dimensions · selected scope");
  const section = screen
    .getByText("Diagnostic dimensions · selected scope")
    .closest("details")!;
  expect(within(section).getByText("Unusual payout behavior")).toBeTruthy();
  expect(
    within(section).getByText("Theo less recorded supplied costs"),
  ).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-06" },
  });
  await waitFor(() =>
    expect(within(section).queryByText("Unusual payout behavior")).toBeNull(),
  );
  expect(within(section).getByText("Insufficient evidence")).toBeTruthy();
  expect(
    within(section).getByText("Possible location opportunity"),
  ).toBeTruthy();
});
test("all required portfolio comparators are feasible, risk cap changes learning policy and adoption is explicit", async () => {
  await start();
  go("Investment planner");
  const panel = screen
    .getByRole("heading", { name: "Compare feasible investment portfolios" })
    .closest(".panel")!;
  for (const name of [
    "Conservative inspection only",
    "Targeted loyalty pilot",
    "Operational recovery comparison",
    "Location/demand trial",
    "Replace ten low-earning active machines (lease)",
    "Preserve budget",
    "Primary financial recommendation",
    "Downside-constrained financial recommendation",
    "Experimental learning portfolio",
  ])
    expect(
      within(panel).getByRole("button", { name, exact: true }),
    ).toBeTruthy();
  const original = localStorage.getItem("gilded-ace-plan-v1");
  fireEvent.change(
    within(panel).getByRole("spinbutton", { name: "Financial downside cap" }),
    { target: { value: "0" } },
  );
  expect(localStorage.getItem("gilded-ace-plan-v1")).toBe(original);
  expect(
    within(panel).getByText(
      "No paid actions; $100,000 retained and quantified incremental net is $0.",
    ),
  ).toBeTruthy();
  fireEvent.change(
    within(panel).getByRole("spinbutton", { name: "Financial downside cap" }),
    { target: { value: "20000" } },
  );
  fireEvent.click(within(panel).getByRole("button", { name: "Experimental learning portfolio", exact: true }));
  fireEvent.click(
    within(panel).getByRole("button", {
      name: "Load this portfolio with base assumptions",
    }),
  );
  const saved = JSON.parse(localStorage.getItem("gilded-ace-plan-v1")!);
  expect(saved.length).toBe(3);
  expect(saved.find((e: any) => e.id === "A-INSPECT").targets).toEqual([
    "M-1158",
    "M-1241",
  ]);
  expect(saved.find((e: any) => e.id === "A-WAYFINDING").effect).toBe(1.5);
  const summary = document.querySelector(".planner-summary")!;
  expect(summary.textContent).toContain("$13,900");
  expect(summary.textContent).toContain("$86,100");
  expect(summary.textContent).toContain("-$10,023");
});
test("portfolio comparisons disclose recurring, lead and schedule assumptions for replacements and bank swaps", async () => {
  await start();
  go("Investment planner");
  const panel = screen
    .getByRole("heading", { name: "Compare feasible investment portfolios" })
    .closest(".panel")!;
  fireEvent.click(
    within(panel).getByRole("button", {
      name: "Replace ten low-earning active machines (lease)",
    }),
  );
  expect(within(panel).getByText("$25,000 / $8,800")).toBeTruthy();
  expect(within(panel).getByText("14 / 16 days")).toBeTruthy();
  expect(within(panel).getAllByText(/Ten purchases cost/).length).toBe(1);
});
test("Help return retains the new opportunity and downside-policy selections", async () => {
  await start();
  go("Opportunities");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Point-price change warrants a controlled policy test",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Help and learning center" }),
  );
  fireEvent.click(
    screen.getAllByRole("button", {
      name: "Return to Opportunities",
      exact: true,
    })[0],
  );
  expect(
    screen.getByRole("heading", {
      name: "Point-price change warrants a controlled policy test",
    }),
  ).toBeTruthy();
  go("Investment planner");
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Financial downside cap" }),
    { target: { value: "5000" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Help and learning center" }),
  );
  fireEvent.click(
    screen.getAllByRole("button", {
      name: "Return to Investment planner",
      exact: true,
    })[0],
  );
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Financial downside cap",
      }) as HTMLInputElement
    ).value,
  ).toBe("5000");
});
test("Methods retains the original forecast and shows independent checks and benchmark disagreement", async () => {
  await start();
  go("Methods & evidence");
  expect(
    screen.getByRole("heading", {
      name: "Demand forecast and model validation",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Comprehensive scientific audit and decision engine",
    }),
  ).toBeTruthy();
  expect(screen.getByText(/0.337/)).toBeTruthy();
  fireEvent.click(
    screen.getByText(
      "Additional rolling-origin and nested calendar-model evaluation",
    ),
  );
  expect(screen.getByText("ridgeCalendar")).toBeTruthy();
  expect(
    screen
      .getAllByRole("link", { name: "Scientific report ↗" })[0]
      .getAttribute("href"),
  ).toBe("/docs/COMPREHENSIVE_SCIENTIFIC_REPORT.md");
});
test("copilot retrieves the deterministic new recommendation without altering budget entries", async () => {
  await start();
  fireEvent.click(
    screen.getByRole("button", { name: "Ask about this data", exact: true }),
  );
  const text = screen.getByRole("textbox", { name: "Ask about this data" });
  fireEvent.change(text, {
    target: { value: "Compare the recommended portfolio" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask", exact: true }));
  await screen.findByText("Offline evidence · live AI unavailable");
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getAllByText("$0.00").length).toBeGreaterThan(0);
  expect(within(dialog).getByText("$100,000.00")).toBeTruthy();
  expect(
    screen.getByRole("heading", { level: 1, name: "Executive briefing" }),
  ).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Open analysis" }),
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Investment planner" }),
  ).toBeTruthy();
});

test("saved custom work is labeled and preserved until financial recommendation is explicitly loaded", async () => {
  const saved = [{ id: "A-INSPECT", quantity: 1, targets: ["M-1241"], effect: 0, extraCost: 0, destinations: [] }];
  localStorage.setItem("gilded-ace-plan-v1", JSON.stringify(saved));
  await start();
  go("Investment planner");
  expect(screen.getByText(/User-configured saved plan/)).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("gilded-ace-plan-v1")!)).toEqual(saved);
  const primary = screen.getByRole("button", { name: "Primary financial recommendation", exact: true }).closest("tr")!;
  expect(Array.from(primary.querySelectorAll("td")).slice(1).map((c) => c.textContent)).toEqual(["$0", "$100,000", "$0", "$0", "$0"]);
  const backup = screen.getByRole("button", { name: "Experimental learning portfolio", exact: true }).closest("tr")!;
  expect(Array.from(backup.querySelectorAll("td")).slice(1).map((c) => c.textContent)).toEqual(["$13,900", "$86,100", "-$19,090", "-$10,023", "$1,634"]);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Financial downside cap" }), { target: { value: "0" } });
  fireEvent.click(within(backup).getByRole("button"));
  expect(JSON.parse(localStorage.getItem("gilded-ace-plan-v1")!)).toEqual(saved);
  expect(within(backup).getByText("$13,900")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Load model-selected financial recommendation", exact: true }));
  expect(JSON.parse(localStorage.getItem("gilded-ace-plan-v1")!)).toEqual([]);
  expect(document.querySelector(".planner-summary")!.textContent).toContain("$100,000");
  expect(screen.getByText("July monitoring and spending approval triggers")).toBeTruthy();
});
