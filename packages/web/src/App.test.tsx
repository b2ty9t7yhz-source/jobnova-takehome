import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { advanceDemoApplication, createDemoApplication } from "./demo-workflow";

describe("JobNova recommendations", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => vi.restoreAllMocks());

  it("searches recommendations and opens an explainable detail view", async () => {
    const user = userEvent.setup();
    render(<App />);

    const search = screen.getByRole("searchbox", { name: "Search recommended jobs" });
    await user.type(search, "research software");

    const openJob = await screen.findByRole("button", { name: "View Research Software Engineer" });
    expect(screen.queryByText("Web Application Developer")).not.toBeInTheDocument();

    await user.click(openJob);

    expect(screen.getByRole("heading", { level: 1, name: "Research Software Engineer" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Why is this a good fit for you?" })).toBeVisible();
    expect(screen.getByText(/weighted from skills 40%/i)).toBeVisible();

    await user.click(screen.getByText("Recommendation receipt"));
    expect(screen.getByText("jinhan-demo-profile-v1")).toBeVisible();
    expect(screen.getByText("deterministic-weighted-v1")).toBeVisible();
    expect(screen.getByText("Mathematics + Computer Science")).toBeVisible();
  });

  it("shows only the candidate's saved shortlist", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Show saved jobs" }));
    expect(await screen.findByText("Software Engineer, Network Infrastructure")).toBeVisible();
  });

  it("opens a local safety review without offering real submission", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "View Research Software Engineer" }));
    await user.click(screen.getByRole("button", { name: /Review application/i }));

    expect(screen.getByRole("dialog", { name: "Review-before-submit workflow" })).toBeVisible();
    expect(screen.getByText("Submission is disabled in this demo.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("runs the backend-driven safe demo through verification and final review", async () => {
    const user = userEvent.setup();
    let application = createDemoApplication({
      id: "00000000-0000-4000-8000-000000000004",
      jobId: "research-software-engineer",
      role: "Research Software Engineer",
      company: "Lattice Lab",
      now: "2026-08-23T20:00:00.000Z",
      expiresAt: "2026-08-24T20:00:00.000Z",
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/advance")) {
        application = advanceDemoApplication(application, "2026-08-23T20:00:01.000Z");
      }
      return Response.json({ application }, { status: 200 });
    });

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "View Research Software Engineer" }));
    await user.click(screen.getByRole("button", { name: /Review application/i }));

    await user.click(screen.getByRole("button", { name: "Start safe demo" }));
    expect(await screen.findByText("Pending")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Begin profile check" }));
    expect(await screen.findByText("In progress")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue to verification gate" }));
    expect(await screen.findByText("Manual action required")).toBeVisible();
    expect(screen.getByText(/does not solve a CAPTCHA/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Acknowledge simulated verification" }));
    expect(await screen.findByText("Final review reached")).toBeVisible();
    expect(screen.getByText(/Submit requests:/)).toHaveTextContent("Submit requests: 0");
  });

  it("traps keyboard focus in the review dialog and restores it when closed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "View Research Software Engineer" }));
    const reviewButton = screen.getByRole("button", { name: /Review application/i });
    await user.click(reviewButton);

    const closeButton = screen.getByRole("button", { name: "Close application preview" });
    expect(closeButton).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Start safe demo" })).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(reviewButton).toHaveFocus();
  });

  it("focuses search with the documented keyboard shortcut", async () => {
    render(<App />);
    const search = screen.getByRole("searchbox", { name: "Search recommended jobs" });

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    await waitFor(() => expect(search).toHaveFocus());
  });

  it("returns from a detail view when the mobile Saved destination is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "View Research Software Engineer" }));
    expect(window.location.hash).toBe("#job=research-software-engineer");

    await user.click(
      within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("button", {
        name: /Saved/i,
      }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "Recommended jobs" })).toBeVisible();
    expect(window.location.hash).toBe("");
  });

  it("supports refreshable detail links and honest demo-data disclosure", async () => {
    window.history.replaceState(null, "", "/#job=research-software-engineer");
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Research Software Engineer" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Back to recommendations/i }));
    expect(screen.getByText(/Demo dataset · roles and activity are illustrative/i)).toBeVisible();
  });

  it("makes the filter dialog keyboard-modal and restores focus", async () => {
    const user = userEvent.setup();
    render(<App />);

    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    await user.click(filtersButton);
    const closeButton = screen.getByRole("button", { name: "Close filters" });
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Show recommendations" })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
    expect(filtersButton).toHaveFocus();
  });
});
