import { Download, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const studentCsvColumns = [
  'lrn',
  'first_name',
  'middle_name',
  'last_name',
  'gender',
  'birthdate',
  'address',
  'contact_number',
  'guardian_name',
  'guardian_contact',
];

const studentCsvHeaderAliases = {
  lrn: 'lrn',
  student_id: 'lrn',
  studentid: 'lrn',
  first_name: 'first_name',
  firstname: 'first_name',
  first: 'first_name',
  middle_name: 'middle_name',
  middlename: 'middle_name',
  middle: 'middle_name',
  last_name: 'last_name',
  lastname: 'last_name',
  last: 'last_name',
  gender: 'gender',
  birthdate: 'birthdate',
  birth_date: 'birthdate',
  address: 'address',
  contact_number: 'contact_number',
  contact: 'contact_number',
  guardian_name: 'guardian_name',
  parent_guardian_name: 'guardian_name',
  guardian_contact: 'guardian_contact',
  parent_guardian_contact: 'guardian_contact',
};

function getEmptyForm() {
  return {
    school_year_id: '',
    grade_level_id: '',
    section_id: '',
    enrollment_date: new Date().toISOString().slice(0, 10),
  };
}

function normalizeHeader(value) {
  const key = String(value || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return studentCsvHeaderAliases[key] || key;
}

function parseCsv(text) {
  const rows = [];
  let currentCell = '';
  let currentRow = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (char === ',' && !isQuoted) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function normalizeGender(value) {
  const gender = String(value || '').trim().toLowerCase();

  if (gender === 'm' || gender === 'male') return 'Male';
  if (gender === 'f' || gender === 'female') return 'Female';

  return String(value || '').trim();
}

function normalizeStudentRow(row, rowNumber) {
  const student = {
    lrn: row.lrn?.trim() || '',
    first_name: row.first_name?.trim() || '',
    middle_name: row.middle_name?.trim() || '',
    last_name: row.last_name?.trim() || '',
    gender: normalizeGender(row.gender),
    birthdate: row.birthdate?.trim() || null,
    address: row.address?.trim() || '',
    contact_number: row.contact_number?.trim() || '',
    guardian_name: row.guardian_name?.trim() || '',
    guardian_contact: row.guardian_contact?.trim() || '',
  };

  if (!student.lrn) {
    throw new Error(`Row ${rowNumber}: LRN or Student ID is required.`);
  }

  if (!student.first_name || !student.last_name) {
    throw new Error(`Row ${rowNumber}: first_name and last_name are required.`);
  }

  if (!['Male', 'Female'].includes(student.gender)) {
    throw new Error(`Row ${rowNumber}: gender must be Male or Female.`);
  }

  if (student.birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(student.birthdate)) {
    throw new Error(`Row ${rowNumber}: birthdate must use YYYY-MM-DD format.`);
  }

  return student;
}

function parseStudentCsv(text) {
  const rows = parseCsv(text);

  if (rows.length < 2) {
    throw new Error('CSV file must include a header row and at least one student row.');
  }

  const headers = rows[0].map(normalizeHeader);
  const missingHeaders = ['lrn', 'first_name', 'last_name', 'gender'].filter(
    (header) => !headers.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}.`);
  }

  const parsedRows = rows.slice(1).map((values, index) => {
    const row = {};

    headers.forEach((header, headerIndex) => {
      if (studentCsvColumns.includes(header)) {
        row[header] = values[headerIndex] || '';
      }
    });

    return normalizeStudentRow(row, index + 2);
  });

  const seenLrns = new Set();
  const duplicateLrns = [];

  parsedRows.forEach((row) => {
    if (seenLrns.has(row.lrn)) {
      duplicateLrns.push(row.lrn);
    }

    seenLrns.add(row.lrn);
  });

  if (duplicateLrns.length > 0) {
    throw new Error(`Duplicate LRN or Student ID in CSV: ${duplicateLrns.slice(0, 5).join(', ')}.`);
  }

  return parsedRows;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected CSV file.'));
    reader.readAsText(file);
  });
}

function downloadCsvTemplate() {
  const template = [
    studentCsvColumns.join(','),
    '2026-0001,Juan,Santos,Dela Cruz,Male,2015-06-01,Tibiao,09123456789,Maria Dela Cruz,09987654321',
  ].join('\n');
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'class-student-list-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function BulkStudentEnrollmentModal({
  isOpen,
  schoolYears,
  gradeLevels,
  sections,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(getEmptyForm);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [fileName, setFileName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(getEmptyForm());
      setParsedStudents([]);
      setFileName('');
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setValidationError('');
    setParsedStudents([]);
    setFileName(file.name);

    try {
      const text = await readFileAsText(file);
      setParsedStudents(parseStudentCsv(text));
    } catch (error) {
      setFileName('');
      setValidationError(error.message || 'Unable to parse CSV file.');
    }
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

    if (!formData.enrollment_date) {
      setValidationError('Enrollment date is required.');
      return;
    }

    if (parsedStudents.length === 0) {
      setValidationError('Please upload a valid class list CSV.');
      return;
    }

    await onSubmit({
      students: parsedStudents,
      enrollment: {
        ...formData,
        enrollment_status: 'enrolled',
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Import Class List</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add multiple students and enroll them into the selected class.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close bulk student import"
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

          <section>
            <h4 className="text-sm font-bold uppercase tracking-wide text-[#132a63]">
              Student List CSV
            </h4>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {fileName || 'Upload CSV class list'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Required columns: lrn, first_name, last_name, gender.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Download size={16} />
                    Template
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#132a63] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1f4597]">
                    <Upload size={16} />
                    Choose CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {parsedStudents.length > 0 ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {parsedStudents.length} students ready to import.
                </div>
              ) : null}
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
              className="rounded-md bg-[#f6bd2b] px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-[#d9a515] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isSaving ? 'Importing...' : 'Import and Enroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkStudentEnrollmentModal;
