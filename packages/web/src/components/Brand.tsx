import { Sparkles } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="JobNova home">
      <span className="brand-mark" aria-hidden="true">
        <Sparkles size={17} strokeWidth={2.7} />
      </span>
      <span>JobNova</span>
    </div>
  );
}
