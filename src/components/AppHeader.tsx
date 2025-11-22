import { ViewToggle } from './ViewToggle';
import { AppView } from '../types/view';

interface AppHeaderProps {
  view: AppView;
  onChange: (view: AppView) => void;
}

export function AppHeader({ view, onChange }: AppHeaderProps) {
  return (
    <header className="bg-white p-4">
      <div className="max-w-7xl mx-auto relative flex items-center justify-center">
        <ViewToggle value={view} onChange={onChange} />
      </div>
    </header>
  );
}
