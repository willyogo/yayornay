import { useEnsProfile } from '../hooks/useEnsProfile';

interface EnsNameProps {
  address: string;
  className?: string;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
}

const avatarSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function EnsName({ address, className = '', showAvatar = false, avatarSize = 'sm' }: EnsNameProps) {
  const { displayName, avatar, isLoading } = useEnsProfile(address);

  if (isLoading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {showAvatar && avatar && (
        <img
          src={avatar}
          alt={displayName}
          className={`${avatarSizes[avatarSize]} rounded-full`}
        />
      )}
      <span className={className}>{displayName}</span>
    </span>
  );
}
