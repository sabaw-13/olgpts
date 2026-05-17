import { Edit, Power } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function StatusBadge({ status }) {
  const isActive = status === 'active';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {status || 'active'}
    </span>
  );
}

function FeeTable({ fees, canManage, isSaving, onEdit, onToggleStatus }) {
  if (fees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        No enrollment fee records found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Grade Level</th>
              <th className="px-4 py-3">School Year</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fees.map((fee) => {
              const nextStatus = fee.status === 'inactive' ? 'active' : 'inactive';

              return (
                <tr key={fee.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {fee.grade_levels?.grade_name || 'Not assigned'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fee.school_years?.school_year || 'Not assigned'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(fee.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={fee.status} />
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(fee)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(fee, nextStatus)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Power size={14} />
                          {nextStatus === 'active' ? 'Activate' : 'Deactivate'}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FeeTable;
