import { useEffect, useRef, useState } from 'react';
import { WalletCards, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionTabs from '../../components/ui/SectionTabs.jsx';
import FeesPage from '../fees/FeesPage.jsx';
import ReceiptsPage from '../receipts/ReceiptsPage.jsx';
import PaymentsPage from './PaymentsPage.jsx';

function FeeSetupDialog({ onClose, onChanged }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const changed = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);
  const close = () => {
    if (busy) return;
    if (changed.current) onChanged();
    onClose();
  };
  return createPortal(
    <dialog ref={dialog} aria-labelledby="fee-setup-title" onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-6xl overflow-y-auto rounded-xl border border-[#d9e3f5] bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#d9e3f5] bg-white px-5 py-4">
        <div><h2 id="fee-setup-title" className="text-xl font-bold text-[#132a63]">Fee setup</h2><p className="mt-1 text-sm text-slate-500">Manage fees by school year and grade level.</p></div>
        <button type="button" onClick={close} disabled={busy} aria-label="Close fee setup" className="rounded-md p-2 text-[#132a63] hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#b77900] disabled:opacity-50"><X size={22} /></button>
      </div>
      <div className="p-4 sm:p-6"><FeesPage embedded onBusyChange={setBusy} onChanged={() => { changed.current = true; }} /></div>
    </dialog>, document.body,
  );
}

export default function PaymentHubPage({ receipts = false }) {
  const [params, setParams] = useSearchParams();
  const [feeRevision, setFeeRevision] = useState(0);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const feeSetupOpen = params.get('setup') === 'fees';
  const setFeeSetup = (open) => {
    const next = new URLSearchParams(params);
    if (open) next.set('setup', 'fees'); else next.delete('setup');
    setParams(next, { replace: true });
  };
  return (
    <div className="space-y-6">
      <PageHeader className="no-print" title="Payment" description="Record fee payments, check balances, and print receipts." actions={
        <button type="button" disabled={paymentBusy} onClick={() => setFeeSetup(true)} className="inline-flex items-center gap-2 rounded-md border border-[#d9e3f5] bg-white px-4 py-2 text-sm font-semibold text-[#132a63] hover:bg-[#fff7df] focus-visible:ring-2 focus-visible:ring-[#b77900] disabled:opacity-50"><WalletCards size={18} />Fee setup</button>
      } />
      <SectionTabs disabled={paymentBusy} label="Payment views" items={[{ label: 'Payments', path: '/payments' }, { label: 'Receipts', path: '/payments/receipts' }]} />
      {receipts ? <ReceiptsPage embedded /> : <PaymentsPage embedded feeRevision={feeRevision} onBusyChange={setPaymentBusy} />}
      {feeSetupOpen && <FeeSetupDialog onClose={() => setFeeSetup(false)} onChanged={() => setFeeRevision((value) => value + 1)} />}
    </div>
  );
}
