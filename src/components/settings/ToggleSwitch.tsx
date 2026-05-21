'use client';

interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, label, hint, onChange }: ToggleSwitchProps) {
  return (
    <div className="tgl">
      <div className="tgl-text">
        <span className="tgl-label">{label}</span>
        {hint && <p className="tgl-hint">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`tgl-sw${checked ? ' tgl-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="tgl-thumb" />
      </button>
      <style jsx>{`
        .tgl {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(190, 149, 82, 0.12);
        }
        .tgl:last-child {
          border-bottom: none;
        }
        .tgl-text {
          flex: 1;
          min-width: 0;
        }
        .tgl-label {
          font-size: 13px;
          font-weight: 800;
          color: #4d3b2c;
          display: block;
        }
        .tgl-hint {
          font-size: 11px;
          color: #8a7764;
          margin: 3px 0 0;
          line-height: 1.5;
        }
        .tgl-sw {
          width: 46px;
          height: 26px;
          border-radius: 999px;
          border: 0;
          background: #d9cbbb;
          padding: 3px;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s ease;
          position: relative;
        }
        .tgl-sw.tgl-on {
          background: #c99b4f;
        }
        .tgl-thumb {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
        }
        .tgl-sw.tgl-on .tgl-thumb {
          transform: translateX(20px);
        }
        :global([dir='rtl']) .tgl-sw.tgl-on .tgl-thumb {
          transform: translateX(-20px);
        }
      `}</style>
    </div>
  );
}
