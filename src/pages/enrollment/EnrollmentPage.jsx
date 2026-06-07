import { Plus, Search, Upload, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BulkClassAssignmentModal from '../../components/forms/BulkClassAssignmentModal.jsx';
import BulkStudentEnrollmentModal from '../../components/forms/BulkStudentEnrollmentModal.jsx';
import EnrollmentFormModal from '../../components/forms/EnrollmentFormModal.jsx';
import StudentEnrollmentFormModal from '../../components/forms/StudentEnrollmentFormModal.jsx';
import EnrollmentTable from '../../components/tables/EnrollmentTable.jsx';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import FeeAssessmentModal from '../../components/ui/FeeAssessmentModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { formatStudentName, getStudentSortKey } from '../../lib/studentName.js';

const defaultFilters = {
  schoolYearId: 'all',
  gradeLevelId: 'all',
  sectionId: 'all',
  status: 'all',
};

const UNASSIGNED_GRADE_LEVEL_FILTER = 'unassigned-grade-level';
const UNASSIGNED_SECTION_FILTER = 'unassigned-section';

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function buildEnrollmentSearchText(enrollment) {
  return [enrollment.students?.lrn, formatStudentName(enrollment.students)]
    .filter(Boolean)
    .join(' ');
}

function getEnrollmentTime(enrollment) {
  return new Date(enrollment.created_at || enrollment.enrollment_date || 0).getTime();
}

function EnrollmentPage({ graduatedOnly = false }) {
  const { profile } = useAuth();
  const canDeleteStudents = profile?.role === 'admin' && profile?.status === 'active';
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
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [isClassAssignmentOpen, setIsClassAssignmentOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [assessmentEnrollment, setAssessmentEnrollment] = useState(null);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);

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
      setStudentFees(studentFeesResult.data || []);
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
          filters.gradeLevelId === 'all' ||
          filters.gradeLevelId === UNASSIGNED_GRADE_LEVEL_FILTER ||
          section.grade_level_id === filters.gradeLevelId,
      ),
    [filters.gradeLevelId, sections],
  );

  const studentRows = useMemo(() => {
    const latestEnrollmentByStudentId = new Map();

    [...enrollments]
      .sort((firstEnrollment, secondEnrollment) =>
        getEnrollmentTime(secondEnrollment) - getEnrollmentTime(firstEnrollment),
      )
      .forEach((enrollment) => {
        if (enrollment.student_id && !latestEnrollmentByStudentId.has(enrollment.student_id)) {
          latestEnrollmentByStudentId.set(enrollment.student_id, enrollment);
        }
      });

    if (graduatedOnly) {
      return Array.from(latestEnrollmentByStudentId.values())
        .filter((enrollment) => enrollment.enrollment_status === 'graduated')
        .map((enrollment) => ({
          ...enrollment,
          isRosterOnly: false,
        }));
    }

    return students.flatMap((student) => {
      const enrollment = latestEnrollmentByStudentId.get(student.id);

      if (enrollment) {
        if (enrollment.enrollment_status === 'graduated') {
          return [];
        }

        return {
          ...enrollment,
          students: enrollment.students || student,
          isRosterOnly: false,
        };
      }

      return {
        id: `student-${student.id}`,
        student_id: student.id,
        students: student,
        school_year_id: '',
        grade_level_id: '',
        section_id: '',
        enrollment_status: 'not assigned',
        enrollment_date: '',
        school_years: null,
        grade_levels: null,
        sections: null,
        isRosterOnly: true,
      };
    });
  }, [enrollments, graduatedOnly, students]);

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).trim();

    return studentRows
      .filter((enrollment) => {
        const matchesSearch =
          !normalizedSearch ||
          normalizeText(buildEnrollmentSearchText(enrollment)).includes(normalizedSearch);
        const matchesSchoolYear =
          filters.schoolYearId === 'all' ||
          enrollment.school_year_id === filters.schoolYearId;
        const matchesGradeLevel =
          filters.gradeLevelId === 'all' ||
          (filters.gradeLevelId === UNASSIGNED_GRADE_LEVEL_FILTER
            ? !enrollment.grade_level_id
            : enrollment.grade_level_id === filters.gradeLevelId);
        const matchesSection =
          filters.sectionId === 'all' ||
          (filters.sectionId === UNASSIGNED_SECTION_FILTER
            ? !enrollment.section_id
            : enrollment.section_id === filters.sectionId);
        const matchesStatus =
          filters.status === 'all' || enrollment.enrollment_status === filters.status;

        return (
          matchesSearch &&
          matchesSchoolYear &&
          matchesGradeLevel &&
          matchesSection &&
          matchesStatus
        );
      })
      .sort((firstEnrollment, secondEnrollment) =>
        getStudentSortKey(firstEnrollment.students).localeCompare(
          getStudentSortKey(secondEnrollment.students),
        ),
      );
  }, [filters, searchTerm, studentRows]);

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
    setErrorMessage('');
    setSuccessMessage('');
    setIsStudentFormOpen(true);
  };

  const handleOpenBulkAdd = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsBulkFormOpen(true);
  };

  const handleOpenClassAssignment = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsClassAssignmentOpen(true);
  };

  const handleOpenEdit = (enrollment) => {
    setFormMode('edit');
    setSelectedEnrollment(enrollment);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const requestDeleteStudent = (enrollment) => {
    if (!canDeleteStudents) {
      setErrorMessage('Only active admin users can delete students.');
      return;
    }

    setPendingDeleteStudent(enrollment);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCloseForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setSelectedEnrollment(null);
  };

  const handleCloseStudentForm = () => {
    if (isSaving) {
      return;
    }

    setIsStudentFormOpen(false);
  };

  const handleCloseBulkForm = () => {
    if (isSaving) {
      return;
    }

    setIsBulkFormOpen(false);
  };

  const handleCloseClassAssignment = () => {
    if (isSaving) {
      return;
    }

    setIsClassAssignmentOpen(false);
  };

  const hasDuplicateActiveEnrollment = async (formData) => {
    if (!['pending', 'enrolled', 'graduated'].includes(formData.enrollment_status)) {
      return false;
    }

    let query = supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', formData.student_id)
      .eq('school_year_id', formData.school_year_id)
      .in('enrollment_status', ['pending', 'enrolled', 'graduated'])
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
          'This student already has an active or graduated record for the selected school year.',
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

      setSuccessMessage(
        formMode === 'edit'
          ? 'Enrollment record updated successfully.'
          : 'Enrollment record added successfully.',
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

  const handleSaveStudentEnrollment = async ({ student, enrollment }) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    let insertedStudentId = null;
    let insertedEnrollmentId = null;

    try {
      const { data: existingStudent, error: duplicateError } = await supabase
        .from('students')
        .select('id')
        .eq('lrn', student.lrn)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (existingStudent) {
        throw new Error('A student with this LRN or Student ID already exists.');
      }

      const { data: savedStudent, error: studentError } = await supabase
        .from('students')
        .insert(student)
        .select('id')
        .single();

      if (studentError) {
        throw studentError;
      }

      insertedStudentId = savedStudent.id;

      const enrollmentPayload = {
        ...enrollment,
        student_id: insertedStudentId,
      };

      const { data: savedEnrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert(enrollmentPayload)
        .select('id')
        .single();

      if (enrollmentError) {
        throw enrollmentError;
      }

      insertedEnrollmentId = savedEnrollment.id;

      const { data: activeFees, error: feeError } = await supabase
        .from('fees')
        .select('id, amount')
        .eq('school_year_id', enrollment.school_year_id)
        .eq('status', 'active')
        .or(`grade_level_id.eq.${enrollment.grade_level_id},grade_level_id.is.null`);

      if (feeError) {
        throw feeError;
      }

      if ((activeFees || []).length > 0) {
        const feePayload = activeFees.map((fee) => ({
          student_id: insertedStudentId,
          enrollment_id: insertedEnrollmentId,
          fee_id: fee.id,
          amount: fee.amount,
          status: 'unpaid',
        }));

        const { error: studentFeeError } = await supabase
          .from('student_fees')
          .insert(feePayload);

        if (studentFeeError) {
          throw studentFeeError;
        }
      }

      setSuccessMessage('Student added and automatically enrolled successfully.');
      setIsStudentFormOpen(false);
      await fetchEnrollmentData();
    } catch (error) {
      if (insertedEnrollmentId) {
        await supabase.from('enrollments').delete().eq('id', insertedEnrollmentId);
      }

      if (insertedStudentId) {
        await supabase.from('students').delete().eq('id', insertedStudentId);
      }

      setErrorMessage(error.message || 'Unable to add and enroll student.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBulkStudentEnrollment = async ({ students: bulkStudents, enrollment }) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    let insertedStudentIds = [];
    let insertedEnrollmentIds = [];

    try {
      const lrns = bulkStudents.map((student) => student.lrn);
      const { data: existingStudents, error: duplicateError } = await supabase
        .from('students')
        .select('lrn')
        .in('lrn', lrns);

      if (duplicateError) {
        throw duplicateError;
      }

      const existingLrns = (existingStudents || []).map((student) => student.lrn);

      if (existingLrns.length > 0) {
        throw new Error(
          `These LRN or Student IDs already exist: ${existingLrns.slice(0, 5).join(', ')}.`,
        );
      }

      const { data: savedStudents, error: studentError } = await supabase
        .from('students')
        .insert(bulkStudents)
        .select('id, lrn');

      if (studentError) {
        throw studentError;
      }

      insertedStudentIds = (savedStudents || []).map((student) => student.id);

      const studentIdByLrn = new Map(
        (savedStudents || []).map((student) => [student.lrn, student.id]),
      );

      const enrollmentPayload = bulkStudents.map((student) => ({
        ...enrollment,
        student_id: studentIdByLrn.get(student.lrn),
      }));

      const { data: savedEnrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert(enrollmentPayload)
        .select('id, student_id');

      if (enrollmentError) {
        throw enrollmentError;
      }

      insertedEnrollmentIds = (savedEnrollments || []).map((savedEnrollment) => savedEnrollment.id);

      const { data: activeFees, error: feeError } = await supabase
        .from('fees')
        .select('id, amount')
        .eq('school_year_id', enrollment.school_year_id)
        .eq('status', 'active')
        .or(`grade_level_id.eq.${enrollment.grade_level_id},grade_level_id.is.null`);

      if (feeError) {
        throw feeError;
      }

      if ((activeFees || []).length > 0 && (savedEnrollments || []).length > 0) {
        const feePayload = savedEnrollments.flatMap((savedEnrollment) =>
          activeFees.map((fee) => ({
            student_id: savedEnrollment.student_id,
            enrollment_id: savedEnrollment.id,
            fee_id: fee.id,
            amount: fee.amount,
            status: 'unpaid',
          })),
        );

        const { error: studentFeeError } = await supabase
          .from('student_fees')
          .insert(feePayload);

        if (studentFeeError) {
          throw studentFeeError;
        }
      }

      setSuccessMessage(`${bulkStudents.length} students added and enrolled successfully.`);
      setIsBulkFormOpen(false);
      await fetchEnrollmentData();
    } catch (error) {
      if (insertedEnrollmentIds.length > 0) {
        await supabase.from('student_fees').delete().in('enrollment_id', insertedEnrollmentIds);
        await supabase.from('enrollments').delete().in('id', insertedEnrollmentIds);
      }

      if (insertedStudentIds.length > 0) {
        await supabase.from('students').delete().in('id', insertedStudentIds);
      }

      setErrorMessage(error.message || 'Unable to import and enroll class list.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignClassToGrade = async (assignment) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: matchingEnrollments, error: fetchError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('school_year_id', assignment.school_year_id)
        .eq('grade_level_id', assignment.grade_level_id)
        .is('section_id', null)
        .in('enrollment_status', ['pending', 'enrolled']);

      if (fetchError) {
        throw fetchError;
      }

      const enrollmentIds = (matchingEnrollments || []).map((enrollment) => enrollment.id);

      if (enrollmentIds.length === 0) {
        throw new Error('No pending or enrolled students without a class were found for the selected grade level.');
      }

      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ section_id: assignment.section_id })
        .in('id', enrollmentIds);

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage(`${enrollmentIds.length} unassigned students assigned to the selected class.`);
      setIsClassAssignmentOpen(false);
      await fetchEnrollmentData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign class.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteStudent = async () => {
    const studentId = pendingDeleteStudent?.student_id || pendingDeleteStudent?.students?.id;

    if (!studentId) {
      setErrorMessage('Unable to identify the student to delete.');
      return;
    }

    if (!canDeleteStudents) {
      setErrorMessage('Only active admin users can delete students.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: studentEnrollments, error: enrollmentFetchError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId);

      if (enrollmentFetchError) {
        throw enrollmentFetchError;
      }

      const enrollmentIds = (studentEnrollments || []).map((enrollment) => enrollment.id);

      const { data: studentPayments, error: paymentFetchError } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId);

      if (paymentFetchError) {
        throw paymentFetchError;
      }

      const paymentIds = (studentPayments || []).map((payment) => payment.id);

      if (paymentIds.length > 0) {
        const { error: paymentDetailsError } = await supabase
          .from('payment_details')
          .delete()
          .in('payment_id', paymentIds);

        if (paymentDetailsError) {
          throw paymentDetailsError;
        }
      }

      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('student_id', studentId);

      if (paymentsError) {
        throw paymentsError;
      }

      const { error: studentFeesError } = await supabase
        .from('student_fees')
        .delete()
        .eq('student_id', studentId);

      if (studentFeesError) {
        throw studentFeesError;
      }

      if (enrollmentIds.length > 0) {
        const { error: enrollmentsError } = await supabase
          .from('enrollments')
          .delete()
          .in('id', enrollmentIds);

        if (enrollmentsError) {
          throw enrollmentsError;
        }
      }

      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (studentError) {
        throw studentError;
      }

      setSuccessMessage('Student deleted successfully.');
      setPendingDeleteStudent(null);
      await fetchEnrollmentData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete student.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        title={graduatedOnly ? 'Graduated Students' : 'Students'}
        description={
          graduatedOnly
            ? 'View students who completed Grade VI and were marked graduated during promotion.'
            : 'Add students, automatically enroll them, and filter the roster by school year, grade level, and class section.'
        }
        actions={
          !graduatedOnly ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenClassAssignment}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-slate-100"
              >
                <UsersRound size={16} />
                Assign Unassigned Students
              </button>
              <button
                type="button"
                onClick={handleOpenBulkAdd}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-slate-100"
              >
                <Upload size={16} />
                Import Class List
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-[#f6bd2b] px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-[#d9a515]"
              >
                <Plus size={16} />
                Add Student
              </button>
            </div>
          ) : null
        }
      />

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className={[
            'grid gap-3',
            graduatedOnly
              ? 'lg:grid-cols-[1fr_repeat(3,minmax(150px,190px))]'
              : 'lg:grid-cols-[1fr_repeat(4,minmax(150px,190px))]',
          ].join(' ')}
        >
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
            <option value={UNASSIGNED_GRADE_LEVEL_FILTER}>No assigned grade level</option>
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
            aria-label="Filter by class section"
          >
            <option value="all">All classes</option>
            <option value={UNASSIGNED_SECTION_FILTER}>No assigned section</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.section_name}
              </option>
            ))}
          </select>

          {!graduatedOnly ? (
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
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading student class records...
        </div>
      ) : (
        <EnrollmentTable
          enrollments={filteredEnrollments}
          assessmentTotals={assessmentTotals}
          canDelete={canDeleteStudents}
          isSaving={isSaving}
          onAssessFees={setAssessmentEnrollment}
          onDelete={requestDeleteStudent}
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

      <StudentEnrollmentFormModal
        isOpen={isStudentFormOpen}
        schoolYears={schoolYears}
        gradeLevels={gradeLevels}
        sections={sections}
        isSaving={isSaving}
        onClose={handleCloseStudentForm}
        onSubmit={handleSaveStudentEnrollment}
      />

      <BulkStudentEnrollmentModal
        isOpen={isBulkFormOpen}
        schoolYears={schoolYears}
        gradeLevels={gradeLevels}
        sections={sections}
        isSaving={isSaving}
        onClose={handleCloseBulkForm}
        onSubmit={handleSaveBulkStudentEnrollment}
      />

      <BulkClassAssignmentModal
        isOpen={isClassAssignmentOpen}
        initialValues={filters}
        schoolYears={schoolYears}
        gradeLevels={gradeLevels}
        sections={sections}
        isSaving={isSaving}
        onClose={handleCloseClassAssignment}
        onSubmit={handleAssignClassToGrade}
      />

      <FeeAssessmentModal
        enrollment={assessmentEnrollment}
        onClose={() => setAssessmentEnrollment(null)}
        onSaved={fetchEnrollmentData}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingDeleteStudent)}
        title="Delete student?"
        message={`This will permanently delete ${formatStudentName(pendingDeleteStudent?.students) || 'this student'} and all related enrollments, fees, and payment records.`}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={isSaving}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setPendingDeleteStudent(null)}
      />
    </div>
  );
}

export default EnrollmentPage;
