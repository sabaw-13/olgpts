function PageHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export default PageHeader;
