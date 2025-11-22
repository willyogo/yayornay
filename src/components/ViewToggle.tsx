type ViewOption = 'landing' | 'auction';

interface ViewToggleProps {
  value: ViewOption;
  onChange: (value: ViewOption) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const wrapperClass = ['neo-toggle', className].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass} role="group" aria-label="Choose app view">
      <button
        type="button"
        onClick={() => onChange('landing')}
        className={`neo-toggle-option ${value === 'landing' ? 'active' : ''}`}
        aria-pressed={value === 'landing'}
      >
        Vote
      </button>
      <div className="neo-toggle-divider" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onChange('auction')}
        className={`neo-toggle-option ${value === 'auction' ? 'active' : ''}`}
        aria-pressed={value === 'auction'}
      >
        Auction
      </button>
    </div>
  );
}
