import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EnrollmentFormModal from '../../components/forms/EnrollmentFormModal.jsx';
import EnrollmentTable from '../../components/tables/EnrollmentTable.jsx';
import FeeAssessmentModal from '../../components/ui/FeeAssessmentModal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { supabase } from '../../lib/supabase.js';

const defaultFilters = {
  schoolYearId: 'all',
  gradeLevelId: 'all',
  sectionId: 'all',
  status: 'all',
};

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getStudentName(student) {
  if (!student) {
    return '';
  }

  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');
}

function buildEnrollmentSearchText(enrollment) {
  return [enrollment.students?.lrn, getStudentName(enrollment.students)]
    .filter(Boolean)
    .join(' ');
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
}

function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [assessmentEnrollment, setAssessmentEnrollment] = useState(null);

  const fetchEnrollmentData = async () => {
    setLoading(true);
    setErrorMessage('');

    const [
      enrollmentsResult,
      studentsResult,
      schoolYearsResult,
      gradeLevelsResult,
      sectionsResult,
      studentFeesResult,
    ] = await Promise.all([
      supabase
        .from('enrollments')
        .select(
          `
          id,
          student_id,
          school_year_id,
          grade_level_id,
          section_id,
          enrollment_status,
          enrollment_date,
          created_at,
          students (id, lrn, first_name, middle_name, last_name),
          school_years (id, school_year, status),
          grade_levels (id, grade_name, status),
          sections (id, section_name, grade_level_id, status)
        `,
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('students')
        .select('id, lrn, first_name, middle_name, last_name')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true }),
      supabase
        .from('school_years')
        .select('id, school_year, status')
        .order('school_year', { ascending: false }),
      supabase
        .from('grade_levels')
        .select('id, grade_name, status')
        .order('grade_name', { ascending: true }),
      supabase
        .from('sections')
        .select('id, section_name, grade_level_id, status')
        .order('section_name', { ascending: true }),
      supabase
        .from('student_fees')
        .select('id, enrollment_id, student_id, fee_id, amount, status, fees (id, fee_name, fee_type)'),
    ]);

    const queryError =
      enrollmentsResult.error ||
      studentsResult.error ||
      schoolYearsResult.error ||
      gradeLevelsResult.error ||
      sectionsResult.error ||
      studentFeesResult.error;

    if (queryError) {
      setErrorMessage(queryError.message);
      setEnrollments([]);
      setStudents([]);
      setSchoolYears([]);
      setGradeLevels([]);
      setSections([]);
      setStudentFees([]);
    } else {
      setEnrollments(enrollmentsResult.data || []);
      setStudents(studentsResult.data || []);
      setSchoolYears(schoolYearsResult.data || []);
      setGradeLevels(gradeLevelsResult.data || []);
      setSections(sectionsResult.data || []);
      setStudentFees((studentFeesResult.data || []).filter((studentFee) =>
        isEnrollmentFee(studentFee.fees),
      ));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEnrollmentData();
  }, []);

  const filteredSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          filters.gradeLevelId === 'all' || section.grade_level_id === filters.gradeLevelId,
      ),
    [filters.gradeLevelId, sections],
  );

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).trim();

    return enrollments.filter((enrollment) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(buildEnrollmentSearchText(enrollment)).includes(normalizedSearch);
      const matchesSchoolYear =
        filters.schoolYearId === 'all' ||
        enrollment.school_year_id === filters.schoolYearId;
      const matchesGradeLevel =
        filters.gradeLevelId === 'all' ||
        enrollment.grade_level_id === filters.gradeLevelId;
      const matchesSection =
        filters.sectionId === 'all' || enrollment.section_id === filters.sectionId;
      const matchesStatus =
        filters.status === 'all' || enrollment.enrollment_status === filters.status;

      return (
        matchesSearch &&
        matchesSchoolYear &&
        matchesGradeLevel &&
        matchesSection &&
        matchesStatus
      );
    });
  }, [enrollments, filters, searchTerm]);

  const assessmentTotals = useMemo(() => {
    const totals = new Map();

    studentFees.forEach((studentFee) => {
      totals.set(
        studentFee.enrollment_id,
        (totals.get(studentFee.enrollment_id) || 0) + Number(studentFee.amount || 0),
      );
    });

    return totals;
  }, [studentFees]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
      ...(name === 'gradeLevelId' ? { sectionId: 'all' } : {}),
    }));
  };

  const handleOpenAdd = () => {
    setFormMode('add');
    setSelectedEnrollment(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (enrollment) => {
    setFormMode('edit');
    setSelectedEnrollment(enrollment);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setSelectedEnrollment(null);
  };

  const hasDuplicateActiveEnrollment = async (formData) => {
    if (!['pending', 'enrolled'].includes(formData.enrollment_status)) {
      return false;
    }

    let query = supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', formData.student_id)
      .eq('school_year_id', formData.school_year_id)
      .in('enrollment_status', ['pending', 'enrolled'])
      .limit(1);

    if (selectedEnrollment?.id) {
      query = query.neq('id', selectedEnrollment.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  };

  const handleSaveEnrollment = async (formData) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const duplicateExists = await hasDuplicateActiveEnrollment(formData);

      if (duplicateExists) {
        throw new Error(
          'This student already has a pending or enrolled record for the selected school year.',
        );
      }

      const payload = {
        student_id: formData.student_id,
        school_year_id: formData.school_year_id,
        grade_level_id: formData.grade_level_id,
        section_id: formData.section_id,
        enrollment_status:
          formMode === 'edit' && selectedEnrollment
            ? formData.enrollment_status
            : 'pending',
        enrollment_date: formData.enrollment_date,
      };
      let enrollmentFeeToAssign = null;

      if (formMode === 'add') {
        const { data: activeFees, error: feeError } = await supabase
          .from('fees')
          .select('id, fee_name, fee_type, amount')
          .eq('grade_level_id', formData.grade_level_id)
          .eq('school_year_id', formData.school_year_id)
          .eq('status', 'active');

        if (feeError) {
          throw feeError;
        }

        enrollmentFeeToAssign = (activeFees || []).find(isEnrollmentFee);

        if (!enrollmentFeeToAssign) {
          throw new Error(
            'No active enrollment fee found for the selected grade level and school year.',
          );
        }
      }

      const { data: savedEnrollment, error } =
        formMode === 'edit' && selectedEnrollment
          ? await supabase
              .from('enrollments')
              .update(payload)
              .eq('id', selectedEnrollment.id)
              .select('id')
              .single()
          : await supabase.from('enrollments').insert(payload).select('id').single();

      if (error) {
        throw error;
      }

      if (formMode === 'add' && savedEnrollment?.id && enrollmentFeeToAssign) {
        const { error: studentFeeError } = await supabase.from('student_fees').insert({
          student_id: formData.student_id,
          enrollment_id: savedEnrollment.id,
          fee_id: enrollmentFeeToAssign.id,
          amount: enrollmentFeeToAssign.amount,
          status: 'unpaid',
        });

        if (studentFeeError) {
          await supabase.from('enrollments').delete().eq('id', savedEnrollment.id);
          throw studentFeeError;
        }
      }

      setSuccessMessage(
        formMode === 'edit'
          ? 'Enrollment record updated successfully.'
          : 'Enrollment added as pending. Pay the enrollment fee to mark the student as enrolled.',
      );
      setIsFormOpen(false);
      setSelectedEnrollment(null);
      await fetchEnrollmentData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save enrollment record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Enrollment"
          description="Enroll students and manage their school year, grade level, section, and enrollment status."
        />

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Enroll Student
        </button>
      </div>

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_repeat(4,minmax(150px,190px))]">
          <label className="relative block">
            <span className="sr-only">Search by student name or LRN</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student name or LRN"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <select
            name="schoolYearId"
            value={filters.schoolYearId}
            onChange={handleFilterChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter by school year"
          >
            <option value="all">All school years</option>
            {schoolYears.map((schoolYear) => (
              <option key={schoolYear.id} value={schoolYear.id}>
                {schoolYear.school_year}
              </option>
            ))}
          </select>

          <select
            name="gradeLevelId"
            value={filters.gradeLevelId}
            onChange={handleFilterChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter by grade level"
          >
            <option value="all">All grade levels</option>
            {gradeLevels.map((gradeLevel) => (
              <option key={gradeLevel.id} value={gradeLevel.id}>
                {gradeLevel.grade_name}
              </option>
            ))}
          </select>

          <select
            name="sectionId"
            value={filters.sectionId}
            onChange={handleFilterChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter by section"
          >
            <option value="all">All sections</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.section_name}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter by enrollment status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="enrolled">Enrolled</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading enrollment records...
        </div>
      ) : (
        <EnrollmentTable
          enrollments={filteredEnrollments}
          assessmentTotals={assessmentTotals}
          onAssessFees={setAssessmentEnrollment}
          onEdit={handleOpenEdit}
        />
      )}

      <EnrollmentFormModal
        isOpen={isFormOpen}
        mode={formMode}
        enrollment={selectedEnrollment}
        students={students}
        schoolYears={schoolYears}
        gradeLevels={gradeLevels}
        sections={sections}
        isSaving={isSaving}
        onClose={handleCloseForm}
        onSubmit={handleSaveEnrollment}
      />

      <FeeAssessmentModal
        enrollment={assessmentEnrollment}
        onClose={() => setAssessmentEnrollment(null)}
        onSaved={fetchEnrollmentData}
      />
    </div>
  );
}

export default EnrollmentPage;
