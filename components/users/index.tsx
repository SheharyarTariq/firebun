"use client";

import { useState } from "react";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/layout/page-header";
import type { UserRow } from "@/server/users/queries";
import { cn } from "@/utils/cn";
import { routes } from "@/utils/routes";
import UserActionsSheet from "./user-actions-sheet";
import UserFormSheet from "./user-form-sheet";

interface UsersScreenProps {
  users: UserRow[];
  currentUserId: number;
}

export default function UsersScreen({ users, currentUserId }: UsersScreenProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  const active = users.filter((u) => u.isActive);
  const inactive = users.filter((u) => !u.isActive);

  return (
    <>
      <PageHeader
        title="Staff accounts"
        subtitle={`${active.length} active`}
        backHref={routes.ui.more}
        actions={
          <Button
            size="sm"
            startIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Add
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        {users.length === 0 ? (
          <EmptyState icon={UserRound} title="No accounts yet" />
        ) : (
          <>
            <UserList users={active} currentUserId={currentUserId} onSelect={setSelected} />
            {inactive.length > 0 && (
              <section className="space-y-2">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Deactivated
                </h2>
                <UserList
                  users={inactive}
                  currentUserId={currentUserId}
                  onSelect={setSelected}
                />
              </section>
            )}
          </>
        )}
      </div>

      <UserFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      <UserActionsSheet
        user={selected}
        isSelf={selected?.id === currentUserId}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}

interface UserListProps {
  users: UserRow[];
  currentUserId: number;
  onSelect: (user: UserRow) => void;
}

function UserList({ users, currentUserId, onSelect }: UserListProps) {
  return (
    <Card className="divide-y divide-border p-0">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelect(user)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              user.isActive ? "bg-brand/25 text-brand-text" : "bg-muted-bg text-muted"
            )}
          >
            {initialsOf(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {user.name}
              {user.id === currentUserId && (
                <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Badge variant={user.role === "admin" ? "brand" : "neutral"}>
            {user.role === "admin" ? "Admin" : "Staff"}
          </Badge>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </button>
      ))}
    </Card>
  );
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
