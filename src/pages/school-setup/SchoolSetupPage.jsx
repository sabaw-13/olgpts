import { getSchoolDate } from '../../lib/date.js';
import { ArrowUpRight, Edit, Plus, Power, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const initialForm = {
  school_year: '',
  grade_name: '',
  section_name: '',
  grade_level_id: '',
  status: 'active',
};

const initialPromotionForm = {
  source_school_year_id: '',
  target_school_year_id: '',
  enrollment_date: getSchoolDate(),
};

function StatusBadge({ status }) {
  const isActive = status === 'active';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {status || 'active'}
    </span>
  );
}

function SetupModal({
  isOpen,
  type,
  mode,
  formData,
  gradeLevels,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!isOpen) {
    return null;
  }

  const titles = {
    schoolYear: mode === 'edit' ? 'Edit School Year' : 'Add School Year',
    gradeLevel: mode === 'edit' ? 'Edit Grade Level' : 'Add Grade Level',
    section: mode === 'edit' ? 'Edit Section' : 'Add Section',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{titles[type]}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Maintain basic school setup records.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close setup form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          {type === 'schoolYear' ? (
            <label className="block text-sm font-medium text-slate-700">
              School Year
              <input
                type="text"
                name="school_year"
                value={formData.school_year}
                onChange={onChange}
                required
                placeholder="Example: 2026-2027"
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          ) : null}

          {type === 'gradeLevel' ? (
            <label className="block text-sm font-medium text-slate-700">
              Grade Level
              <input
                type="text"
                name="grade_name"
                value={formData.grade_name}
                onChange={onChange}
                required
                placeholder="Example: Grade 1"
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          ) : null}

          {type === 'section' ? (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Section Name
                <input
                  type="text"
                  name="section_name"
                  value={formData.section_name}
                  onChange={onChange}
                  required
                  placeholder="Example: St. Matthew"
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Grade Level
                <select
                  name="grade_level_id"
                  value={formData.grade_level_id}
                  onChange={onChange}
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
            </>
          ) : null}

          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              value={formData.status}
              onChange={onChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PromotionModal({
  isOpen,
  schoolYears,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(initialPromotionForm);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const activeSchoolYear = schoolYears.find((schoolYear) => schoolYear.status === 'active');

      setFormData({
        ...initialPromotionForm,
        enrollment_date: getSchoolDate(),
        source_school_year_id: activeSchoolYear?.id || '',
      });
      setValidationError('');
    }
  }, [isOpen, schoolYears]);

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

    if (!formData.source_school_year_id) {
      setValidationError('Select the school year to promote from.');
      return;
    }

    if (!formData.target_school_year_id) {
      setValidationError('Select the school year to promote into.');
      return;
    }

    if (formData.source_school_year_id === formData.target_school_year_id) {
      setValidationError('Source and target school year must be different.');
      return;
    }

    if (!formData.enrollment_date) {
      setValidationError('Promotion date is required.');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Promote Students</h3>
            <p className="mt-1 text-sm text-slate-500">
              Move students to the next grade level for a new school year. Grade 6 students will be marked graduated.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close promotion form"
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
              From School Year
              <select
                name="source_school_year_id"
                value={formData.source_school_year_id}
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
              To School Year
              <select
                name="target_school_year_id"
                value={formData.target_school_year_id}
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

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Promotion Date
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

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Students with remaining balances will be promoted with pending status. Grade 6 students will be marked graduated.
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f5bb2e] px-4 py-2 text-sm font-bold text-[#132a63] hover:bg-[#ffd46a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              <ArrowUpRight size={16} />
              {isSaving ? 'Promoting...' : 'Promote Students'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetupSection({ title, description, actionLabel, canManage, onAdd, children }) {
  return (
    <section className="flex min-w-0 min-h-0 max-h-[calc(100vh-15rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm 2xl:max-h-[calc(100vh-13rem)]">
      <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
            aria-label={actionLabel}
            title={actionLabel}
          >
            <Plus size={16} />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 w-full flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="m-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function SchoolSetupPage({ tabs = null }) {
  const { profile } = useAuth();
  const canManage = ['admin', 'staff'].includes(profile?.role);
  const [schoolYears, setSchoolYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'schoolYear',
    mode: 'add',
    record: null,
  });
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  const gradeLevelNames = useMemo(
    () => new Map(gradeLevels.map((gradeLevel) => [gradeLevel.id, gradeLevel.grade_name])),
    [gradeLevels],
  );

  const fetchSetupData = async () => {
    setLoading(true);
    setErrorMessage('');

    const [schoolYearsResult, gradeLevelsResult, sectionsResult] = await Promise.all([
      supabase.from('school_years').select('id, school_year, status, created_at').order('school_year'),
      supabase.from('grade_levels').select('id, grade_name, status, created_at').order('grade_name'),
      supabase
        .from('sections')
        .select('id, section_name, grade_level_id, status, created_at')
        .order('section_name'),
    ]);

    const queryError =
      schoolYearsResult.error || gradeLevelsResult.error || sectionsResult.error;

    if (queryError) {
      setErrorMessage(queryError.message);
      setSchoolYears([]);
      setGradeLevels([]);
      setSections([]);
    } else {
      setSchoolYears(schoolYearsResult.data || []);
      setGradeLevels(gradeLevelsResult.data || []);
      setSections(sectionsResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSetupData();
  }, []);

  const openAddModal = (type) => {
    setSuccessMessage('');
    setErrorMessage('');
    setFormData(initialForm);
    setModalState({ isOpen: true, type, mode: 'add', record: null });
  };

  const openEditModal = (type, record) => {
    setSuccessMessage('');
    setErrorMessage('');
    setFormData({
      school_year: record.school_year || '',
      grade_name: record.grade_name || '',
      section_name: record.section_name || '',
      grade_level_id: record.grade_level_id || '',
      status: record.status || 'active',
    });
    setModalState({ isOpen: true, type, mode: 'edit', record });
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setModalState((currentState) => ({ ...currentState, isOpen: false }));
  };

  const openPromotionModal = () => {
    if (!canManage) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');
    setIsPromotionOpen(true);
  };

  const closePromotionModal = () => {
    if (isSaving) {
      return;
    }

    setIsPromotionOpen(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const getTableName = (type) => {
    if (type === 'schoolYear') return 'school_years';
    if (type === 'gradeLevel') return 'grade_levels';
    return 'sections';
  };

  const getPayload = (type) => {
    if (type === 'schoolYear') {
      return {
        school_year: formData.school_year.trim(),
        status: formData.status,
      };
    }

    if (type === 'gradeLevel') {
      return {
        grade_name: formData.grade_name.trim(),
        status: formData.status,
      };
    }

    return {
      section_name: formData.section_name.trim(),
      grade_level_id: formData.grade_level_id,
      status: formData.status,
    };
  };

  const getRecordLabel = (type, record) => {
    if (type === 'schoolYear') return record.school_year;
    if (type === 'gradeLevel') return record.grade_name;
    return record.section_name;
  };

  const validateForm = () => {
    if (modalState.type === 'schoolYear' && !formData.school_year.trim()) {
      return 'School year is required.';
    }

    if (modalState.type === 'gradeLevel' && !formData.grade_name.trim()) {
      return 'Grade level name is required.';
    }

    if (modalState.type === 'section') {
      if (!formData.section_name.trim()) {
        return 'Section name is required.';
      }

      if (!formData.grade_level_id) {
        return 'Please assign the section to a grade level.';
      }
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setErrorMessage('Only active staff users can manage school setup records.');
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const tableName = getTableName(modalState.type);
      const payload = getPayload(modalState.type);

      const { error } = modalState.type === 'schoolYear'
        ? await supabase.rpc('save_school_year', {
            p_id: modalState.mode === 'edit' ? modalState.record.id : null,
            p_school_year: payload.school_year,
            p_status: payload.status,
          })
        : modalState.mode === 'edit'
          ? await supabase.from(tableName).update(payload).eq('id', modalState.record.id)
          : await supabase.from(tableName).insert(payload);
      if (error) throw error;

      setSuccessMessage('School setup record saved successfully.');
      setModalState((currentState) => ({ ...currentState, isOpen: false }));
      await fetchSetupData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save school setup record.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateRecordStatus = async (type, record, status) => {
    if (!canManage) {
      setErrorMessage('Only active staff users can manage school setup records.');
      return;
    }

    // Only one school year can be active, so activating one goes through the same path as Set Active.
    if (type === 'schoolYear' && status === 'active') {
      await setActiveSchoolYear(record);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from(getTableName(type))
        .update({ status })
        .eq('id', record.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(`Record marked as ${status}.`);
      await fetchSetupData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update record status.');
    } finally {
      setIsSaving(false);
    }
  };

  const setActiveSchoolYear = async (schoolYear) => {
    if (!canManage) {
      setErrorMessage('Only active staff users can manage school setup records.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error: activateError } = await supabase.rpc('activate_school_year', {
        p_id: schoolYear.id,
      });

      if (activateError) {
        throw activateError;
      }

      setSuccessMessage(`${schoolYear.school_year} is now the active school year.`);
      await fetchSetupData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to set active school year.');
    } finally {
      setIsSaving(false);
    }
  };

  const promoteStudents = async (promotionData) => {
    if (!canManage) {
      setErrorMessage('Only active staff users can promote students.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.rpc('promote_students', {
        p_source_school_year_id: promotionData.source_school_year_id,
        p_target_school_year_id: promotionData.target_school_year_id,
        p_enrollment_date: promotionData.enrollment_date,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          throw new Error('Run supabase-promotion-integrity-migration.sql in Supabase before promoting students.');
        }
        throw error;
      }
      setSuccessMessage(`${data.promoted} students promoted. ${data.graduated} marked graduated. ${data.pending} marked pending due to remaining balances. ${data.skipped} skipped.`);
      setIsPromotionOpen(false);
      await fetchSetupData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to promote students.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestStatusChange = (type, record, status) => {
    setPendingConfirmation({
      action: 'status',
      type,
      record,
      status,
      label: getRecordLabel(type, record),
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const requestActiveSchoolYear = (schoolYear) => {
    setPendingConfirmation({
      action: 'activeSchoolYear',
      type: 'schoolYear',
      record: schoolYear,
      status: 'active',
      label: schoolYear.school_year,
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const confirmPendingAction = async () => {
    if (!pendingConfirmation) {
      return;
    }

    if (pendingConfirmation.action === 'activeSchoolYear') {
      await setActiveSchoolYear(pendingConfirmation.record);
    } else {
      await updateRecordStatus(
        pendingConfirmation.type,
        pendingConfirmation.record,
        pendingConfirmation.status,
      );
    }

    setPendingConfirmation(null);
  };

  const activeSchoolYearCount = schoolYears.filter(
    (schoolYear) => schoolYear.status === 'active',
  ).length;

  const renderActions = (type, record) => {
    if (!canManage) {
      return null;
    }

    const isInactive = record.status === 'inactive';

    return (
      <div className="flex min-w-0 flex-wrap justify-end gap-2">
        {type === 'schoolYear' && (record.status !== 'active' || activeSchoolYearCount > 1) ? (
          <button
            type="button"
            onClick={() => requestActiveSchoolYear(record)}
            disabled={isSaving}
            className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Set Active
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => openEditModal(type, record)}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Edit size={14} />
          Edit
        </button>

        {type !== 'schoolYear' || !isInactive ? <button
          type="button"
          onClick={() => requestStatusChange(type, record, isInactive ? 'active' : 'inactive')}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Power size={14} />
          {isInactive ? 'Activate' : 'Deactivate'}
        </button> : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        title="Settings"
        description="Manage school years, grade levels, and sections used by OLGTPS records."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={openPromotionModal}
              disabled={isSaving || loading}
              className="inline-flex items-center gap-2 rounded-md bg-[#f5bb2e] px-3 py-2 text-xs font-bold text-[#132a63] hover:bg-[#ffd46a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              <ArrowUpRight size={15} />
              Promote Students
            </button>
          ) : null
        }
      />

      {tabs}

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading school setup records...
        </div>
      ) : (
        <>
          <div className="grid min-h-0 gap-6 2xl:grid-cols-3">
            <SetupSection
              title="School Years"
              description="Control the active school year used by setup records."
              actionLabel="Add School Year"
              canManage={canManage}
              onAdd={() => openAddModal('schoolYear')}
            >
              {schoolYears.length === 0 ? (
                <EmptyState message="No school years found." />
              ) : (
                <div className="h-full w-full overflow-y-auto">
                  <table className="school-setup-table w-full min-w-0 table-fixed divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">School Year</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="w-[48%] px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolYears.map((schoolYear) => (
                        <tr key={schoolYear.id}>
                          <td className="whitespace-normal break-words px-3 py-3 font-medium text-slate-900">
                            {schoolYear.school_year}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={schoolYear.status} />
                          </td>
                          <td className="px-3 py-3">
                            {renderActions('schoolYear', schoolYear)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SetupSection>

            <SetupSection
              title="Grade Levels"
              description="Maintain the grade levels available for students."
              actionLabel="Add Grade Level"
              canManage={canManage}
              onAdd={() => openAddModal('gradeLevel')}
            >
              {gradeLevels.length === 0 ? (
                <EmptyState message="No grade levels found." />
              ) : (
                <div className="h-full w-full overflow-y-auto">
                  <table className="school-setup-table w-full min-w-0 table-fixed divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Grade Level</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="w-[48%] px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeLevels.map((gradeLevel) => (
                        <tr key={gradeLevel.id}>
                          <td className="whitespace-normal break-words px-3 py-3 font-medium text-slate-900">
                            {gradeLevel.grade_name}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={gradeLevel.status} />
                          </td>
                          <td className="px-3 py-3">
                            {renderActions('gradeLevel', gradeLevel)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SetupSection>

            <SetupSection
              title="Sections"
              description="Assign sections to their corresponding grade levels."
              actionLabel="Add Section"
              canManage={canManage}
              onAdd={() => openAddModal('section')}
            >
              {sections.length === 0 ? (
                <EmptyState message="No sections found." />
              ) : (
                <div className="h-full w-full overflow-y-auto">
                  <table className="school-setup-table w-full min-w-0 table-fixed divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Section</th>
                        <th className="px-3 py-3">Grade Level</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="w-[48%] px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sections.map((section) => (
                        <tr key={section.id}>
                          <td className="whitespace-normal break-words px-3 py-3 font-medium text-slate-900">
                            {section.section_name}
                          </td>
                          <td className="whitespace-normal break-words px-3 py-3 text-slate-600">
                            {gradeLevelNames.get(section.grade_level_id) || 'Not assigned'}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={section.status} />
                          </td>
                          <td className="px-3 py-3">
                            {renderActions('section', section)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SetupSection>
          </div>
        </>
      )}

      <SetupModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        mode={modalState.mode}
        formData={formData}
        gradeLevels={gradeLevels}
        isSaving={isSaving}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <PromotionModal
        isOpen={isPromotionOpen}
        schoolYears={schoolYears}
        isSaving={isSaving}
        onClose={closePromotionModal}
        onSubmit={promoteStudents}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingConfirmation)}
        title={
          pendingConfirmation?.action === 'activeSchoolYear'
            ? 'Set active school year?'
            : `${pendingConfirmation?.status === 'active' ? 'Activate' : 'Deactivate'} record?`
        }
        message={
          pendingConfirmation?.action === 'activeSchoolYear'
            ? `This will make "${pendingConfirmation?.label || 'this school year'}" the active school year and mark the others inactive.`
            : `This will mark "${pendingConfirmation?.label || 'this record'}" as ${pendingConfirmation?.status}.`
        }
        confirmLabel={
          pendingConfirmation?.action === 'activeSchoolYear'
            ? 'Set Active'
            : pendingConfirmation?.status === 'active'
              ? 'Activate'
              : 'Deactivate'
        }
        variant={pendingConfirmation?.status === 'inactive' ? 'danger' : 'default'}
        isProcessing={isSaving}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
}

export default SchoolSetupPage;
