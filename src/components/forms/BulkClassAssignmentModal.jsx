import { UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const emptyForm = {
  school_year_id: '',
  grade_level_id: '',
  section_id: '',
};

function BulkClassAssignmentModal({
  isOpen,
  initialValues,
  schoolYears,
  gradeLevels,
  sections,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        school_year_id:
          initialValues?.schoolYearId && initialValues.schoolYearId !== 'all'
            ? initialValues.schoolYearId
            : '',
        grade_level_id:
          initialValues?.gradeLevelId && initialValues.gradeLevelId !== 'all'
            ? initialValues.gradeLevelId
            : '',
        section_id:
          initialValues?.sectionId && initialValues.sectionId !== 'all'
            ? initialValues.sectionId
            : '',
      });
      setValidationError('');
    }
  }, [initialValues, isOpen]);

  const availableSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.status !== 'inactive' &&
          (!formData.grade_level_id || section.grade_level_id === formData.grade_level_id),
      ),
    [formData.grade_level_id, sections],
  );

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: value,
      };

      if (name === 'grade_level_id') {
        nextData.section_id = '';
      }

      return nextData;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.school_year_id) {
      setValidationError('Please select a school year.');
      return;
    }

    if (!formData.grade_level_id) {
      setValidationError('Please select a grade level.');
      return;
    }

    if (!formData.section_id) {
      setValidationError('Please select a class section.');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Assign Class</h3>
            <p className="mt-1 text-sm text-slate-500">
              Assign students without a class section to one class.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close class assignment form"
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

          <div className="grid gap-4 sm:grid-cols-2">
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
                {schoolYears.map((schoolYear) => (
                  <option key={schoolYear.id} value={schoolYear.id}>
                    {schoolYear.school_year}
                  </option>
                ))}
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

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Class Section
              <select
                name="section_id"
                value={formData.section_id}
                onChange={handleChange}
                required
                disabled={!formData.grade_level_id}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">
                  {formData.grade_level_id ? 'Select class section' : 'Select grade first'}
                </option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.section_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This will only update pending and enrolled students with no class section yet.
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f6bd2b] px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-[#d9a515] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              <UsersRound size={16} />
              {isSaving ? 'Assigning...' : 'Assign Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkClassAssignmentModal;
