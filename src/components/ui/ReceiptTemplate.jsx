import { formatStudentName } from '../../lib/studentName.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value || 'Not set'}</p>
    </div>
  );
}

function ReceiptTemplate({ receipt }) {
  if (!receipt) {
    return null;
  }

  return (
    <article className="receipt-print-area rounded-lg border border-slate-300 bg-white p-8 text-slate-950 shadow-sm">
      <header className="border-b-2 border-slate-900 pb-5 text-center">
        <p className="text-lg font-bold uppercase tracking-wide">
          Our Lady of Guadalupe Tibiao Parochial School
        </p>
        <p className="mt-1 text-sm font-medium">
          Payment and Enrollment Management System
        </p>
        <p className="mt-4 text-xl font-bold">Official Payment Receipt</p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Receipt Number" value={receipt.receipt_number} />
        <DetailItem
          label="Date of Payment"
          value={
            receipt.payment_date
              ? new Date(receipt.payment_date).toLocaleDateString()
              : 'Not set'
          }
        />
        <DetailItem label="Student Name" value={formatStudentName(receipt.students)} />
        <DetailItem label="LRN / Student ID" value={receipt.students?.lrn} />
        <DetailItem
          label="Grade Level"
          value={receipt.enrollments?.grade_levels?.grade_name}
        />
        <DetailItem label="Section" value={receipt.enrollments?.sections?.section_name} />
        <DetailItem
          label="School Year"
          value={receipt.enrollments?.school_years?.school_year}
        />
        <DetailItem label="Payment Method" value={receipt.payment_method} />
      </section>

      <section className="mt-6 rounded-lg border border-slate-300">
        <div className="grid grid-cols-2 border-b border-slate-300">
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment Amount
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(receipt.payment_amount)}
            </p>
          </div>
          <div className="border-l border-slate-300 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Remaining Balance
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(receipt.remainingBalance)}
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <DetailItem label="Received By" value={receipt.profiles?.full_name} />
          <DetailItem label="Remarks" value={receipt.remarks || 'None'} />
        </div>
      </section>

      <footer className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <div className="mt-10 border-t border-slate-900 pt-2 text-center text-sm">
            Received By
          </div>
        </div>
        <div>
          <div className="mt-10 border-t border-slate-900 pt-2 text-center text-sm">
            Parent / Guardian Signature
          </div>
        </div>
      </footer>
    </article>
  );
}

export default ReceiptTemplate;
