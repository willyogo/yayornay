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
        <div className="absolute left-0 flex items-center gap-2">
          <img
            src="/.well-known/logo.png"
            alt="YAYNAY Logo"
            className="w-14 h-14 object-contain"
          />
        </div>
        <ViewToggle value={view} onChange={onChange} />
      </div>
    </header>
  );
}
