import { AppView } from '../types/view';

interface ViewToggleProps {
  value: AppView;
  onChange: (value: AppView) => void;
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
        Get votes
      </button>
      <div className="neo-toggle-divider" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onChange('submit')}
        className={`neo-toggle-option ${value === 'submit' ? 'active' : ''}`}
        aria-pressed={value === 'submit'}
      >
        Submit
      </button>
    </div>
  );
}
