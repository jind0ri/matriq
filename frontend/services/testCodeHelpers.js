export function groupTestCodesByCategory(codes) {
  return codes.reduce((acc, code) => {
    const category = code.category || "Uncategorized";

    if (!acc[category]) acc[category] = [];

    acc[category].push(code);
    return acc;
  }, {});
}