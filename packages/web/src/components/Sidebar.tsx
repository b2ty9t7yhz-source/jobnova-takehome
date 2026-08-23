import {
  Bookmark,
  Bot,
  BriefcaseBusiness,
  CircleUserRound,
  FileText,
  Gift,
  Settings,
  Sparkles,
} from "lucide-react";
import { Brand } from "./Brand";

const primaryItems = [
  { label: "Jobs", icon: BriefcaseBusiness, active: true },
  { label: "AI Mock Interview", icon: Bot },
  { label: "Resume", icon: FileText },
  { label: "Profile", icon: CircleUserRound },
  { label: "Settings", icon: Settings },
];

const accountItems = [
  { label: "Subscription", icon: Bookmark },
  { label: "Extra credits", icon: Gift },
];

interface SidebarProps {
  onSelect: (label: string) => void;
}

export function Sidebar({ onSelect }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Brand />
      <nav className="sidebar-nav">
        <div className="nav-group">
          {primaryItems.map(({ label, icon: Icon, active }) => (
            <button
              className={`nav-item ${active ? "is-active" : ""}`}
              key={label}
              type="button"
              onClick={() => onSelect(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="nav-divider" />
        <div className="nav-group">
          {accountItems.map(({ label, icon: Icon }) => (
            <button className="nav-item" key={label} type="button" onClick={() => onSelect(label)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="upgrade-card">
        <span className="upgrade-icon" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <p className="eyebrow">Unlock JobNova Plus</p>
        <h2>Upgrade your plan</h2>
        <p>Deeper match insights and unlimited mock interviews.</p>
        <button type="button" onClick={() => onSelect("Plans")}>View plans</button>
      </div>
    </aside>
  );
}
