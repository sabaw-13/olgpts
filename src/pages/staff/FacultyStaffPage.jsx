import { Edit, Plus, Power, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const emptyForm = {
  full_name: '',
  staff_type: 'teaching',
  position: '',
  advisory_section_id: '',
  contact_number: '',
  email: '',
  status: 'active',
};

const staffTypeLabels = {
  teaching: 'Teaching',
  non_teaching: 'Non-teaching',
};

const positionSuggestions = {
  teaching: ['Class Adviser', 'Subject Teacher', 'Principal', 'Coordinator'],
  non_teaching: ['Registrar', 'Cashier', 'Guidance Counselor', 'Librarian', 'Secretary', 'Maintenance', 'Security Guard'],
};

const inputClassName =
  'mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

function isMissingTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /faculty_staff/.test(error?.message || '')
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'active';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {status || 'inactive'}
    </span>
  );
}

function FacultyFormModal({ isOpen, mode, formData, sectionOptions, isSaving, onChange, onClose, onSubmit }) {
  if (!isOpen) {
    return null;
  }

  const isTeaching = formData.staff_type === 'teaching';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {mode === 'edit' ? 'Edit faculty or staff' : 'Add faculty or staff'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              This is a school personnel record. It does not create a login account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close faculty and staff form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={onChange}
              required
              className={inputClassName}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Type
              <select name="staff_type" value={formData.staff_type} onChange={onChange} className={inputClassName}>
                <option value="teaching">Teaching</option>
                <option value="non_teaching">Non-teaching</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Position
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={onChange}
                list="faculty-position-suggestions"
                placeholder={isTeaching ? 'e.g. Class Adviser' : 'e.g. Registrar'}
                className={inputClassName}
              />
              <datalist id="faculty-position-suggestions">
                {positionSuggestions[formData.staff_type].map((position) => (
                  <option key={position} value={position} />
                ))}
              </datalist>
            </label>
          </div>

          {isTeaching ? (
            <label className="block text-sm font-medium text-slate-700">
              Advisory class
              <select
                name="advisory_section_id"
                value={formData.advisory_section_id}
                onChange={onChange}
                className={inputClassName}
              >
                <option value="">No advisory class</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Contact number
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className={inputClassName}
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700 sm:w-1/2 sm:pr-2">
            Status
            <select name="status" value={formData.status} onChange={onChange} className={inputClassName}>
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
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add to directory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FacultyStaffPage() {
  const { profile } = useAuth();
  const canManage = ['admin', 'staff'].includes(profile?.role) && profile?.status === 'active';
  const [people, setPeople] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', record: null });
  const [formData, setFormData] = useState(emptyForm);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const fetchDirectory = async () => {
    setLoading(true);
    setErrorMessage('');

    const [peopleResult, sectionsResult, gradeLevelsResult] = await Promise.all([
      supabase
        .from('faculty_staff')
        .select('id, full_name, staff_type, position, advisory_section_id, contact_number, email, status')
        .order('full_name'),
      supabase.from('sections').select('id, section_name, grade_level_id, status').order('section_name'),
      supabase.from('grade_levels').select('id, grade_name').order('grade_name'),
    ]);

    if (peopleResult.error) {
      if (isMissingTableError(peopleResult.error)) {
        setSetupRequired(true);
      } else {
        setErrorMessage(peopleResult.error.message);
      }
      setPeople([]);
    } else {
      setSetupRequired(false);
      setPeople(peopleResult.data || []);
    }

    setSections(sectionsResult.data || []);
    setGradeLevels(gradeLevelsResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const sectionLabels = useMemo(() => {
    const gradeNames = new Map(gradeLevels.map((gradeLevel) => [gradeLevel.id, gradeLevel.grade_name]));

    return new Map(
      sections.map((section) => {
        const gradeName = gradeNames.get(section.grade_level_id);

        return [section.id, gradeName ? `${gradeName} – ${section.section_name}` : section.section_name];
      }),
    );
  }, [sections, gradeLevels]);

  const sectionOptions = useMemo(
    () =>
      sections
        .filter(
          (section) =>
            section.status !== 'inactive' || section.id === formData.advisory_section_id,
        )
        .map((section) => ({ id: section.id, label: sectionLabels.get(section.id) || 'Unnamed section' }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [sections, sectionLabels, formData.advisory_section_id],
  );

  const typeCounts = useMemo(() => {
    const statusMatches = people.filter(
      (person) => statusFilter === 'all' || person.status === statusFilter,
    );

    return {
      all: statusMatches.length,
      teaching: statusMatches.filter((person) => person.staff_type === 'teaching').length,
      non_teaching: statusMatches.filter((person) => person.staff_type === 'non_teaching').length,
    };
  }, [people, statusFilter]);

  const visiblePeople = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return people.filter((person) => {
      if (statusFilter !== 'all' && person.status !== statusFilter) return false;
      if (typeFilter !== 'all' && person.staff_type !== typeFilter) return false;
      if (!query) return true;

      return [person.full_name, person.position, person.email, sectionLabels.get(person.advisory_section_id)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [people, searchTerm, typeFilter, statusFilter, sectionLabels]);

  const openAddModal = () => {
    setFormData(emptyForm);
    setErrorMessage('');
    setSuccessMessage('');
    setModalState({ isOpen: true, mode: 'add', record: null });
  };

  const openEditModal = (person) => {
    setFormData({
      full_name: person.full_name || '',
      staff_type: person.staff_type || 'teaching',
      position: person.position || '',
      advisory_section_id: person.advisory_section_id || '',
      contact_number: person.contact_number || '',
      email: person.email || '',
      status: person.status || 'active',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setModalState({ isOpen: true, mode: 'edit', record: person });
  };

  const closeModal = () => {
    if (!isSaving) {
      setModalState((currentState) => ({ ...currentState, isOpen: false }));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
      ...(name === 'staff_type' && value !== 'teaching' ? { advisory_section_id: '' } : {}),
    }));
  };

  const getSaveErrorMessage = (error) => {
    if (error?.code === '23505') {
      return 'That class already has an active adviser. Choose another class or update the current adviser first.';
    }

    return error?.message || 'Unable to save this record.';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.full_name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      full_name: formData.full_name.trim(),
      staff_type: formData.staff_type,
      position: formData.position.trim() || null,
      advisory_section_id:
        formData.staff_type === 'teaching' ? formData.advisory_section_id || null : null,
      contact_number: formData.contact_number.trim() || null,
      email: formData.email.trim() || null,
      status: formData.status,
    };

    try {
      const { error } =
        modalState.mode === 'edit'
          ? await supabase.from('faculty_staff').update(payload).eq('id', modalState.record.id)
          : await supabase.from('faculty_staff').insert(payload);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        modalState.mode === 'edit'
          ? `${payload.full_name} updated.`
          : `${payload.full_name} added to the directory.`,
      );
      setModalState((currentState) => ({ ...currentState, isOpen: false }));
      await fetchDirectory();
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) {
      return;
    }

    const { person, nextStatus } = pendingStatusChange;

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('faculty_staff')
        .update({ status: nextStatus })
        .eq('id', person.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(`${person.full_name} marked as ${nextStatus}.`);
      await fetchDirectory();
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
      setPendingStatusChange(null);
    }
  };

  const typeTabs = [
    { value: 'all', label: 'All' },
    { value: 'teaching', label: 'Teaching' },
    { value: 'non_teaching', label: 'Non-teaching' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        title="Faculty and Staff"
        description="The school's teachers and non-teaching personnel, their positions, and advisory classes."
        actions={
          canManage && !setupRequired ? (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={16} />
              Add faculty or staff
            </button>
          ) : null
        }
      />

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading faculty and staff...
        </div>
      ) : setupRequired ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
          The faculty and staff directory isn't set up yet. Run{' '}
          <span className="font-semibold text-[#132a63]">supabase-faculty-staff-migration.sql</span>{' '}
          in the Supabase SQL editor, then reload this page.
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1" role="group" aria-label="Filter by type">
              {typeTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setTypeFilter(tab.value)}
                  aria-pressed={typeFilter === tab.value}
                  className={[
                    'rounded-md px-3 py-1.5 text-sm font-semibold',
                    typeFilter === tab.value
                      ? 'bg-white text-[#132a63] shadow-sm'
                      : 'text-slate-500 hover:text-[#132a63]',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className="ml-1.5 tabular-nums text-slate-400">{typeCounts[tab.value]}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block sm:w-64">
                <span className="sr-only">Search faculty and staff</span>
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search name, position, or class"
                  className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All statuses</option>
              </select>
            </div>
          </div>

          {visiblePeople.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              {people.length === 0
                ? 'No faculty or staff yet. Add the first person to start the directory.'
                : 'No one matches these filters.'}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Advisory class</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePeople.map((person) => {
                    const nextStatus = person.status === 'active' ? 'inactive' : 'active';

                    return (
                      <tr key={person.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{person.full_name}</p>
                          <p className="text-xs text-slate-500">{staffTypeLabels[person.staff_type]}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{person.position || '–'}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {sectionLabels.get(person.advisory_section_id) || '–'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {person.contact_number || person.email ? (
                            <>
                              {person.contact_number ? <p>{person.contact_number}</p> : null}
                              {person.email ? <p className="text-xs">{person.email}</p> : null}
                            </>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={person.status} />
                        </td>
                        {canManage ? (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(person)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStatusChange({ person, nextStatus })}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Power size={14} />
                                {nextStatus === 'active' ? 'Activate' : 'Deactivate'}
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <FacultyFormModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        formData={formData}
        sectionOptions={sectionOptions}
        isSaving={isSaving}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingStatusChange)}
        title={`${pendingStatusChange?.nextStatus === 'active' ? 'Activate' : 'Deactivate'} ${pendingStatusChange?.person?.full_name || 'this person'}?`}
        message={
          pendingStatusChange?.nextStatus === 'inactive'
            ? 'They will be hidden from the active directory. Their record is kept and can be reactivated.'
            : 'They will appear in the active directory again.'
        }
        confirmLabel={pendingStatusChange?.nextStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={pendingStatusChange?.nextStatus === 'inactive' ? 'danger' : 'default'}
        isProcessing={isSaving}
        onConfirm={confirmStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}

export default FacultyStaffPage;
