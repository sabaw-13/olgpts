import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const initialPaymentForm = {
  payment_method: 'Cash',
  remarks: '',
  payment_date: new Date().toISOString().slice(0, 10),
};

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getStudentName(student) {
  if (!student) {
    return 'Unknown student';
  }

  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown student';
}

function generateReceiptNumber() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll('-', '');
  const timePart = String(date.getTime()).slice(-6);
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `OLGTPS-${datePart}-${timePart}-${randomPart}`;
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
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

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function PaymentsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeEnrollment, setActiveEnrollment] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [selectedFeePayments, setSelectedFeePayments] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchStudents = async () => {
    setLoadingStudents(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('students')
      .select('id, lrn, first_name, middle_name, last_name')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoadingStudents(false);
  };

  const fetchAssignedEnrollmentFees = async (enrollmentId) => {
    const { data, error } = await supabase
      .from('student_fees')
      .select(studentFeeSelect)
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).filter((studentFee) => isEnrollmentFee(studentFee.fees));
  };

  const ensureEnrollmentFeeAssigned = async (enrollment, assignedEnrollmentFees) => {
    if (assignedEnrollmentFees.length > 0) {
      return assignedEnrollmentFees;
    }

    const { data: activeFees, error: activeFeeError } = await supabase
      .from('fees')
      .select('id, fee_name, fee_type, amount')
      .eq('grade_level_id', enrollment.grade_level_id)
      .eq('school_year_id', enrollment.school_year_id)
      .eq('status', 'active');

    if (activeFeeError) {
      throw activeFeeError;
    }

    const enrollmentFee = (activeFees || []).find(isEnrollmentFee);

    if (!enrollmentFee) {
      return assignedEnrollmentFees;
    }

    const { data: insertedFee, error: insertError } = await supabase
      .from('student_fees')
      .insert({
        student_id: enrollment.student_id,
        enrollment_id: enrollment.id,
        fee_id: enrollmentFee.id,
        amount: enrollmentFee.amount,
        status: 'unpaid',
      })
      .select(studentFeeSelect)
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return fetchAssignedEnrollmentFees(enrollment.id);
      }

      throw insertError;
    }

    return insertedFee ? [insertedFee] : assignedEnrollmentFees;
  };

  const fetchStudentAccount = async (student) => {
    if (!student) {
      return;
    }

    setLoadingAccount(true);
    setErrorMessage('');
    setSuccessMessage('');
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
        .in('enrollment_status', ['pending', 'enrolled'])
        .order('created_at', { ascending: false });

      if (enrollmentError) {
        throw enrollmentError;
      }

      const selectedEnrollment = (enrollments || [])[0] || null;

      if (!selectedEnrollment) {
        setActiveEnrollment(null);
        return;
      }

      setActiveEnrollment(selectedEnrollment);

      const [assignedEnrollmentFees, paymentsResult] = await Promise.all([
        fetchAssignedEnrollmentFees(selectedEnrollment.id),
        supabase
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
          .order('created_at', { ascending: false }),
      ]);

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      const enrollmentFees = await ensureEnrollmentFeeAssigned(
        selectedEnrollment,
        assignedEnrollmentFees,
      );

      setStudentFees(enrollmentFees);
      setPayments(paymentsResult.data || []);

      const paymentIds = (paymentsResult.data || []).map((payment) => payment.id);

      if (paymentIds.length > 0) {
        const { data: details, error: detailsError } = await supabase
          .from('payment_details')
          .select('id, payment_id, fee_id, amount_paid, created_at')
          .in('payment_id', paymentIds);

        if (detailsError) {
          throw detailsError;
        }

        setPaymentDetails(details || []);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load student payment account.');
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeText(studentSearch).trim();

    if (!normalizedSearch) {
      return students.slice(0, 12);
    }

    return students
      .filter((student) =>
        normalizeText(`${student.lrn || ''} ${getStudentName(student)}`).includes(
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
          balance: Math.max(amount - paidAmount, 0),
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

  const remainingBalance = Math.max(totalAssessedFees - totalPayments, 0);

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
          total + (Number.isFinite(allocation.amount) ? allocation.amount : 0),
        0,
      ),
    [selectedFeeAllocations],
  );

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setPaymentForm(initialPaymentForm);
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

  const updateStudentFeeStatuses = async (allocations) => {
    const updates = allocations.map((allocation) => {
      const studentFee = assessedFeesWithBalances.find(
        (fee) => fee.fee_id === allocation.fee_id,
      );
      const newPaidAmount = (studentFee?.paidAmount || 0) + allocation.amount_paid;
      const totalFeeAmount = Number(studentFee?.amount || 0);
      const status =
        newPaidAmount <= 0
          ? 'unpaid'
          : newPaidAmount >= totalFeeAmount
            ? 'paid'
            : 'partial';

      return supabase
        .from('student_fees')
        .update({ status })
        .eq('id', studentFee.id);
    });

    const results = await Promise.all(updates);
    const updateError = results.find((result) => result.error)?.error;

    if (updateError) {
      throw updateError;
    }
  };

  const updateEnrollmentStatusAfterPayment = async (allocations) => {
    const enrollmentFee = assessedFeesWithBalances.find((studentFee) =>
      isEnrollmentFee(studentFee.fees),
    );

    if (!enrollmentFee || activeEnrollment?.enrollment_status === 'enrolled') {
      return;
    }

    const enrollmentFeeAllocation = allocations.find(
      (allocation) => allocation.fee_id === enrollmentFee.fee_id,
    );
    const paidAmountAfterPayment =
      (enrollmentFee.paidAmount || 0) + (enrollmentFeeAllocation?.amount_paid || 0);

    if (paidAmountAfterPayment < Number(enrollmentFee.amount || 0)) {
      return;
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ enrollment_status: 'enrolled' })
      .eq('id', activeEnrollment.id);

    if (error) {
      throw error;
    }

    return true;
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedStudent || !activeEnrollment) {
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

    setIsSaving(true);

    try {
      const receiptNumber = generateReceiptNumber();
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: selectedStudent.id,
          enrollment_id: activeEnrollment.id,
          receipt_number: receiptNumber,
          payment_amount: paymentAmount,
          payment_method: paymentForm.payment_method,
          remarks: paymentForm.remarks.trim(),
          received_by: profile.id,
          payment_date: paymentForm.payment_date,
        })
        .select('id, receipt_number')
        .single();

      if (paymentError) {
        throw paymentError;
      }

      const paymentDetailPayload = allocations.map((allocation) => ({
        payment_id: payment.id,
        fee_id: allocation.fee_id,
        amount_paid: allocation.amount_paid,
      }));

      const { error: detailsError } = await supabase
        .from('payment_details')
        .insert(paymentDetailPayload);

      if (detailsError) {
        throw detailsError;
      }

      await updateStudentFeeStatuses(allocations);
      const enrollmentMarkedAsEnrolled = await updateEnrollmentStatusAfterPayment(allocations);

      setSuccessMessage(
        enrollmentMarkedAsEnrolled
          ? `Payment saved successfully. Enrollment marked as enrolled. Receipt No: ${payment.receipt_number}`
          : `Payment saved successfully. Receipt No: ${payment.receipt_number}`,
      );
      setPaymentForm(initialPaymentForm);
      setSelectedFeePayments({});
      await fetchStudentAccount(selectedStudent);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to record payment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record enrollment fee payments and compute student balances."
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
                    onClick={() => handleSelectStudent(student)}
                    className={[
                      'w-full rounded-md border px-3 py-3 text-left text-sm transition',
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="block font-semibold text-slate-900">
                      {getStudentName(student)}
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
              Select a student to view enrollment fee payments and balance.
            </section>
          ) : loadingAccount ? (
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Loading payment account...
            </section>
          ) : !activeEnrollment ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              No active enrollment found for {getStudentName(selectedStudent)}.
            </section>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      {getStudentName(selectedStudent)}
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

              <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Enrollment Fee" value={formatCurrency(totalAssessedFees)} />
                <SummaryCard label="Total Payments" value={formatCurrency(totalPayments)} />
                <SummaryCard label="Remaining Balance" value={formatCurrency(remainingBalance)} />
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Enrollment Fee</h3>
                {assessedFeesWithBalances.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                    No enrollment fee found. Assign the enrollment fee from the Enrollment module first.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">Fee</th>
                          <th className="px-3 py-3 text-right">Assessed</th>
                          <th className="px-3 py-3 text-right">Paid</th>
                          <th className="px-3 py-3 text-right">Balance</th>
                          <th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assessedFeesWithBalances.map((studentFee) => (
                          <tr key={studentFee.id}>
                            <td className="px-3 py-3">
                              <p className="font-medium text-slate-900">
                                {studentFee.fees?.fee_name || 'Unknown fee'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {studentFee.fees?.fee_type || 'Not set'}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(studentFee.amount)}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {formatCurrency(studentFee.paidAmount)}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {formatCurrency(studentFee.balance)}
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge status={studentFee.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Record Payment</h3>
                <form onSubmit={handleRecordPayment} className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <p className="text-sm font-medium text-slate-700">Enrollment Fee to Pay</p>
                    {assessedFeesWithBalances.length === 0 ? (
                      <p className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                        No enrollment fee is available for payment.
                      </p>
                    ) : (
                      <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                    <select
                      name="payment_method"
                      value={paymentForm.payment_method}
                      onChange={handlePaymentFormChange}
                      className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Payment Date
                    <input
                      type="date"
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
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
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
