import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const emptyForm = {
  student_id: '',
  school_year_id: '',
  grade_level_id: '',
  section_id: '',
  enrollment_status: 'pending',
  enrollment_date: new Date().toISOString().slice(0, 10),
};

function getStudentName(student) {
  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getStudentSearchText(student) {
  return [student.lrn, getStudentName(student)].filter(Boolean).join(' ');
}

function EnrollmentFormModal({
  isOpen,
  mode,
  enrollment,
  students,
  schoolYears,
  gradeLevels,
  sections,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (enrollment) {
      const selectedStudent = students.find(
        (student) => student.id === enrollment.student_id,
      );

      setFormData({
        student_id: enrollment.student_id || '',
        school_year_id: enrollment.school_year_id || '',
        grade_level_id: enrollment.grade_level_id || '',
        section_id: enrollment.section_id || '',
        enrollment_status: enrollment.enrollment_status || 'pending',
        enrollment_date:
          enrollment.enrollment_date || new Date().toISOString().slice(0, 10),
      });
      setStudentSearch(
        selectedStudent
          ? `${selectedStudent.lrn ? `${selectedStudent.lrn} - ` : ''}${getStudentName(selectedStudent)}`
          : '',
      );
    } else {
      setFormData(emptyForm);
      setStudentSearch('');
    }

    setValidationError('');
  }, [enrollment, isOpen, students]);

  const availableSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.status !== 'inactive' &&
          (!formData.grade_level_id || section.grade_level_id === formData.grade_level_id),
      ),
    [formData.grade_level_id, sections],
  );

  const filteredStudents = useMemo(() => {
    const search = normalizeText(studentSearch).trim();

    if (!search) {
      return students.slice(0, 8);
    }

    return students
      .filter((student) => normalizeText(getStudentSearchText(student)).includes(search))
      .slice(0, 8);
  }, [studentSearch, students]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === formData.student_id),
    [formData.student_id, students],
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

  const handleStudentSearchChange = (event) => {
    setStudentSearch(event.target.value);

    if (formData.student_id) {
      setFormData((currentData) => ({
        ...currentData,
        student_id: '',
      }));
    }
  };

  const handleSelectStudent = (student) => {
    setFormData((currentData) => ({
      ...currentData,
      student_id: student.id,
    }));
    setStudentSearch(`${student.lrn ? `${student.lrn} - ` : ''}${getStudentName(student)}`);
    setValidationError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.student_id) {
      setValidationError('Please select a student.');
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
      setValidationError('Please select a section.');
      return;
    }

    if (!formData.enrollment_date) {
      setValidationError('Enrollment date is required.');
      return;
    }

    await onSubmit(formData);
  };

  const title = mode === 'edit' ? 'Update Enrollment' : 'Enroll Student';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Assign the student to a school year, grade level, and section.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close enrollment form"
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
            <div className="block text-sm font-medium text-slate-700 md:col-span-2">
              Student
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={handleStudentSearchChange}
                  placeholder="Search by LRN or student name"
                  className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {formData.student_id && selectedStudent ? (
                <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {selectedStudent.lrn ? `${selectedStudent.lrn} - ` : ''}
                  {getStudentName(selectedStudent)}
                </div>
              ) : (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white">
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-4 text-sm font-normal text-slate-500">
                      No matching students found.
                    </p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm font-normal last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="block font-semibold text-slate-900">
                          {getStudentName(student)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          LRN: {student.lrn || 'Not set'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

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

            {mode === 'edit' ? (
              <label className="block text-sm font-medium text-slate-700">
                Enrollment Status
                <select
                  name="enrollment_status"
                  value={formData.enrollment_status}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {formData.enrollment_status === 'enrolled' ? (
                    <option value="enrolled">Enrolled</option>
                  ) : (
                    <option value="pending">Pending</option>
                  )}
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            ) : null}

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
              Section
              <select
                name="section_id"
                value={formData.section_id}
                onChange={handleChange}
                required
                disabled={!formData.grade_level_id}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">
                  {formData.grade_level_id ? 'Select section' : 'Select grade first'}
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
              {isSaving ? 'Saving...' : 'Save Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnrollmentFormModal;
