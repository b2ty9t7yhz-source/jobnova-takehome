import { Bookmark, BriefcaseBusiness, CircleUserRound, FileText } from "lucide-react";

interface MobileNavProps {
  activeTab: "matched" | "saved";
  onTabChange: (tab: "matched" | "saved") => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button
        className={activeTab === "matched" ? "is-active" : ""}
        type="button"
        onClick={() => onTabChange("matched")}
        aria-pressed={activeTab === "matched"}
      >
        <BriefcaseBusiness size={19} /> Jobs
      </button>
      <button
        className={activeTab === "saved" ? "is-active" : ""}
        type="button"
        onClick={() => onTabChange("saved")}
        aria-pressed={activeTab === "saved"}
      >
        <Bookmark size={19} /> Saved
      </button>
      <button type="button" disabled aria-label="Resume area is outside this prototype">
        <FileText size={19} /> Resume
      </button>
      <button type="button" disabled aria-label="Profile area is outside this prototype">
        <CircleUserRound size={19} /> Profile
      </button>
    </nav>
  );
}
