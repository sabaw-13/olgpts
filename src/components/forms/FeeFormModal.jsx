import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const emptyForm = {
  fee_name: 'Enrollment Fee',
  fee_type: 'Enrollment Fee',
  amount: '',
  grade_level_id: '',
  school_year_id: '',
  status: 'active',
};

function FeeFormModal({
  isOpen,
  mode,
  fee,
  gradeLevels,
  schoolYears,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (fee) {
      setFormData({
        fee_name: fee.fee_name || '',
        fee_type: fee.fee_type || '',
        amount: fee.amount ?? '',
        grade_level_id: fee.grade_level_id || '',
        school_year_id: fee.school_year_id || '',
        status: fee.status || 'active',
      });
    } else {
      setFormData(emptyForm);
    }

    setValidationError('');
  }, [fee, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.fee_name.trim()) {
      setValidationError('Fee name is required.');
      return;
    }

    if (!formData.fee_type.trim()) {
      setValidationError('Fee type is required.');
      return;
    }

    if (!formData.grade_level_id) {
      setValidationError('Please assign a grade level.');
      return;
    }

    if (!formData.school_year_id) {
      setValidationError('Please assign a school year.');
      return;
    }

    const amount = Number(formData.amount);

    if (Number.isNaN(amount)) {
      setValidationError('Amount must be a valid number.');
      return;
    }

    if (amount < 0) {
      setValidationError('Amount must not be negative.');
      return;
    }

    await onSubmit({
      ...formData,
      fee_name: 'Enrollment Fee',
      fee_type: 'Enrollment Fee',
      amount,
    });
  };

  const title = mode === 'edit' ? 'Edit Enrollment Fee' : 'Add Enrollment Fee';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Set the enrollment fee for a grade level and school year.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close fee form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {validationError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Fee Name
              <input
                type="text"
                name="fee_name"
                value="Enrollment Fee"
                readOnly
                required
                className="mt-2 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Fee Type
              <input
                type="text"
                name="fee_type"
                value="Enrollment Fee"
                readOnly
                required
                className="mt-2 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Amount
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Grade Level
              <select
                name="grade_level_id"
                value={formData.grade_level_id}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select grade level</option>
                {gradeLevels
                  .filter((gradeLevel) => gradeLevel.status !== 'inactive')
                  .map((gradeLevel) => (
                    <option key={gradeLevel.id} value={gradeLevel.id}>
                      {gradeLevel.grade_name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              School Year
              <select
                name="school_year_id"
                value={formData.school_year_id}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select school year</option>
                {schoolYears
                  .filter((schoolYear) => schoolYear.status !== 'inactive')
                  .map((schoolYear) => (
                    <option key={schoolYear.id} value={schoolYear.id}>
                      {schoolYear.school_year}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Saving...' : 'Save Enrollment Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FeeFormModal;
