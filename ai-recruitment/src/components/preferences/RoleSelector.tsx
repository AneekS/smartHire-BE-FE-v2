"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoleSelectorProps {
  primaryRole: string;
  secondaryRoles: string[];
  exploratoryRoles: string[];
  onChange: (next: {
    primaryRole: string;
    secondaryRoles: string[];
    exploratoryRoles: string[];
  }) => void;
}

export function RoleSelector({
  primaryRole,
  secondaryRoles,
  exploratoryRoles,
  onChange,
}: RoleSelectorProps) {
  const [draftRole, setDraftRole] = useState("");
  const [draftExploratory, setDraftExploratory] = useState("");

  const rankedRoles = useMemo(() => [primaryRole, ...secondaryRoles].filter(Boolean), [primaryRole, secondaryRoles]);

  const addSecondaryRole = () => {
    const role = draftRole.trim();
    if (!role || secondaryRoles.includes(role) || role === primaryRole) return;
    onChange({
      primaryRole,
      secondaryRoles: [...secondaryRoles, role],
      exploratoryRoles,
    });
    setDraftRole("");
  };

  const addExploratoryRole = () => {
    const role = draftExploratory.trim();
    if (!role || exploratoryRoles.includes(role)) return;
    onChange({
      primaryRole,
      secondaryRoles,
      exploratoryRoles: [...exploratoryRoles, role],
    });
    setDraftExploratory("");
  };

  const removeSecondary = (role: string) => {
    onChange({
      primaryRole,
      secondaryRoles: secondaryRoles.filter((item) => item !== role),
      exploratoryRoles,
    });
  };

  const removeExploratory = (role: string) => {
    onChange({
      primaryRole,
      secondaryRoles,
      exploratoryRoles: exploratoryRoles.filter((item) => item !== role),
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Role</p>
        <Input
          className="mt-2"
          value={primaryRole}
          placeholder="Backend Developer"
          onChange={(e) =>
            onChange({
              primaryRole: e.target.value,
              secondaryRoles,
              exploratoryRoles,
            })
          }
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary Roles</p>
        <div className="mt-2 flex gap-2">
          <Input
            value={draftRole}
            placeholder="Add another role"
            onChange={(e) => setDraftRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSecondaryRole())}
          />
          <Button type="button" onClick={addSecondaryRole} variant="secondary">
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {secondaryRoles.map((role, index) => (
            <button
              key={role}
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              onClick={() => removeSecondary(role)}
            >
              P{index + 2}: {role} x
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exploratory Roles</p>
        <div className="mt-2 flex gap-2">
          <Input
            value={draftExploratory}
            placeholder="AI Engineer"
            onChange={(e) => setDraftExploratory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExploratoryRole())}
          />
          <Button type="button" onClick={addExploratoryRole} variant="secondary">
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {exploratoryRoles.map((role) => (
            <button
              key={role}
              type="button"
              className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200"
              onClick={() => removeExploratory(role)}
            >
              {role} x
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Priority order: {rankedRoles.length > 0 ? rankedRoles.join(" > ") : "No roles selected"}
      </div>
    </div>
  );
}
