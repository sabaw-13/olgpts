import { Printer, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate.jsx';
import { supabase } from '../../lib/supabase.js';
import { formatStudentName } from '../../lib/studentName.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function buildReceiptSearchText(payment) {
  return [payment.receipt_number, payment.students?.lrn, formatStudentName(payment.students)]
    .filter(Boolean)
    .join(' ');
}

function getPaymentSortTime(payment) {
  return new Date(payment.created_at || payment.payment_date || 0).getTime();
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
}

function ReceiptsPage() {
  const [payments, setPayments] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReceipts = async () => {
    setLoading(true);
    setErrorMessage('');

    const [paymentsResult, studentFeesResult] = await Promise.all([
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
          students (id, lrn, first_name, middle_name, last_name),
          profiles (id, full_name),
          enrollments (
            id,
            school_years (id, school_year),
            grade_levels (id, grade_name),
            sections (id, section_name)
          )
        `,
        )
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('student_fees')
        .select('id, enrollment_id, amount, fees (id, fee_name, fee_type)'),
    ]);

    const queryError = paymentsResult.error || studentFeesResult.error;

    if (queryError) {
      setErrorMessage(queryError.message);
      setPayments([]);
      setStudentFees([]);
    } else {
      const paymentRows = paymentsResult.data || [];
      setPayments(paymentRows);
      setStudentFees((studentFeesResult.data || []).filter((studentFee) =>
        isEnrollmentFee(studentFee.fees),
      ));
      setSelectedReceipt((currentReceipt) => currentReceipt || paymentRows[0] || null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const totalAssessedByEnrollment = useMemo(() => {
    const totals = new Map();

    studentFees.forEach((studentFee) => {
      totals.set(
        studentFee.enrollment_id,
        (totals.get(studentFee.enrollment_id) || 0) + Number(studentFee.amount || 0),
      );
    });

    return totals;
  }, [studentFees]);

  const remainingBalanceByPayment = useMemo(() => {
    const paymentsByEnrollment = new Map();
    const balances = new Map();

    payments.forEach((payment) => {
      const enrollmentPayments = paymentsByEnrollment.get(payment.enrollment_id) || [];
      enrollmentPayments.push(payment);
      paymentsByEnrollment.set(payment.enrollment_id, enrollmentPayments);
    });

    paymentsByEnrollment.forEach((enrollmentPayments, enrollmentId) => {
      let runningPaid = 0;
      const totalAssessed = totalAssessedByEnrollment.get(enrollmentId) || 0;

      enrollmentPayments
        .sort((firstPayment, secondPayment) => {
          const firstDate = String(firstPayment.payment_date || '');
          const secondDate = String(secondPayment.payment_date || '');

          if (firstDate !== secondDate) {
            return firstDate.localeCompare(secondDate);
          }

          return getPaymentSortTime(firstPayment) - getPaymentSortTime(secondPayment);
        })
        .forEach((payment) => {
          runningPaid += Number(payment.payment_amount || 0);
          balances.set(payment.id, Math.max(totalAssessed - runningPaid, 0));
        });
    });

    return balances;
  }, [payments, totalAssessedByEnrollment]);

  const receiptsWithBalance = useMemo(
    () =>
      payments.map((payment) => ({
        ...payment,
        remainingBalance: remainingBalanceByPayment.get(payment.id) || 0,
      })),
    [payments, remainingBalanceByPayment],
  );

  const filteredReceipts = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).trim();

    if (!normalizedSearch) {
      return receiptsWithBalance;
    }

    return receiptsWithBalance.filter((payment) =>
      normalizeText(buildReceiptSearchText(payment)).includes(normalizedSearch),
    );
  }, [receiptsWithBalance, searchTerm]);

  const selectedReceiptWithBalance =
    receiptsWithBalance.find((receipt) => receipt.id === selectedReceipt?.id) ||
    selectedReceipt;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Receipts"
          description="Search, view, and print official payment receipts."
        />

        <button
          type="button"
          onClick={handlePrint}
          disabled={!selectedReceiptWithBalance}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <Printer size={16} />
          Print Receipt
        </button>
      </div>

      <NotificationToast
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage('')}
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="no-print rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Receipt Records</h3>
          <label className="relative mt-4 block">
            <span className="sr-only">Search receipt by receipt number or student name</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search receipt no. or student"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Loading receipts...</p>
            ) : filteredReceipts.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                No receipts found.
              </p>
            ) : (
              filteredReceipts.map((payment) => {
                const isSelected = selectedReceiptWithBalance?.id === payment.id;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedReceipt(payment)}
                    className={[
                      'w-full rounded-md border px-3 py-3 text-left text-sm transition',
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="block font-semibold text-slate-900">
                      {payment.receipt_number}
                    </span>
                    <span className="mt-1 block text-slate-600">
                      {formatStudentName(payment.students)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatCurrency(payment.payment_amount)} |{' '}
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString()
                        : 'No date'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section>
          {selectedReceiptWithBalance ? (
            <ReceiptTemplate receipt={selectedReceiptWithBalance} />
          ) : (
            <div className="no-print rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
              Select a receipt to preview and print.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ReceiptsPage;
