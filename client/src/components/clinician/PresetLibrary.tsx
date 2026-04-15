import { INSTRUCTION_PRESETS, type InstructionPreset } from './presets';

interface PresetLibraryProps {
  onSelect: (preset: InstructionPreset) => void;
  activeId: string | null;
}

export default function PresetLibrary({ onSelect, activeId }: PresetLibraryProps) {
  return (
    <aside aria-label="Instruction presets" className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
        Presets
      </p>
      <ul className="space-y-1">
        {INSTRUCTION_PRESETS.map((preset) => {
          const isActive = activeId === preset.id;
          return (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => onSelect(preset)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-1 focus:ring-offset-white ${
                  isActive
                    ? 'border-forest-600 bg-forest-50 text-forest-800'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span className="block font-medium">{preset.titleEn}</span>
                <span className="block text-xs text-stone-500">
                  {preset.titleEs}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
