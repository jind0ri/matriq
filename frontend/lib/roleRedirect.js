export function getRedirectByRole(role) {
  switch (role) {
    case "admin":
      return "/admin";

    case "qa_engineer":
    case "technician":
    case "senior_technician":
      return "/technical";

    case "accounting":
      return "/accounting";

    default:
      return "/auth/access-select";
  }
}