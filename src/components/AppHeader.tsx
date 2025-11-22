import { ViewToggle } from './ViewToggle';

type ViewOption = 'landing' | 'auction';

interface AppHeaderProps {
  view: ViewOption;
  onChange: (view: ViewOption) => void;
}

export function AppHeader({ view, onChange }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto relative flex items-center justify-center">
        <div className="absolute left-0 flex items-center gap-2">
          <img
            src="/.well-known/logo.png"
            alt="YAYNAY Logo"
            className="w-10 h-10 object-contain"
          />
        </div>
        <ViewToggle value={view} onChange={onChange} />
      </div>
    </header>
  );
}
