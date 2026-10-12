import { fetchAllRows } from '../../lib/fetchAllRows.js';
import { getSchoolDate } from '../../lib/date.js';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { formatStudentName } from '../../lib/studentName.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const getInitialPaymentForm = () => ({
  payment_method: 'Cash',
  remarks: '',
  payment_date: getSchoolDate(),
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

const studentFeeSelect = `
  id,
  student_id,
  enrollment_id,
  fee_id,
  amount,
  status,
  created_at,
  fees (id, fee_name, fee_type)
`;

function PaymentsPage({ embedded = false, feeRevision = 0, onBusyChange }) {
  const { profile } = useAuth();
  const accountRequest = useRef(0);
  const savingPayment = useRef(false);
  const paymentAttempt = useRef(null);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeEnrollment, setActiveEnrollment] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [paymentForm, setPaymentForm] = useState(getInitialPaymentForm);
  const [selectedFeePayments, setSelectedFeePayments] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchStudents = async () => {
    setLoadingStudents(true);
    setErrorMessage('');

    const { data, error } = await fetchAllRows(() => supabase
      .from('enrollments')
      .select(
        `
        id,
        student_id,
        created_at,
        enrollment_status,
        students (id, lrn, first_name, middle_name, last_name)
      `,
      )
      .order('created_at', { ascending: false }).order('id', { ascending: false }));

    if (error) {
      setErrorMessage(error.message);
      setStudents([]);
    } else {
      const uniqueStudents = [];
      const seenStudentIds = new Set();

      (data || []).forEach((enrollment) => {
        const student = enrollment.students;

        if (!student?.id || seenStudentIds.has(student.id)) {
          return;
        }

        seenStudentIds.add(student.id);
        if (!['pending', 'enrolled'].includes(enrollment.enrollment_status)) {
          return;
        }

        uniqueStudents.push(student);
      });

      uniqueStudents.sort((firstStudent, secondStudent) => {
        const firstName = formatStudentName(firstStudent);
        const secondName = formatStudentName(secondStudent);

        return firstName.localeCompare(secondName);
      });

      setStudents(uniqueStudents);
    }

    setLoadingStudents(false);
  };

  const fetchAssignedFees = async (enrollmentId) => {
    const { data, error } = await fetchAllRows(() => supabase
      .from('student_fees')
      .select(studentFeeSelect)
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: true }));

    if (error) {
      throw error;
    }

    return data || [];
  };

  const ensureFeesAssigned = async (enrollment, assignedFees) => {
    const { data: activeFees, error: activeFeeError } = await fetchAllRows(() => supabase
      .from('fees')
      .select('id, fee_name, fee_type, amount')
      .eq('school_year_id', enrollment.school_year_id)
      .eq('status', 'active')
      .or(enrollment.grade_level_id
        ? `grade_level_id.eq.${enrollment.grade_level_id},grade_level_id.is.null`
        : 'grade_level_id.is.null'));

    if (activeFeeError) {
      throw activeFeeError;
    }

    if ((activeFees || []).length === 0) {
      return assignedFees;
    }

    const assignedFeeIds = new Set((assignedFees || []).map((studentFee) => studentFee.fee_id));
    const missingFees = (activeFees || []).filter((fee) => !assignedFeeIds.has(fee.id));

    if (missingFees.length === 0) {
      return assignedFees;
    }

    const feePayload = missingFees.map((fee) => ({
      student_id: enrollment.student_id,
      enrollment_id: enrollment.id,
      fee_id: fee.id,
      amount: fee.amount,
      status: 'unpaid',
    }));

    const { data: insertedFees, error: insertError } = await supabase
      .from('student_fees')
      .insert(feePayload)
      .select(studentFeeSelect)
      .order('created_at', { ascending: true });

    if (insertError) {
      if (insertError.code === '23505') {
        return fetchAssignedFees(enrollment.id);
      }

      throw insertError;
    }

    if (!insertedFees || insertedFees.length === 0) {
      return fetchAssignedFees(enrollment.id);
    }

    return fetchAssignedFees(enrollment.id);
  };

  const fetchStudentAccount = async (student) => {
    if (!student) {
      return;
    }

    const requestId = ++accountRequest.current;
    const isCurrentRequest = () => accountRequest.current === requestId;
    setLoadingAccount(true);
    setErrorMessage('');
    setActiveEnrollment(null);
    setStudentFees([]);
    setPayments([]);
    setPaymentDetails([]);
    setSelectedFeePayments({});

    try {
      const { data: enrollments, error: enrollmentError } = await supabase
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
          school_years (id, school_year),
          grade_levels (id, grade_name),
          sections (id, section_name)
        `,
        )
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1);

      if (!isCurrentRequest()) return;
      if (enrollmentError) {
        throw enrollmentError;
      }

      const selectedEnrollment = (enrollments || [])[0] || null;

      if (!selectedEnrollment || !['pending', 'enrolled'].includes(selectedEnrollment.enrollment_status)) {
        setActiveEnrollment(null);
        return;
      }

      setActiveEnrollment(selectedEnrollment);

      const [assignedFees, paymentsResult] = await Promise.all([
        fetchAssignedFees(selectedEnrollment.id),
        fetchAllRows(() => supabase
          .from('payments')
          .select(
            `
            id,
            student_id,
            enrollment_id,
            receipt_number,
            payment_amount,
            payment_method,
            remarks,
            received_by,
            payment_date,
            created_at,
            profiles (id, full_name)
          `,
          )
          .eq('enrollment_id', selectedEnrollment.id)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false })),
      ]);

      if (!isCurrentRequest()) return;
      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      const enrollmentFees = await ensureFeesAssigned(
        selectedEnrollment,
        assignedFees,
      );

      if (!isCurrentRequest()) return;
      setStudentFees(enrollmentFees);
      setPayments(paymentsResult.data || []);

      const paymentIds = (paymentsResult.data || []).map((payment) => payment.id);

      if (paymentIds.length > 0) {
        const { data: details, error: detailsError } = await fetchAllRows(() => supabase
          .from('payment_details')
          .select('id, payment_id, fee_id, amount_paid, created_at, payments!inner(enrollment_id)')
          .eq('payments.enrollment_id', selectedEnrollment.id));

        if (!isCurrentRequest()) return;
        if (detailsError) {
          throw detailsError;
        }

        setPaymentDetails(details || []);
      }
    } catch (error) {
      if (isCurrentRequest()) {
        setActiveEnrollment(null);
        setStudentFees([]);
        setPayments([]);
        setPaymentDetails([]);
        setErrorMessage(error.message || 'Unable to load student payment account.');
      }
    } finally {
      if (isCurrentRequest()) setLoadingAccount(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    return () => { accountRequest.current += 1; };
  }, []);

  useEffect(() => {
    onBusyChange?.(isSaving);
  }, [isSaving, onBusyChange]);

  useEffect(() => {
    if (feeRevision > 0 && selectedStudent) fetchStudentAccount(selectedStudent);
  }, [feeRevision]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeText(studentSearch).trim();

    if (!normalizedSearch) {
      return students.slice(0, 12);
    }

    return students
      .filter((student) =>
        normalizeText(`${student.lrn || ''} ${formatStudentName(student)}`).includes(
          normalizedSearch,
        ),
      )
      .slice(0, 20);
  }, [studentSearch, students]);

  const paidByFeeId = useMemo(() => {
    const totals = new Map();

    paymentDetails.forEach((detail) => {
      totals.set(
        detail.fee_id,
        (totals.get(detail.fee_id) || 0) + Number(detail.amount_paid || 0),
      );
    });

    return totals;
  }, [paymentDetails]);

  const assessedFeesWithBalances = useMemo(
    () =>
      studentFees.map((studentFee) => {
        const paidAmount = paidByFeeId.get(studentFee.fee_id) || 0;
        const amount = Number(studentFee.amount || 0);

        return {
          ...studentFee,
          paidAmount,
          balance: Math.max(Math.round(amount * 100) - Math.round(paidAmount * 100), 0) / 100,
        };
      }),
    [paidByFeeId, studentFees],
  );

  const totalAssessedFees = useMemo(
    () => studentFees.reduce((total, fee) => total + Number(fee.amount || 0), 0),
    [studentFees],
  );

  const totalPayments = useMemo(
    () =>
      assessedFeesWithBalances.reduce(
        (total, studentFee) => total + Number(studentFee.paidAmount || 0),
        0,
      ),
    [assessedFeesWithBalances],
  );

  const remainingBalance = Math.max(Math.round(totalAssessedFees * 100) - Math.round(totalPayments * 100), 0) / 100;

  const selectedFeeAllocations = useMemo(
    () =>
      assessedFeesWithBalances
        .filter((fee) =>
          Object.prototype.hasOwnProperty.call(selectedFeePayments, fee.fee_id),
        )
        .map((fee) => ({
          fee,
          amount: Number(selectedFeePayments[fee.fee_id]),
        })),
    [assessedFeesWithBalances, selectedFeePayments],
  );

  const selectedPaymentTotal = useMemo(
    () =>
      selectedFeeAllocations.reduce(
        (total, allocation) =>
          total + (Number.isFinite(allocation.amount) ? Math.round(allocation.amount * 100) : 0),
        0,
      ) / 100,
    [selectedFeeAllocations],
  );

  const handleSelectStudent = async (student) => {
    if (savingPayment.current) return;
    paymentAttempt.current = null;
    setSuccessMessage('');
    setSelectedStudent(student);
    setPaymentForm(getInitialPaymentForm());
    setSelectedFeePayments({});
    await fetchStudentAccount(student);
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;

    setPaymentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleToggleFeePayment = (fee) => {
    setSelectedFeePayments((currentPayments) => {
      const nextPayments = { ...currentPayments };

      if (Object.prototype.hasOwnProperty.call(nextPayments, fee.fee_id)) {
        delete nextPayments[fee.fee_id];
        return nextPayments;
      }

      nextPayments[fee.fee_id] = Number(fee.balance || 0).toFixed(2);
      return nextPayments;
    });
  };

  const handleFeePaymentAmountChange = (feeId, value) => {
    setSelectedFeePayments((currentPayments) => ({
      ...currentPayments,
      [feeId]: value,
    }));
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    if (savingPayment.current || loadingAccount) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedStudent || !activeEnrollment || activeEnrollment.student_id !== selectedStudent.id) {
      setErrorMessage('Select a student with an active enrollment first.');
      return;
    }

    if (!profile?.id) {
      setErrorMessage('Unable to identify the receiving user profile.');
      return;
    }

    const selectedFeeCount = Object.keys(selectedFeePayments).length;

    if (selectedFeeCount === 0) {
      setErrorMessage('Select at least one assessed fee for this payment.');
      return;
    }

    if (selectedFeeCount !== selectedFeeAllocations.length) {
      setErrorMessage('One selected fee is no longer available. Reload the student account.');
      return;
    }

    const invalidAllocation = selectedFeeAllocations.find(
      (allocation) =>
        !Number.isFinite(allocation.amount) || allocation.amount <= 0,
    );

    if (invalidAllocation) {
      setErrorMessage('Each selected fee payment must be greater than 0.');
      return;
    }

    const overpaidAllocation = selectedFeeAllocations.find(
      (allocation) => allocation.amount > allocation.fee.balance,
    );

    if (overpaidAllocation) {
      setErrorMessage(
        `${overpaidAllocation.fee.fees?.fee_name || 'Selected fee'} payment must not exceed its balance.`,
      );
      return;
    }

    const paymentAmount = selectedPaymentTotal;

    if (paymentAmount > remainingBalance) {
      setErrorMessage('Payment amount must not exceed the remaining balance.');
      return;
    }

    const allocations = selectedFeeAllocations.map((allocation) => ({
      fee_id: allocation.fee.fee_id,
      amount_paid: allocation.amount,
    }));

    savingPayment.current = true;
    setIsSaving(true);
    const payload = {
      p_enrollment_id: activeEnrollment.id,
      p_allocations: allocations,
      p_payment_date: paymentForm.payment_date,
      p_remarks: paymentForm.remarks.trim(),
    };
    try {
      const fingerprint = JSON.stringify(payload);
      if (paymentAttempt.current?.fingerprint !== fingerprint) {
        paymentAttempt.current = { fingerprint, requestId: crypto.randomUUID() };
      }
      const { data: payment, error } = await supabase.rpc('record_payment', {
        ...payload,
        p_request_id: paymentAttempt.current.requestId,
      });
      if (error) throw error;
      paymentAttempt.current = null;
      setSuccessMessage(`Payment saved successfully. Receipt No: ${payment.receipt_number}`);
      setPaymentForm(getInitialPaymentForm());
      setSelectedFeePayments({});
      await fetchStudentAccount(selectedStudent);
    } catch (error) {
      setErrorMessage(error.code === 'PGRST202'
        ? 'Payment setup is pending. Apply the payment integrity migration in Supabase first.'
        : error.message || 'Unable to record payment.');
    } finally {
      savingPayment.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
      <PageHeader
        sticky
        title="Payments"
        description="Record student fee payments and compute balances across all assessed fees."
      />
      )}

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Select Student</h3>
          <label className="relative mt-4 block">
            <span className="sr-only">Search student by name or LRN</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search by name or LRN"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
            {loadingStudents ? (
              <p className="text-sm text-slate-500">Loading students...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                No students found.
              </p>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;

                return (
                  <button
                    key={student.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStudent(student)}
                    className={[
                      'w-full rounded-md border px-3 py-3 text-left text-sm transition',
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="block font-semibold text-slate-900">
                      {formatStudentName(student)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      LRN: {student.lrn || 'Not set'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <div className="space-y-6">
          {!selectedStudent ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
              Select a student to view assessed fees, payments, and balances.
            </section>
          ) : loadingAccount ? (
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Loading payment account...
            </section>
          ) : !activeEnrollment ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              No active enrollment found for {formatStudentName(selectedStudent)}.
            </section>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      {formatStudentName(selectedStudent)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeEnrollment.school_years?.school_year || 'No school year'} |{' '}
                      {activeEnrollment.grade_levels?.grade_name || 'No grade level'} |{' '}
                      {activeEnrollment.sections?.section_name || 'No section'}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold capitalize text-emerald-700">
                    {activeEnrollment.enrollment_status}
                  </span>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Record Payment</h3>
                <form onSubmit={handleRecordPayment} className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <p className="text-sm font-medium text-slate-700">Fees to Pay</p>
                    {assessedFeesWithBalances.length === 0 ? (
                      <p className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                        No active fees match this student's school year and grade level yet.
                      </p>
                    ) : (
                      <div className="mt-2 w-full overflow-x-auto rounded-md border border-slate-200">
                        <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <th className="w-12 px-3 py-3">Pay</th>
                              <th className="px-3 py-3">Fee</th>
                              <th className="px-3 py-3 text-right">Balance</th>
                              <th className="px-3 py-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {assessedFeesWithBalances.map((studentFee) => {
                              const isSelected = Object.prototype.hasOwnProperty.call(
                                selectedFeePayments,
                                studentFee.fee_id,
                              );
                              const isPaid = studentFee.balance <= 0;

                              return (
                                <tr key={studentFee.id}>
                                  <td className="px-3 py-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isPaid || isSaving}
                                      onChange={() => handleToggleFeePayment(studentFee)}
                                      aria-label={`Select ${studentFee.fees?.fee_name || 'fee'} for payment`}
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <p className="font-medium text-slate-900">
                                      {studentFee.fees?.fee_name || 'Unknown fee'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {studentFee.fees?.fee_type || 'Not set'}
                                    </p>
                                  </td>
                                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                                    {formatCurrency(studentFee.balance)}
                                  </td>
                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0.01"
                                      max={studentFee.balance}
                                      step="0.01"
                                      value={selectedFeePayments[studentFee.fee_id] || ''}
                                      disabled={!isSelected || isSaving}
                                      onChange={(event) =>
                                        handleFeePaymentAmountChange(
                                          studentFee.fee_id,
                                          event.target.value,
                                        )
                                      }
                                      className="ml-auto block w-32 rounded-md border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Payment Amount
                    <input
                      type="number"
                      value={selectedPaymentTotal > 0 ? selectedPaymentTotal.toFixed(2) : ''}
                      readOnly
                      className="mt-2 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Payment Method
                    <input
                      type="text"
                      value="Cash"
                      readOnly
                      className="mt-2 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Payment Date
                    <input
                      type="date"
                      disabled={isSaving}
                      name="payment_date"
                      value={paymentForm.payment_date}
                      onChange={handlePaymentFormChange}
                      required
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
                    Remarks
                    <textarea
                      disabled={isSaving}
                      name="remarks"
                      value={paymentForm.remarks}
                      onChange={handlePaymentFormChange}
                      rows="3"
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      disabled={isSaving || remainingBalance <= 0}
                      className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSaving ? 'Saving Payment...' : 'Save Payment Transaction'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Previous Payments</h3>
                {payments.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                    No previous payments found.
                  </p>
                ) : (
                  <div className="mt-4 w-full overflow-x-auto">
                    <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">Receipt No.</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3">Method</th>
                          <th className="px-3 py-3">Received By</th>
                          <th className="px-3 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-3 py-3 font-medium text-slate-900">
                              {payment.receipt_number}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {payment.payment_date
                                ? new Date(payment.payment_date).toLocaleDateString()
                                : 'No date'}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {payment.payment_method || 'Not set'}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {payment.profiles?.full_name || 'Unknown'}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(payment.payment_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentsPage;
