function PageHeader({ title, description }) {
  return (
    <div className="border-b border-[#d9e3f5] pb-4">
      <div className="flex items-center gap-3">
        <span className="h-9 w-1 rounded-full bg-[#f5bb2e]" aria-hidden="true" />
        <h2 className="text-xl font-bold text-[#132a63] sm:text-2xl">{title}</h2>
      </div>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export default PageHeader;
