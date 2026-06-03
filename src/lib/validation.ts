export function validateProfileName(name: string): true | string {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return "Profile name may only contain letters, digits, hyphens, and underscores.";
  }
  if (name === "settings") {
    return '"settings" is a reserved name.';
  }
  return true;
}
