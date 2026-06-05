import type { AuthRole } from "@/features/auth/types";

export type AdminNavigationItem = {
  id: string;
  label: string;
  path: string;
  roles?: AuthRole[];
};

// Single source of truth for admin navigation.
export const adminNavigation: AdminNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "customers", label: "Customers", path: "/customers" },
  { id: "products", label: "Products", path: "/products" },
  { id: "plans", label: "Plans", path: "/plans" },
  { id: "subscriptions", label: "Subscriptions", path: "/subscriptions" },
  { id: "invoices", label: "Invoices", path: "/invoices" },
  { id: "payments", label: "Payments", path: "/payments" },
  { id: "revenue-actions", label: "Action Center", path: "/revenue-actions" },
  { id: "admin-jobs", label: "Admin Jobs", path: "/admin-jobs", roles: ["ADMIN"] },
  { id: "team", label: "Team", path: "/team", roles: ["ADMIN"] },
  { id: "settings", label: "Settings", path: "/settings" },
];

export function isNavigationItemActive(
  currentPathname: string,
  itemPath: string,
) {
  if (itemPath === "/dashboard") {
    return currentPathname === itemPath;
  }

  return (
    currentPathname === itemPath ||
    currentPathname.startsWith(`${itemPath}/`)
  );
}

export function getNavigationItemByPath(pathname: string) {
  return adminNavigation.find((item) => isNavigationItemActive(pathname, item.path));
}

export function canAccessNavigationItem(
  item: AdminNavigationItem,
  role?: AuthRole,
) {
  if (!item.roles) {
    return true;
  }

  return role ? item.roles.includes(role) : false;
}

export function getNavigationForRole(role?: AuthRole) {
  return adminNavigation.filter((item) => canAccessNavigationItem(item, role));
}
