import { Edit, Plus, Power, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
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

function SetupSection({ title, description, actionLabel, canManage, onAdd, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={16} />
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function SchoolSetupPage() {
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

      const { error } =
        modalState.mode === 'edit'
          ? await supabase.from(tableName).update(payload).eq('id', modalState.record.id)
          : await supabase.from(tableName).insert(payload);

      if (error) {
        throw error;
      }

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
      const { error: deactivateError } = await supabase
        .from('school_years')
        .update({ status: 'inactive' })
        .neq('id', schoolYear.id);

      if (deactivateError) {
        throw deactivateError;
      }

      const { error: activateError } = await supabase
        .from('school_years')
        .update({ status: 'active' })
        .eq('id', schoolYear.id);

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

  const renderActions = (type, record) => {
    if (!canManage) {
      return null;
    }

    const isInactive = record.status === 'inactive';

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {type === 'schoolYear' && record.status !== 'active' ? (
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

        <button
          type="button"
          onClick={() => requestStatusChange(type, record, isInactive ? 'active' : 'inactive')}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Power size={14} />
          {isInactive ? 'Activate' : 'Deactivate'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Setup"
        description="Manage school years, grade levels, and sections used by OLGTPS records."
      />

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

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading school setup records...
        </div>
      ) : (
        <>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">School Year</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolYears.map((schoolYear) => (
                      <tr key={schoolYear.id}>
                        <td className="px-3 py-3 font-medium text-slate-900">
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Grade Level</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradeLevels.map((gradeLevel) => (
                      <tr key={gradeLevel.id}>
                        <td className="px-3 py-3 font-medium text-slate-900">
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Section</th>
                      <th className="px-3 py-3">Grade Level</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sections.map((section) => (
                      <tr key={section.id}>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {section.section_name}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
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
