import { AppView } from '../types/view';
import { useNounBalance } from '../hooks/useNounBalance';

interface ViewToggleProps {
  value: AppView;
  onChange: (value: AppView) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const { hasNoun, balance } = useNounBalance();
  const wrapperClass = ['neo-toggle', className].filter(Boolean).join(' ');

  // Check if user can create proposals (has at least 1 token)
  const canCreateProposal = hasNoun && balance > 0;

  // Show propose tab only in development environment
  const showProposeTab = import.meta.env.DEV && canCreateProposal;

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
      {showProposeTab && (
        <>
          <div className="neo-toggle-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onChange('propose')}
            className={`neo-toggle-option ${value === 'propose' ? 'active' : ''}`}
            aria-pressed={value === 'propose'}
          >
            Propose
          </button>
        </>
      )}
    </div>
  );
}
