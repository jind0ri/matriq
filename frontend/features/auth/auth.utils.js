import { PERMISSIONS } from "./permissions";

export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission);
}

//makes pages show different actions based on role permissions