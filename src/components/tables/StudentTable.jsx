import { Edit, Eye } from 'lucide-react';

function getFullName(student) {
  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');
}

function StudentTable({ students, onView, onEdit }) {
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        No student records found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:hidden">
        {students.map((student) => (
          <article
            key={student.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {getFullName(student) || 'Unnamed student'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  LRN: {student.lrn || 'Not set'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onView(student)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                  aria-label="View student"
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(student)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                  aria-label="Edit student"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gender
                </dt>
                <dd className="mt-1 text-slate-700">{student.gender || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Birthdate
                </dt>
                <dd className="mt-1 text-slate-700">
                  {student.birthdate
                    ? new Date(student.birthdate).toLocaleDateString()
                    : 'Not set'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Guardian
                </dt>
                <dd className="mt-1 break-words text-slate-700">
                  {student.guardian_name || 'Not set'}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:block">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">LRN / Student ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Birthdate</th>
              <th className="px-4 py-3">Guardian</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {student.lrn || 'Not set'}
                </td>
                <td className="px-4 py-3 text-slate-700">{getFullName(student)}</td>
                <td className="px-4 py-3 text-slate-600">{student.gender || 'Not set'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {student.birthdate
                    ? new Date(student.birthdate).toLocaleDateString()
                    : 'Not set'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {student.guardian_name || 'Not set'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(student)}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(student)}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}

export default StudentTable;
