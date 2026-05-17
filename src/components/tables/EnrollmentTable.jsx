import { ClipboardCheck, Edit } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getStudentName(student) {
  if (!student) {
    return 'Unknown student';
  }

  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown student';
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700',
    enrolled: 'bg-emerald-50 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        styles[status] || styles.pending,
      ].join(' ')}
    >
      {status || 'pending'}
    </span>
  );
}

function EnrollmentTable({ enrollments, assessmentTotals, onAssessFees, onEdit }) {
  if (enrollments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        No enrollment records found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {enrollments.map((enrollment) => (
          <article
            key={enrollment.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {getStudentName(enrollment.students)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  LRN: {enrollment.students?.lrn || 'Not set'}
                </p>
              </div>
              <StatusBadge status={enrollment.enrollment_status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  School Year
                </dt>
                <dd className="mt-1 text-slate-700">
                  {enrollment.school_years?.school_year || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Grade
                </dt>
                <dd className="mt-1 text-slate-700">
                  {enrollment.grade_levels?.grade_name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Section
                </dt>
                <dd className="mt-1 text-slate-700">
                  {enrollment.sections?.section_name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fee
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(assessmentTotals.get(enrollment.id) || 0)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAssessFees(enrollment)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <ClipboardCheck size={14} />
                Fee
              </button>
              <button
                type="button"
                onClick={() => onEdit(enrollment)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Edit size={14} />
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">LRN</th>
              <th className="px-4 py-3">School Year</th>
              <th className="px-4 py-3">Grade Level</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Enrollment Fee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {getStudentName(enrollment.students)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {enrollment.students?.lrn || 'Not set'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {enrollment.school_years?.school_year || 'Not assigned'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {enrollment.grade_levels?.grade_name || 'Not assigned'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {enrollment.sections?.section_name || 'Not assigned'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={enrollment.enrollment_status} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(assessmentTotals.get(enrollment.id) || 0)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {enrollment.enrollment_date
                    ? new Date(enrollment.enrollment_date).toLocaleDateString()
                    : 'Not set'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onAssessFees(enrollment)}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <ClipboardCheck size={14} />
                      Enrollment Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(enrollment)}
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

export default EnrollmentTable;
