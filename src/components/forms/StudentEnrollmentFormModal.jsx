import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const emptyForm = {
  lrn: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  birthdate: '',
  address: '',
  contact_number: '',
  guardian_name: '',
  guardian_contact: '',
  school_year_id: '',
  grade_level_id: '',
  section_id: '',
  enrollment_date: new Date().toISOString().slice(0, 10),
};

function StudentEnrollmentFormModal({
  isOpen,
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
      setFormData(emptyForm);
      setValidationError('');
    }
  }, [isOpen]);

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

    if (!formData.lrn.trim()) {
      setValidationError('LRN or Student ID is required.');
      return;
    }

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setValidationError('First name and last name are required.');
      return;
    }

    if (!formData.gender) {
      setValidationError('Gender is required.');
      return;
    }

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

    if (!formData.enrollment_date) {
      setValidationError('Enrollment date is required.');
      return;
    }

    await onSubmit({
      student: {
        lrn: formData.lrn.trim(),
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender,
        birthdate: formData.birthdate || null,
        address: formData.address.trim(),
        contact_number: formData.contact_number.trim(),
        guardian_name: formData.guardian_name.trim(),
        guardian_contact: formData.guardian_contact.trim(),
      },
      enrollment: {
        school_year_id: formData.school_year_id,
        grade_level_id: formData.grade_level_id,
        section_id: formData.section_id,
        enrollment_status: 'enrolled',
        enrollment_date: formData.enrollment_date,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Add Student</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create the student record and enroll them into a class in one step.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close student form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5">
          {validationError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationError}
            </div>
          ) : null}

          <section>
            <h4 className="text-sm font-bold uppercase tracking-wide text-[#132a63]">
              Student Information
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                LRN / Student ID
                <input
                  type="text"
                  name="lrn"
                  value={formData.lrn}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Gender
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                First Name
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Middle Name
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Last Name
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Birthdate
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Address
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Contact Number
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Parent / Guardian Name
                <input
                  type="text"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Parent / Guardian Contact
                <input
                  type="text"
                  name="guardian_contact"
                  value={formData.guardian_contact}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-wide text-[#132a63]">
              Class Assignment
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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

              <label className="block text-sm font-medium text-slate-700">
                Enrollment Date
                <input
                  type="date"
                  name="enrollment_date"
                  value={formData.enrollment_date}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </section>

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
              {isSaving ? 'Saving...' : 'Add and Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentEnrollmentFormModal;
