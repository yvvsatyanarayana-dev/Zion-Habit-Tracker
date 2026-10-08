import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        padding: '2px',
        backgroundColor: checked ? 'var(--status-success)' : 'var(--bg-surface-subtle)',
        borderColor: checked ? 'var(--status-success)' : 'var(--border-medium)',
      }}
      className={`rounded-full border transition-all duration-200 ease-in-out relative inline-flex items-center cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none shadow-inner ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--border-strong)]'
      }`}
    >
      <span
        style={{
          width: '18px',
          height: '18px',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
        className="rounded-full bg-white transition-transform duration-200 ease-in-out pointer-events-none block flex-shrink-0"
      />
    </button>
  );
};
