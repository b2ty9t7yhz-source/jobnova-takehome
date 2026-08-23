import { useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";
import type { JobFilters, WorkMode } from "../types";

interface FilterSheetProps {
  open: boolean;
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  onClose: () => void;
  onReset: () => void;
}

const workModes: Array<"All" | WorkMode> = ["All", "Remote", "Hybrid", "On-site"];

export function FilterSheet({ open, filters, onChange, onClose, onReset }: FilterSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("keydown", handleKeyboard);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className="filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Refine recommendations</p>
            <h2 id="filter-heading">Filters</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={19} />
          </button>
        </div>
        <fieldset>
          <legend>Work arrangement</legend>
          <div className="segmented-options">
            {workModes.map((mode) => (
              <button
                className={filters.workMode === mode ? "is-selected" : ""}
                key={mode}
                type="button"
                onClick={() => onChange({ ...filters, workMode: mode })}
              >
                {mode}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <div className="range-label">
            <legend>Minimum match</legend>
            <strong>{filters.minimumMatch}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={filters.minimumMatch}
            onChange={(event) => onChange({ ...filters, minimumMatch: Number(event.target.value) })}
            aria-label="Minimum match score"
          />
          <div className="range-scale">
            <span>Any match</span>
            <span>Best matches</span>
          </div>
        </fieldset>
        <div className="sheet-footer">
          <button className="secondary-button" type="button" onClick={onReset}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="dark-button" type="button" onClick={onClose}>
            Show recommendations
          </button>
        </div>
      </section>
    </div>
  );
}
