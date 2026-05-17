import { AlertTriangle, X } from 'lucide-react';

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isProcessing = false,
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-100'
      : 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex gap-3">
            <span
              className={[
                'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                variant === 'danger'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-600',
              ].join(' ')}
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close confirmation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold text-white outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-400',
              confirmClass,
            ].join(' ')}
          >
            {isProcessing ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
