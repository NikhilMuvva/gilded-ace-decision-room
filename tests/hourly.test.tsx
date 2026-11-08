import React from "react";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import fs from "node:fs";
import { App } from "../src/main";
const data = JSON.parse(fs.readFileSync("public/data/dashboard.json", "utf8"));
const audit = JSON.parse(fs.readFileSync("public/data/diagnostics.json", "utf8"));
const decision = JSON.parse(fs.readFileSync("public/data/decision.json", "utf8"));
let available = true;
const fixture = (filters: any) => ({ mode: "database", source: "TimescaleDB", environment: "local-validation", service: "UI fixture", importedRows: 1321908,
  queryRelation: filters.groupBy === "machine" ? "raw hypertable" : "continuous aggregate", queryElapsedMs: 12, queriedAt: "2026-11-08T12:00:00Z", filters,
  rows: (filters.groupBy === "machine" ? filters.machineIds : ["Z-B40", "Z-BAR"]).flatMap((entity: string) => [false, true].flatMap((weekend) => Array.from({ length: 24 }, (_, hour) => ({
    entity, hour, weekend, records: 10, availableHours: 10, occupiedHours: hour < 6 ? 1 : 7, coinInUsd: 100, payoutUsd: 90, theoUsd: hour < 6 ? 10 : 80, utilization: hour < 6 ? .1 : .7, theoPerAvailableHour: hour < 6 ? 1 : 8, downtimeHours: 0 })))) });
beforeEach(() => {
  available = true; localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 300, top: 0, left: 0, right: 800, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: any) => {
    if (url === "/api/hourly") return { ok: available, status: available ? 200 : 503, json: async () => available ? fixture(JSON.parse(options.body)) : { error: "Historical hourly service is unavailable. Please retry later." } };
    return { ok: true, json: async () => url.includes("diagnostics") ? audit : url.includes("decision.json") ? decision : data };
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const go = (name: string) => fireEvent.click(within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("button", { name, exact: true }));
async function start() { render(<App />); await screen.findByRole("heading", { name: "Executive briefing", level: 1 }, { timeout: 15000 }); go("Hourly operations"); }

test("hourly query supports machine comparison, metrics and maintenance evidence without changing the portfolio", async () => {
  await start(); await screen.findByRole("heading", { name: "Historical hour-of-day heatmap" });
  expect(screen.getByText(/1,321,908 verified imported records/).textContent).toContain("local-validation");
  fireEvent.change(screen.getByRole("combobox", { name: "Hourly grouping" }), { target: { value: "machine" } });
  expect(screen.getByRole("status").textContent).toContain("Filters changed");
  expect(screen.queryByRole("heading", { name: "Historical hour-of-day heatmap" })).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Hourly machine 1" }), { target: { value: "M-1158" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Hourly machine 2" }), { target: { value: "M-1241" } });
  fireEvent.click(screen.getByRole("button", { name: "Query Tiger Data" }));
  await screen.findByRole("heading", { name: "Historical hour-of-day heatmap" });
  expect(screen.getByRole("combobox", { name: "Hourly comparison 1" }).textContent).toContain("M-1158");
  fireEvent.change(screen.getByRole("combobox", { name: "Hourly metric" }), { target: { value: "theoPerAvailableHour" } });
  fireEvent.click(screen.getByRole("button", { name: /M-1158 1:00/ }));
  expect((screen.getByRole("combobox", { name: "Maintenance start hour" }) as HTMLSelectElement).value).toBe("1");
  expect(screen.getByText(/estimated theo opportunity debit/).textContent).toContain("$2.00");
  fireEvent.click(screen.getByRole("button", { name: "Open action planner" }));
  await screen.findByRole("heading", { name: "Investment planner", level: 1 });
  const primary = (await screen.findByRole("button", { name: "Primary financial recommendation", exact: true })).closest("tr")!;
  expect(Array.from(primary.querySelectorAll("td")).slice(1).map((c) => c.textContent)).toEqual(["$0", "$100,000", "$0", "$0", "$0"]);
});

test("Help return preserves hourly filters and query; unavailable service leaves core investigations accessible", async () => {
  await start(); await screen.findByRole("heading", { name: "Historical hour-of-day heatmap" });
  fireEvent.change(screen.getByRole("combobox", { name: "Hourly metric" }), { target: { value: "theoPerAvailableHour" } });
  const calls = (fetch as any).mock.calls.filter((c: any) => c[0] === "/api/hourly").length;
  fireEvent.click(screen.getByRole("button", { name: "Help and learning center" }));
  fireEvent.click(screen.getByRole("button", { name: "Return to previous analysis" }));
  await screen.findByRole("heading", { name: "Historical hour-of-day heatmap" });
  expect((screen.getByRole("combobox", { name: "Hourly metric" }) as HTMLSelectElement).value).toBe("theoPerAvailableHour");
  expect((fetch as any).mock.calls.filter((c: any) => c[0] === "/api/hourly").length).toBe(calls);
  available = false; fireEvent.click(screen.getByRole("button", { name: "Query Tiger Data" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tiger Data unavailable"));
  expect(screen.queryByRole("heading", { name: "Historical hour-of-day heatmap" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open the existing availability investigation" }));
  await screen.findByRole("heading", { name: "Availability & repairs", level: 1 });
});
