import { AlertCircle, CheckCircle2, X } from 'lucide-react';

function ToastItem({ message, type, onDismiss }) {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-xl shadow-slate-950/10',
        isError ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-800',
      ].join(' ')}
      role="status"
    >
      <Icon
        className={isError ? 'mt-0.5 shrink-0 text-red-600' : 'mt-0.5 shrink-0 text-emerald-600'}
        size={18}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function NotificationToast({
  successMessage,
  errorMessage,
  onDismissSuccess,
  onDismissError,
}) {
  if (!successMessage && !errorMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6">
      {successMessage ? (
        <ToastItem message={successMessage} type="success" onDismiss={onDismissSuccess} />
      ) : null}
      {errorMessage ? (
        <ToastItem message={errorMessage} type="error" onDismiss={onDismissError} />
      ) : null}
    </div>
  );
}

export default NotificationToast;
