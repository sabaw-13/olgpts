import { NavLink } from 'react-router-dom';

export default function SectionTabs({ label, items, disabled = false }) {
  return (
    <nav aria-label={label} className="no-print flex gap-5 overflow-x-auto border-b border-[#d9e3f5]">
      {items.map(({ label: text, path }) => (
        <NavLink key={path} to={path} end aria-disabled={disabled || undefined} onClick={(event) => { if (disabled) event.preventDefault(); }} className={({ isActive }) =>
          `shrink-0 border-b-[3px] px-1 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#b77900] ${isActive ? 'border-[#f5bb2e] text-[#132a63]' : 'border-transparent text-slate-500 hover:border-[#d9e3f5] hover:text-[#132a63]'}`}>
          {text}
        </NavLink>
      ))}
    </nav>
  );
}
