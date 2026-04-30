import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@acme.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";

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
