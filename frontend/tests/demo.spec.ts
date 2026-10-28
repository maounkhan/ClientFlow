import { test, expect, type Page } from "@playwright/test";
async function signIn(page: Page, role = "Team manager") {
  await page.goto("/");
  const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  const managerCard = page.getByRole("button", {
    name: "Team manager Jordan Lee",
    exact: true,
  });
  await expect(signOut.or(managerCard).first()).toBeVisible();
  if (await signOut.isVisible()) {
    await signOut.click();
    await expect(managerCard).toBeVisible();
  }
  await page.getByRole("button", { name: new RegExp("^" + role) }).click();
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: new RegExp("^" + name) })
    .click();
}
test("manager workspace, navigation, search, articles, and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await page.screenshot({
    path: "../docs/screenshots/overview.png",
    fullPage: true,
  });
  await navigate(page, "Support tickets");
  await page.getByRole("textbox", { name: "Search tickets" }).fill("SSO");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search tickets" })
    .fill("does-not-exist");
  await expect(page.getByText("No matching tickets")).toBeVisible();
  await navigate(page, "Onboarding");
  await expect(
    page.getByRole("heading", { name: "Client onboarding" }),
  ).toBeVisible();
  await navigate(page, "Organizations");
  await expect(
    page.getByRole("heading", { name: "Northstar Labs" }),
  ).toBeVisible();
  await navigate(page, "SLA & escalations");
  await expect(
    page.getByRole("heading", { name: "Service level policies" }),
  ).toBeVisible();
  await navigate(page, "Analytics & reports");
  await expect(
    page.getByRole("heading", { name: "Team workload" }),
  ).toBeVisible();
  await navigate(page, "Knowledge base");
  await page
    .getByRole("textbox", { name: "Search knowledge base" })
    .fill("single sign-on");
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.locator(".article-card").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Check the identity provider",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await navigate(page, "Documents");
  await expect(
    page.getByRole("button", { name: "Upload your first document" }),
  ).toBeVisible();
  await navigate(page, "Team members");
  await expect(page.getByRole("heading", { name: "Sofia Chen" })).toBeVisible();
  await navigate(page, "Audit log");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await page
    .locator(".sidebar-bottom")
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.getByText("Operational", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Ticket updates" }).uncheck();
  await expect(
    page.getByText("Preferences saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Ticket updates" }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Ticket updates" }).check();
  await navigate(page, "Overview");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../docs/screenshots/mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("client to manager to engineer to client ticket journey", async ({
  page,
}) => {
  await signIn(page, "Client");
  await expect(
    page.locator(".sidebar nav").getByRole("button", { name: "Audit log" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  const title = "Demo journey " + Date.now();
  await page.getByLabel("Subject", { exact: true }).fill(title);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Integrations");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "Production API connection fails for our workspace users. Please investigate the configuration.",
    );
  await page
    .getByRole("button", { name: "Create ticket", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const reference = await page
    .locator(".ticket-ref>span")
    .first()
    .textContent();
  await signIn(page);
  await page.goto("/#tickets/" + reference);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ticket assignee").selectOption("u-engineer");
  await expect(
    page.getByText("Assignment updated", { exact: true }),
  ).toBeVisible();
  await signIn(page, "Support engineer");
  await page.goto("/#tickets/" + reference);
  await page.getByLabel("Next ticket status").selectOption("Triaged");
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
  await expect(page.locator(".ticket-ref")).toContainText("Triaged");
  await page.getByLabel("Next ticket status").selectOption("In Progress");
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
  await expect(page.locator(".ticket-ref")).toContainText("In Progress");
  await page
    .getByRole("button", { name: "Internal note", exact: true })
    .click();
  await page
    .getByLabel("Internal note", { exact: true })
    .fill("Private internal diagnostic: reviewing connection configuration.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText(
      "Private internal diagnostic: reviewing connection configuration.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Public reply", exact: true }).click();
  await page
    .getByLabel("Reply message")
    .fill("We corrected the API configuration and verified connectivity.");
  await page.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(
    page.getByText(
      "We corrected the API configuration and verified connectivity.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Next ticket status").selectOption("Resolved");
  await page
    .getByLabel("Resolution summary")
    .fill("Updated connection configuration. Production API verified healthy.");
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
  await expect(page.locator(".ticket-ref")).toContainText("Resolved");
  await page.screenshot({
    path: "../docs/screenshots/ticket.png",
    fullPage: true,
  });
  await signIn(page, "Client");
  await page.goto("/#tickets/" + reference);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Private internal diagnostic: reviewing connection configuration.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "We corrected the API configuration and verified connectivity.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Next ticket status").selectOption("Closed");
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
  await expect(page.locator(".ticket-ref")).toContainText("Closed");
  await page.reload();
  await expect(page.locator(".ticket-ref")).toContainText("Closed");
});
test("organization creation, onboarding, policy edit, private document, and article publishing", async ({
  page,
}) => {
  await signIn(page);
  await navigate(page, "Organizations");
  await page
    .getByRole("button", { name: "Add organization", exact: true })
    .click();
  const name = "Demo partner " + Date.now();
  await page.getByLabel("Organization name", { exact: true }).fill(name);
  await page.getByLabel("Industry", { exact: true }).fill("Technology");
  await page
    .getByLabel("Primary contact email", { exact: true })
    .fill("contact@example.demo");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await navigate(page, "Onboarding");
  const card = page
    .locator(".onboarding-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  for (let i = 0; i < 5; i++) {
    await card.getByRole("checkbox").nth(i).check();
    await expect(
      page.getByText("Checklist updated", { exact: true }),
    ).toBeVisible();
    await expect(card.getByRole("checkbox").nth(i)).toBeChecked();
    await expect(card.getByRole("checkbox").nth(i)).toBeEnabled();
  }
  await card.getByRole("button", { name: "Submit for review" }).click();
  await expect(card.getByText("In Review", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Review submission" }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(card.getByText("Approved", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Activate client" }).click();
  await expect(card.getByText("Active", { exact: true })).toBeVisible();
  await navigate(page, "SLA & escalations");
  await page
    .locator(".policy-card")
    .filter({ has: page.getByText("Low", { exact: true }) })
    .getByRole("button", { name: "Edit policy" })
    .click();
  await page.getByLabel("Resolution target (hours)").fill("72");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("SLA policy updated for future requests", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Documents");
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await page.getByLabel("Choose document").setInputFiles({
    name: "demo-security.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fictional demo security questionnaire."),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await expect(
    page.getByText("demo-security.txt", { exact: true }),
  ).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download demo-security.txt" }).click();
  expect((await dl).suggestedFilename()).toBe("demo-security.txt");
  await navigate(page, "Knowledge base");
  await page.getByRole("button", { name: "Write article" }).click();
  await page
    .getByLabel("Article title", { exact: true })
    .fill("Demo onboarding guide " + Date.now());
  await page.getByLabel("Category", { exact: true }).fill("Getting started");
  await page
    .getByLabel("Short description")
    .fill("A published guide for the demo.");
  await page
    .getByLabel("Article content")
    .fill("Complete the checklist and submit it for review.");
  await page
    .getByRole("button", { name: "Publish article", exact: true })
    .click();
  await expect(
    page.getByText("Article published", { exact: true }),
  ).toBeVisible();
});

test("checkbox selection remains visible while saving and survives reload", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Open profile settings" }).click();
  const checkbox = page.getByRole("checkbox", { name: "SLA alerts" });
  await expect(checkbox).toBeChecked();
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/preferences", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await responseGate;
    await route.fulfill({ response });
  });
  try {
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toBeDisabled();
  } finally {
    release();
  }
  await expect(checkbox).toBeEnabled();
  await page.unroute("**/api/v1/preferences");
  await page.reload();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeEnabled();
});
test("failed checkbox saves restore the persisted value and report the error", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Open profile settings" }).click();
  const checkbox = page.getByRole("checkbox", { name: "Onboarding updates" });
  await expect(checkbox).toBeChecked();
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/preferences", async (route) => {
    if (route.request().method() === "PUT") {
      await responseGate;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Save temporarily unavailable" }),
      });
    } else await route.continue();
  });
  try {
    await checkbox.uncheck();
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toContainText(
    "Save temporarily unavailable",
  );
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeEnabled();
  await page.unroute("**/api/v1/preferences");
  await page.reload();
  await expect(checkbox).toBeChecked();
});

test("sending a reply preserves a newer draft typed while the request is pending", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  const title = "Reply draft regression " + Date.now();
  await page.getByLabel("Subject", { exact: true }).fill(title);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Verify support reply drafts survive an in-flight save.");
  await page
    .getByRole("button", { name: "Create ticket", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  let release!: () => void;
  let received!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    received = resolve;
  });
  await page.route("**/api/v1/tickets/*/comments", async (route) => {
    const response = await route.fetch();
    received();
    await responseGate;
    await route.fulfill({ response });
  });
  const editor = page.getByLabel("Reply message");
  await editor.fill("First submitted reply");
  await page.getByRole("button", { name: "Send reply", exact: true }).click();
  try {
    await requestStarted;
    await editor.fill("Keep this newer draft");
  } finally {
    release();
  }
  await expect(
    page.getByText("First submitted reply", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send reply", exact: true }),
  ).toBeEnabled();
  await expect(editor).toHaveValue("Keep this newer draft");
});
