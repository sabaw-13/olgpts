import { X } from 'lucide-react';

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">{value || 'Not set'}</p>
    </div>
  );
}

function getFullName(student) {
  return [student?.first_name, student?.middle_name, student?.last_name]
    .filter(Boolean)
    .join(' ');
}

function StudentProfileModal({ student, onClose }) {
  if (!student) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Student Profile
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {getFullName(student)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              LRN / Student ID: {student.lrn || 'Not set'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close student profile"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <DetailItem label="First Name" value={student.first_name} />
          <DetailItem label="Middle Name" value={student.middle_name} />
          <DetailItem label="Last Name" value={student.last_name} />
          <DetailItem label="Gender" value={student.gender} />
          <DetailItem
            label="Birthdate"
            value={
              student.birthdate
                ? new Date(student.birthdate).toLocaleDateString()
                : ''
            }
          />
          <DetailItem label="Contact Number" value={student.contact_number} />
          <DetailItem label="Parent / Guardian" value={student.guardian_name} />
          <DetailItem
            label="Guardian Contact"
            value={student.guardian_contact}
          />
          <div className="sm:col-span-2">
            <DetailItem label="Address" value={student.address} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfileModal;
