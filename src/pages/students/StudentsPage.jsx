import { Download, Plus, Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import StudentFormModal from '../../components/forms/StudentFormModal.jsx';
import StudentTable from '../../components/tables/StudentTable.jsx';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StudentProfileModal from '../../components/ui/StudentProfileModal.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { formatStudentName } from '../../lib/studentName.js';

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

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function buildStudentSearchText(student) {
  return [
    student.lrn,
    formatStudentName(student),
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(' ');
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

function StudentsPage() {
  const { profile } = useAuth();
  const canAddStudent = ['admin', 'staff'].includes(profile?.role);
  const fileInputRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileStudent, setProfileStudent] = useState(null);
  const [pendingCsvStudents, setPendingCsvStudents] = useState([]);

  const fetchStudents = async () => {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('students')
      .select(
        'id, lrn, first_name, middle_name, last_name, gender, birthdate, address, contact_number, guardian_name, guardian_contact, created_at, updated_at',
      )
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).trim();

    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(buildStudentSearchText(student)).includes(normalizedSearch);
      const matchesGender =
        genderFilter === 'all' || student.gender === genderFilter;

      return matchesSearch && matchesGender;
    });
  }, [genderFilter, searchTerm, students]);

  const handleAddStudent = () => {
    if (!canAddStudent) {
      setErrorMessage('Only active staff users can add student records.');
      return;
    }

    setFormMode('add');
    setSelectedStudent(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleEditStudent = (student) => {
    setFormMode('edit');
    setSelectedStudent(student);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setSelectedStudent(null);
  };

  const checkDuplicateLrn = async (lrn, currentStudentId) => {
    let query = supabase.from('students').select('id').eq('lrn', lrn);

    if (currentStudentId) {
      query = query.neq('id', currentStudentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  };

  const handleSaveStudent = async (formData) => {
    if (formMode === 'add' && !canAddStudent) {
      setErrorMessage('Only active staff users can add student records.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const duplicateExists = await checkDuplicateLrn(
        formData.lrn,
        selectedStudent?.id,
      );

      if (duplicateExists) {
        throw new Error('A student with this LRN or Student ID already exists.');
      }

      if (formMode === 'edit' && selectedStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedStudent.id);

        if (error) {
          throw error;
        }

        setSuccessMessage('Student record updated successfully.');
      } else {
        const { error } = await supabase.from('students').insert(formData);

        if (error) {
          throw error;
        }

        setSuccessMessage('Student record added successfully.');
      }

      setIsFormOpen(false);
      setSelectedStudent(null);
      await fetchStudents();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save student record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!canAddStudent) {
      setErrorMessage('Only active staff users can import student records.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const text = await readFileAsText(file);
      const parsedStudents = parseStudentCsv(text);
      const lrns = parsedStudents.map((student) => student.lrn);
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('lrn')
        .in('lrn', lrns);

      if (error) {
        throw error;
      }

      const existingLrns = (existingStudents || []).map((student) => student.lrn);

      if (existingLrns.length > 0) {
        throw new Error(
          `These LRN or Student IDs already exist: ${existingLrns.slice(0, 5).join(', ')}.`,
        );
      }

      setPendingCsvStudents(parsedStudents);
    } catch (error) {
      setPendingCsvStudents([]);
      setErrorMessage(error.message || 'Unable to parse CSV file.');
    }
  };

  const handleImportCsvStudents = async () => {
    if (!canAddStudent) {
      setErrorMessage('Only active staff users can import student records.');
      return;
    }

    if (pendingCsvStudents.length === 0) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.from('students').insert(pendingCsvStudents);

      if (error) {
        throw error;
      }

      setSuccessMessage(`${pendingCsvStudents.length} student records imported successfully.`);
      setPendingCsvStudents([]);
      await fetchStudents();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to import student records.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const template = [
      studentCsvColumns.join(','),
      '2026-0001,Juan,Santos,Dela Cruz,Male,2015-06-01,Tibiao,09123456789,Maria Dela Cruz,09987654321',
    ].join('\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'student-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Students"
          description="Manage student records for OLGTPS."
        />

        {canAddStudent ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Upload size={16} />
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download size={16} />
              Template
            </button>
            <button
              type="button"
              onClick={handleAddStudent}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={16} />
              Add Student
            </button>
          </div>
        ) : null}
      </div>

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <span className="sr-only">Search student by name or LRN</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name or LRN"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="sr-only">Filter by gender</span>
            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading student records...
        </div>
      ) : (
        <StudentTable
          students={filteredStudents}
          onView={setProfileStudent}
          onEdit={handleEditStudent}
        />
      )}

      <StudentFormModal
        isOpen={isFormOpen}
        mode={formMode}
        student={selectedStudent}
        onClose={handleCloseForm}
        onSubmit={handleSaveStudent}
        isSaving={isSaving}
      />

      <StudentProfileModal
        student={profileStudent}
        onClose={() => setProfileStudent(null)}
      />

      <ConfirmationModal
        isOpen={pendingCsvStudents.length > 0}
        title="Import students?"
        message={`${pendingCsvStudents.length} student records are ready to import.`}
        confirmLabel="Import"
        isProcessing={isSaving}
        onConfirm={handleImportCsvStudents}
        onCancel={() => setPendingCsvStudents([])}
      />
    </div>
  );
}

export default StudentsPage;
