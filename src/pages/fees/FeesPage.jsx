import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import FeeFormModal from '../../components/forms/FeeFormModal.jsx';
import FeeTable from '../../components/tables/FeeTable.jsx';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const defaultFilters = {
  schoolYearId: 'all',
  gradeLevelId: 'all',
  status: 'all',
};

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function buildFeeSearchText(fee) {
  return [
    fee.fee_name,
    fee.fee_type,
    fee.grade_levels?.grade_name || 'All Grades',
    fee.school_years?.school_year,
  ]
    .filter(Boolean)
    .join(' ');
}

function getFeeMutationErrorMessage(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  if (
    message.includes('row-level security policy') &&
    message.includes('"fees"')
  ) {
    return 'Your account is not allowed to manage fees. Make sure the signed-in user has an active profile row in Supabase with role "admin" or "staff".';
  }

  return message;
}

function FeesPage() {
  const { profile } = useAuth();
  const canManage = ['admin', 'staff'].includes(profile?.role) && profile?.status === 'active';
  const [fees, setFees] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedFee, setSelectedFee] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [pendingDeleteFee, setPendingDeleteFee] = useState(null);

  const fetchFeeData = async () => {
    setLoading(true);
    setErrorMessage('');

    const [feesResult, gradeLevelsResult, schoolYearsResult] = await Promise.all([
      supabase
        .from('fees')
        .select(
          `
          id,
          fee_name,
          fee_type,
          amount,
          grade_level_id,
          school_year_id,
          status,
          created_at,
          grade_levels (id, grade_name, status),
          school_years (id, school_year, status)
        `,
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('grade_levels')
        .select('id, grade_name, status')
        .order('grade_name', { ascending: true }),
      supabase
        .from('school_years')
        .select('id, school_year, status')
        .order('school_year', { ascending: false }),
    ]);

    const queryError = feesResult.error || gradeLevelsResult.error || schoolYearsResult.error;

    if (queryError) {
      setErrorMessage(queryError.message);
      setFees([]);
      setGradeLevels([]);
      setSchoolYears([]);
    } else {
      setFees(feesResult.data || []);
      setGradeLevels(gradeLevelsResult.data || []);
      setSchoolYears(schoolYearsResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  const filteredFees = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).trim();

    return fees.filter((fee) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(buildFeeSearchText(fee)).includes(normalizedSearch);
      const matchesSchoolYear =
        filters.schoolYearId === 'all' || fee.school_year_id === filters.schoolYearId;
      const matchesGradeLevel =
        filters.gradeLevelId === 'all' ||
        fee.grade_level_id === filters.gradeLevelId ||
        fee.grade_level_id === null;
      const matchesStatus = filters.status === 'all' || fee.status === filters.status;

      return matchesSearch && matchesSchoolYear && matchesGradeLevel && matchesStatus;
    });
  }, [fees, filters, searchTerm]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const handleOpenAdd = () => {
    if (!canManage) {
      return;
    }

    setFormMode('add');
    setSelectedFee(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fee) => {
    if (!canManage) {
      return;
    }

    setFormMode('edit');
    setSelectedFee(fee);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setSelectedFee(null);
  };

  const handleSaveFee = async (formData) => {
    if (!canManage) {
      setErrorMessage('Only active admin or staff users can manage fees.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (formData.amount < 0) {
        throw new Error('Amount must not be negative.');
      }

      const payload = {
        fee_name: formData.fee_name,
        fee_type: formData.fee_type,
        amount: formData.amount,
        grade_level_id: formData.grade_level_id,
        school_year_id: formData.school_year_id,
        status: formData.status,
      };

      const { error } =
        formMode === 'edit' && selectedFee
          ? await supabase.from('fees').update(payload).eq('id', selectedFee.id)
          : await supabase.from('fees').insert(payload);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        formMode === 'edit'
          ? 'Fee updated successfully.'
          : 'Fee added successfully.',
      );
      setIsFormOpen(false);
      setSelectedFee(null);
      await fetchFeeData();
    } catch (error) {
      setErrorMessage(getFeeMutationErrorMessage(error, 'Unable to save fee.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (fee, status) => {
    if (!canManage) {
      setErrorMessage('Only active admin or staff users can manage fees.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.from('fees').update({ status }).eq('id', fee.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(`Fee marked as ${status}.`);
      await fetchFeeData();
    } catch (error) {
      setErrorMessage(getFeeMutationErrorMessage(error, 'Unable to update fee status.'));
    } finally {
      setIsSaving(false);
    }
  };

  const requestToggleStatus = (fee, status) => {
    setPendingStatusChange({ fee, status });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const confirmToggleStatus = async () => {
    if (!pendingStatusChange) {
      return;
    }

    await handleToggleStatus(pendingStatusChange.fee, pendingStatusChange.status);
    setPendingStatusChange(null);
  };

  const requestDeleteFee = () => {
    if (!selectedFee) {
      return;
    }

    setPendingDeleteFee(selectedFee);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const confirmDeleteFee = async () => {
    if (!pendingDeleteFee) {
      return;
    }

    if (!canManage) {
      setErrorMessage('Only active admin or staff users can manage fees.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.from('fees').delete().eq('id', pendingDeleteFee.id);

      if (error) {
        throw error;
      }

      setSuccessMessage('Fee deleted successfully.');
      setPendingDeleteFee(null);
      setIsFormOpen(false);
      setSelectedFee(null);
      await fetchFeeData();
    } catch (error) {
      setErrorMessage(
        getFeeMutationErrorMessage(
          error,
          'Unable to delete fee. Fees already assigned to students or payments cannot be deleted.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        title="Fees"
        description="Create and manage different school fees assigned to each grade level and school year."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={16} />
              Add Fee
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_repeat(3,minmax(150px,190px))]">
          <label className="relative block">
            <span className="sr-only">Search fees</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by fee, type, grade, or school year"
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
            <option value="all-grades">Fees for all grades</option>
            {gradeLevels.map((gradeLevel) => (
              <option key={gradeLevel.id} value={gradeLevel.id}>
                {gradeLevel.grade_name}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading fee records...
        </div>
      ) : (
        <FeeTable
          fees={filteredFees}
          canManage={canManage}
          isSaving={isSaving}
          onEdit={handleOpenEdit}
          onToggleStatus={requestToggleStatus}
        />
      )}

      <FeeFormModal
        isOpen={isFormOpen}
        mode={formMode}
        fee={selectedFee}
        gradeLevels={gradeLevels}
        schoolYears={schoolYears}
        isSaving={isSaving}
        onClose={handleCloseForm}
        onDelete={requestDeleteFee}
        onSubmit={handleSaveFee}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingStatusChange)}
        title={`${pendingStatusChange?.status === 'active' ? 'Activate' : 'Deactivate'} fee?`}
        message={`This will mark "${pendingStatusChange?.fee?.fee_name || 'this fee'}" as ${pendingStatusChange?.status}.`}
        confirmLabel={pendingStatusChange?.status === 'active' ? 'Activate' : 'Deactivate'}
        variant={pendingStatusChange?.status === 'inactive' ? 'danger' : 'default'}
        isProcessing={isSaving}
        onConfirm={confirmToggleStatus}
        onCancel={() => setPendingStatusChange(null)}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingDeleteFee)}
        title="Delete fee?"
        message={`This will permanently delete "${pendingDeleteFee?.fee_name || 'this fee'}". Fees already used by student accounts or payments may be blocked by the database.`}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={isSaving}
        onConfirm={confirmDeleteFee}
        onCancel={() => setPendingDeleteFee(null)}
      />
    </div>
  );
}

export default FeesPage;
