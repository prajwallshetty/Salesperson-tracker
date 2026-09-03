export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={
            "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors " +
            (value === opt.value ? "bg-white text-brand-700 shadow-sm" : "text-slate-500")
          }
        >
          {opt.label}
          {!!opt.badge && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
