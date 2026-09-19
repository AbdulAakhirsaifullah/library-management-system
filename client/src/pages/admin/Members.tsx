import { useState } from 'react';
import { TextInput } from '../../components/ui/Field';
import { Tag } from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../../components/ui/States';
import { useMembers } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';

export function MembersPage() {
  const [search, setSearch] = useState('');
  const { data, isPending, isError, error, refetch } = useMembers(search || undefined);

  return (
    <>
      <PageHeader title="Members" description="Everyone with a library account, and how much they have borrowed." />

      <Sheet>
        <div className="border-b border-ink/10 p-4">
          <label htmlFor="member-search" className="sr-only">
            Search members
          </label>
          <TextInput
            id="member-search"
            type="search"
            placeholder="Search by username or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isPending && <TableSkeleton />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'Members could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}
        {data && data.users.length === 0 && (
          <EmptyState title="No one matches that" description="Try a different name or email." />
        )}

        {data && data.users.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[13px] text-ink-faint">
                <th scope="col" className="px-4 py-2.5 font-medium">Member</th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Joined</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Out now</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Total borrowed</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((member) => (
                <tr key={member.id} className="border-b border-ink/6 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{member.username}</span>
                    {member.role === 'ADMIN' && <Tag tone="warn">Staff</Tag>}
                    <span className="block text-[13px] text-ink-faint">{member.email}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {formatDate(member.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{member.activeLoans}</td>
                  <td className="px-4 py-3 text-ink-soft">{member.totalLoans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sheet>
    </>
  );
}
