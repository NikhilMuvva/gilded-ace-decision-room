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
import { offlineEvidence } from "../src/investigation.mjs";
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
const audit = JSON.parse(
  fs.readFileSync("public/data/diagnostics.json", "utf8"),
);
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
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 300,
    top: 0,
    left: 0,
    right: 800,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/chat") return { ok: false, status: 503 };
      return {
        ok: true,
        json: async () => (url.includes("diagnostics") ? audit : data),
      };
    }),
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
const open = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Ask about this data", exact: true }),
  );
test("optional copilot opens on every major page, closes by Escape and retains analysis", async () => {
  await start();
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-06" },
  });
  for (const page of [
    "Machine performance",
    "Demand & location",
    "Availability & repairs",
    "Tracked guest outcomes",
    "Loyalty costs",
    "Investment planner",
    "Methods & evidence",
  ]) {
    go(page);
    open();
    expect(
      screen.getByRole("dialog", { name: "Investigation copilot" }),
    ).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  }
  go("Machine performance");
  expect(
    (screen.getByRole("combobox", { name: "Start month" }) as HTMLSelectElement)
      .value,
  ).toBe("2025-06");
});
test("offline questions return exact evidence with links and navigation waits for a click", async () => {
  await start();
  open();
  fireEvent.click(
    screen.getByRole("button", { name: /Why is M-1158 flagged/ }),
  );
  await screen.findByText("Offline evidence · live AI unavailable");
  expect(
    screen.getByRole("heading", { level: 1, name: "Executive briefing" }),
  ).toBeTruthy();
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog)
      .getAllByRole("link", { name: /Calculation and evidence/ })[0]
      .getAttribute("href"),
  ).toBe("/docs/CLAIMS_AND_EVIDENCE.md");
  expect(within(dialog).getAllByText("$15,796.25").length).toBeGreaterThan(0);
  fireEvent.click(
    within(dialog).getAllByRole("button", { name: "Open analysis" })[0],
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Machine performance" }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: /M-1158 ·/ })).toBeTruthy();
});
test("stale filters invalidate old answer navigation and re-asking uses new context", async () => {
  await start();
  open();
  fireEvent.click(screen.getByRole("button", { name: /Which quieter days/ }));
  await screen.findByText("Offline evidence · live AI unavailable");
  fireEvent.change(screen.getByRole("combobox", { name: "Start month" }), {
    target: { value: "2025-06" },
  });
  expect(screen.getByRole("alert").textContent).toMatch(
    /selections have changed/,
  );
  expect(
    (
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Open analysis",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Ask",
      exact: true,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText(/Analysis selections have changed/)).toBeNull(),
  );
});
test("hallucinated IDs and unsupported causality have safe responses", async () => {
  await start();
  open();
  const field = screen.getByRole("textbox", { name: "Ask about this data" });
  fireEvent.change(field, { target: { value: "Explain M-9999" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask", exact: true }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toMatch(/Unknown machine/);
  expect(
    (fetch as any).mock.calls.filter((c: any) => c[0] === "/api/chat").length,
  ).toBe(0);
  fireEvent.change(field, {
    target: { value: "Prove this action will guarantee profit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask", exact: true }));
  await screen.findByRole("heading", {
    name: "What the data cannot establish",
  });
});
test("latest configured plan is included without allowing chat to change entries", async () => {
  await start();
  go("Investment planner");
  const q = screen.getByRole("spinbutton", {
    name: "Machine inspection and paytable verification quantity",
  });
  fireEvent.change(q, { target: { value: "2" } });
  const before = localStorage.getItem("gilded-ace-plan-v1");
  open();
  fireEvent.click(
    screen.getByRole("button", { name: /assumptions behind this/ }),
  );
  await screen.findByText("Offline evidence · live AI unavailable");
  const call = (fetch as any).mock.calls.find((c: any) => c[0] === "/api/chat");
  expect(JSON.parse(call[1].body).context.plan[0].quantity).toBe(2);
  expect(
    within(screen.getByRole("dialog")).getByText("$2,400.00"),
  ).toBeTruthy();
  expect(localStorage.getItem("gilded-ace-plan-v1")).toBe(before);
});
test("live responses are labeled and mismatched server context becomes offline", async () => {
  await start();
  (fetch as any).mockImplementation(async (url: string, init: any) => {
    if (url !== "/api/chat") return { ok: true, json: async () => data };
    const body = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        mode: "live",
        reason: "Gemini selected verified evidence.",
        context: body.context,
        cards: offlineEvidence(data, body.context, body.question),
      }),
    };
  });
  open();
  fireEvent.click(screen.getByRole("button", { name: /Which quieter days/ }));
  await screen.findByText("Live Gemini · verified evidence");
  (fetch as any).mockImplementation(async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        mode: "live",
        context: { ...body.context, start: "2025-06" },
        cards: [],
      }),
    };
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask", exact: true }));
  await screen.findByText("Offline evidence · live AI unavailable");
});
test("independent diagnostics are accessible in Methods without replacing frozen model", async () => {
  await start();
  go("Methods & evidence");
  await screen.findByRole("heading", {
    name: "Robustness and calibration diagnostics",
  });
  expect(
    screen.getByRole("heading", {
      name: "Demand forecast and model validation",
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Peer support and payout qualifications"));
  expect(screen.getByText(/do not individually survive/)).toBeTruthy();
  go("Machine performance");
  fireEvent.change(screen.getByRole("textbox", { name: "Search machines" }), {
    target: { value: "M-1158" },
  });
  fireEvent.click(screen.getByRole("button", { name: "M-1158", exact: true }));
  expect(screen.getByText("Peer rank · low to high")).toBeTruthy();
  expect(screen.queryByText(/below 0.80× peers/)).toBeNull();
});
