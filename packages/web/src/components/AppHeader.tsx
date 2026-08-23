import { Bell, ChevronDown, Menu } from "lucide-react";
import { Brand } from "./Brand";

interface AppHeaderProps {
  activeTab: "matched" | "saved";
  matchedCount: number;
  savedCount: number;
  onTabChange: (tab: "matched" | "saved") => void;
  onMenuOpen: () => void;
  onNotificationsOpen: () => void;
  onProfileOpen: () => void;
}

export function AppHeader({
  activeTab,
  matchedCount,
  savedCount,
  onTabChange,
  onMenuOpen,
  onNotificationsOpen,
  onProfileOpen,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="mobile-brand-row">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Open navigation"
          onClick={onMenuOpen}
        >
          <Menu size={20} />
        </button>
        <Brand />
      </div>
      <nav className="status-tabs" aria-label="Job status">
        <button
          className={activeTab === "matched" ? "is-active" : ""}
          onClick={() => onTabChange("matched")}
          type="button"
          aria-label="Show matched jobs"
          aria-pressed={activeTab === "matched"}
        >
          Matched
          <span>{matchedCount}</span>
        </button>
        <button
          className={activeTab === "saved" ? "is-active" : ""}
          onClick={() => onTabChange("saved")}
          type="button"
          aria-label="Show saved jobs"
          aria-pressed={activeTab === "saved"}
        >
          Saved
          <span>{savedCount}</span>
        </button>
        <button type="button" disabled>
          Applied
          <span>0</span>
        </button>
      </nav>
      <div className="header-actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Notifications"
          onClick={onNotificationsOpen}
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <button
          className="profile-button"
          type="button"
          aria-label="Open profile menu"
          onClick={onProfileOpen}
        >
          <span className="avatar">JZ</span>
          <span className="profile-copy">
            <strong>Jinhan</strong>
            <small>Candidate</small>
          </span>
          <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}
