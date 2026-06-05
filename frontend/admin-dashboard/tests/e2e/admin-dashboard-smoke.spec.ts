import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@acme.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";
const userEmail = process.env.E2E_USER_EMAIL ?? "user@acme.com";
const userPassword = process.env.E2E_USER_PASSWORD ?? "password123";

test("admin can sign in, navigate core pages, and see job confirmation", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();

  for (const item of [
    { label: "Customers", path: "/customers" },
    { label: "Products", path: "/products" },
    { label: "Plans", path: "/plans" },
    { label: "Subscriptions", path: "/subscriptions" },
    { label: "Invoices", path: "/invoices" },
    { label: "Payments", path: "/payments" },
    { label: "Admin Jobs", path: "/admin-jobs" },
  ]) {
    await page.getByRole("link", { name: item.label }).click();
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    await expect(page.getByText(/Unable to load/i)).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Run job" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Run mark overdue invoices?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm run" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("user can sign in and sees read-only navigation", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(userEmail);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin Jobs" })).toHaveCount(0);

  for (const item of [
    { label: "Customers", path: "/customers", createButton: "Create customer" },
    { label: "Products", path: "/products", createButton: "Create product" },
    { label: "Plans", path: "/plans", createButton: "Create plan" },
    {
      label: "Subscriptions",
      path: "/subscriptions",
      createButton: "Create subscription",
    },
    { label: "Invoices", path: "/invoices", createButton: "Create invoice" },
    { label: "Payments", path: "/payments", createButton: "Create payment" },
  ]) {
    await page.getByRole("link", { name: item.label }).click();
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    await expect(
      page.getByRole("button", { name: item.createButton }),
    ).toHaveCount(0);
  }
});
