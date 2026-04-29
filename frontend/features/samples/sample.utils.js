export function normalizeMaterial(value) {
  if (!value) return "-";

  const v = String(value).toLowerCase();

  if (v.includes("steel") || v.includes("rebar")) return "Reinforcing Steel Bar";
  if (v.includes("aggregate") || v.includes("soil")) return "Soil Aggregates";
  if (v.includes("concrete") || v.includes("cement")) return "Concrete";

  return value;
}

export function matchesSearch(item, query) {
  if (!query) return true;

  const q = query.toLowerCase();

  return (
    item.sample_id?.toLowerCase().includes(q) ||
    item.client_name?.toLowerCase().includes(q) ||
    item.project_reference?.toLowerCase().includes(q) ||
    item.project_id?.toLowerCase().includes(q) ||
    item.material_type?.toLowerCase().includes(q) ||
    item.ai_predicted_label?.toLowerCase().includes(q)
  );
}

export function matchesBranch(item, branchFilter, userBranchId) {
  if (branchFilter === "All") return true;
  if (branchFilter === "My") return Number(item.branch_id) === Number(userBranchId);

  return Number(item.branch_id) === Number(branchFilter);
}

export function matchesStatus(item, statusFilter) {
  if (statusFilter === "All") return true;
  return item.current_state === statusFilter;
}

export function matchesMaterial(item, materialFilter) {
  if (materialFilter === "All") return true;

  const material = normalizeMaterial(
    item.material_type || item.ai_predicted_label
  );

  return material === materialFilter;
}

export function filterSamples(items, filters, userBranchId) {
  return items.filter((item) => {
    return (
      matchesSearch(item, filters.search) &&
      matchesBranch(item, filters.branch, userBranchId) &&
      matchesStatus(item, filters.status) &&
      matchesMaterial(item, filters.material)
    );
  });
}