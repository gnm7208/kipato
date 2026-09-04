interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</legend>
      <div className="grid grid-cols-2 border-3 border-ink p-1">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 px-3 text-sm font-bold transition-colors ${selected ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-sun/45'}`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
