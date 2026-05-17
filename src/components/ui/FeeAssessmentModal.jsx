import { CheckSquare, Square, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getStudentName(student) {
  if (!student) {
    return 'Unknown student';
  }

  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown student';
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
}

function StatusBadge({ status }) {
  const styles = {
    unpaid: 'bg-red-50 text-red-700',
    partial: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        styles[status] || styles.unpaid,
      ].join(' ')}
    >
      {status || 'unpaid'}
    </span>
  );
}

function FeeAssessmentModal({ enrollment, onClose, onSaved }) {
  const [availableFees, setAvailableFees] = useState([]);
  const [assignedFees, setAssignedFees] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const assignedFeeIds = useMemo(
    () => new Set(assignedFees.map((studentFee) => studentFee.fee_id)),
    [assignedFees],
  );

  const unassignedFees = useMemo(
    () => availableFees.filter((fee) => !assignedFeeIds.has(fee.id)),
    [assignedFeeIds, availableFees],
  );

  const totalAssignedAmount = useMemo(
    () =>
      assignedFees.reduce(
        (total, studentFee) => total + Number(studentFee.amount || 0),
        0,
      ),
    [assignedFees],
  );

  const selectedTotalAmount = useMemo(
    () =>
      availableFees
        .filter((fee) => selectedFeeIds.includes(fee.id))
        .reduce((total, fee) => total + Number(fee.amount || 0), 0),
    [availableFees, selectedFeeIds],
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchAssessmentData() {
      if (!enrollment) {
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      setSelectedFeeIds([]);

      const [feesResult, studentFeesResult] = await Promise.all([
        supabase
          .from('fees')
          .select('id, fee_name, fee_type, amount, grade_level_id, school_year_id, status')
          .eq('grade_level_id', enrollment.grade_level_id)
          .eq('school_year_id', enrollment.school_year_id)
          .eq('status', 'active')
          .order('fee_name', { ascending: true }),
        supabase
          .from('student_fees')
          .select(
            `
            id,
            student_id,
            enrollment_id,
            fee_id,
            amount,
            status,
            created_at,
            fees (id, fee_name, fee_type, amount)
          `,
          )
          .eq('enrollment_id', enrollment.id)
          .order('created_at', { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      const queryError = feesResult.error || studentFeesResult.error;

      if (queryError) {
        setErrorMessage(queryError.message);
        setAvailableFees([]);
        setAssignedFees([]);
      } else {
        setAvailableFees((feesResult.data || []).filter(isEnrollmentFee));
        setAssignedFees((studentFeesResult.data || []).filter((studentFee) =>
          isEnrollmentFee(studentFee.fees),
        ));
      }

      setLoading(false);
    }

    fetchAssessmentData();

    return () => {
      isMounted = false;
    };
  }, [enrollment]);

  if (!enrollment) {
    return null;
  }

  const toggleFee = (feeId) => {
    setSelectedFeeIds((currentIds) =>
      currentIds.includes(feeId)
        ? []
        : [feeId],
    );
  };

  const handleAssignFees = async () => {
    if (selectedFeeIds.length === 0) {
      setErrorMessage('Select an enrollment fee to assign.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: existingFees, error: existingError } = await supabase
        .from('student_fees')
        .select('fee_id')
        .eq('enrollment_id', enrollment.id)
        .in('fee_id', selectedFeeIds);

      if (existingError) {
        throw existingError;
      }

      const existingFeeIds = new Set((existingFees || []).map((item) => item.fee_id));
      const feesToAssign = availableFees.filter(
        (fee) => selectedFeeIds.includes(fee.id) && !existingFeeIds.has(fee.id),
      );

      if (feesToAssign.length === 0) {
        throw new Error('This enrollment fee is already assigned to this enrollment.');
      }

      const payload = feesToAssign.map((fee) => ({
        student_id: enrollment.student_id,
        enrollment_id: enrollment.id,
        fee_id: fee.id,
        amount: fee.amount,
        status: 'unpaid',
      }));

      const { error } = await supabase.from('student_fees').insert(payload);

      if (error) {
        throw error;
      }

      setSuccessMessage('Enrollment fee assigned successfully.');
      setSelectedFeeIds([]);

      const { data, error: refreshError } = await supabase
        .from('student_fees')
        .select(
          `
          id,
          student_id,
          enrollment_id,
          fee_id,
          amount,
          status,
          created_at,
          fees (id, fee_name, fee_type, amount)
        `,
        )
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: true });

      if (refreshError) {
        throw refreshError;
      }

      setAssignedFees((data || []).filter((studentFee) => isEnrollmentFee(studentFee.fees)));
      await onSaved?.();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign the enrollment fee.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Enrollment Fee
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {getStudentName(enrollment.students)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {enrollment.grade_levels?.grade_name || 'No grade'} ·{' '}
              {enrollment.school_years?.school_year || 'No school year'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close fee assessment"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {successMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Loading fee assessment...
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-950">Assigned Enrollment Fee</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Total assessed amount: {formatCurrency(totalAssignedAmount)}
                    </p>
                  </div>
                </div>

                {assignedFees.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No enrollment fee assigned to this record yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Fee</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignedFees.map((studentFee) => (
                          <tr key={studentFee.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {studentFee.fees?.fee_name || 'Unknown fee'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {studentFee.fees?.fee_type || 'Not set'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(studentFee.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={studentFee.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-slate-200">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-950">Available Enrollment Fee</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Select the active enrollment fee for this grade level and school year.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Selected: {formatCurrency(selectedTotalAmount)}
                  </p>
                </div>

                {unassignedFees.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No unassigned active enrollment fee found for this grade level and school year.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {unassignedFees.map((fee) => {
                      const isSelected = selectedFeeIds.includes(fee.id);
                      const Icon = isSelected ? CheckSquare : Square;

                      return (
                        <button
                          type="button"
                          key={fee.id}
                          onClick={() => toggleFee(fee.id)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Icon
                              size={18}
                              className={isSelected ? 'text-emerald-700' : 'text-slate-400'}
                            />
                            <span>
                              <span className="block font-medium text-slate-900">
                                {fee.fee_name}
                              </span>
                              <span className="block text-sm text-slate-500">
                                {fee.fee_type}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900">
                            {formatCurrency(fee.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAssignFees}
                  disabled={isSaving || selectedFeeIds.length === 0}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSaving ? 'Assigning...' : 'Assign Enrollment Fee'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeeAssessmentModal;
