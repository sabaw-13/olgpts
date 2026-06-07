function PageHeader({
  title,
  description,
  actions = null,
  sticky = false,
  className = '',
}) {
  const wrapperClassName = [
    sticky
      ? 'sticky top-0 z-30 -mx-3 bg-[#f4f7fc]/95 px-3 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClassName = [
    'border-b border-[#d9e3f5] pb-4',
    actions ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      <div className={contentClassName}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-9 w-1 rounded-full bg-[#f5bb2e]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#132a63] sm:text-2xl">{title}</h2>
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export default PageHeader;
