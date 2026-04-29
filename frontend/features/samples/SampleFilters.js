"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function SampleFilters({
  filters,
  setFilters,
  branchOptions,
  role,
}) {
  return (
    <>
      <Input
        name="registrySearch"
        value={filters.search}
        onChange={(event) =>
          setFilters((prev) => ({
            ...prev,
            search: event.target.value,
          }))
        }
        placeholder="Search sample ID, client, project, or material..."
      />

      <Select
        name="branchFilter"
        value={filters.branch}
        onChange={(event) =>
          setFilters((prev) => ({
            ...prev,
            branch: event.target.value,
          }))
        }
      >
        {branchOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        name="statusFilter"
        value={filters.status}
        onChange={(event) =>
          setFilters((prev) => ({
            ...prev,
            status: event.target.value,
          }))
        }
      >
        <option value="All">All Queues</option>

        {role === "Lab Technician" && (
          <>
            <option value="Registered">Ready for Testing</option>
            <option value="In Testing">In Testing</option>
          </>
        )}

        {role === "Senior Technician" && (
          <option value="For Review">Manual Review</option>
        )}

        {role === "QA Engineer" && (
          <>
            <option value="Registered">QA Pre-Test</option>
            <option value="For Review">QA Release</option>
            <option value="Released">Archive</option>
          </>
        )}

        {role === "Administrator" && (
          <>
            <option value="Registered">Registered</option>
            <option value="In Testing">In Testing</option>
            <option value="For Review">For Review</option>
            <option value="Released">Released</option>
            <option value="Archived">Archived</option>
          </>
        )}
      </Select>

      <Select
        name="materialFilter"
        value={filters.material}
        onChange={(event) =>
          setFilters((prev) => ({
            ...prev,
            material: event.target.value,
          }))
        }
      >
        <option value="All">All Materials</option>
        <option value="Concrete">Concrete</option>
        <option value="Reinforcing Steel Bar">Reinforcing Steel Bar</option>
        <option value="Soil Aggregates">Soil Aggregates</option>
      </Select>
    </>
  );
}