import { ArrowUpRight, Bot, CheckCircle2, Sparkles } from "lucide-react";

interface InterviewPanelProps {
  onStart: () => void;
}

export function InterviewPanel({ onStart }: InterviewPanelProps) {
  return (
    <aside className="interview-panel">
      <div className="panel-orb orb-one" />
      <div className="panel-orb orb-two" />
      <div className="panel-content">
        <span className="panel-icon">
          <Bot size={20} />
        </span>
        <p className="eyebrow">Practice with context</p>
        <h2>Ace your interview with an AI-powered mock session</h2>
        <p className="panel-intro">
          Rehearse questions tailored to the role, then get concrete feedback on clarity and evidence.
        </p>
        <ul>
          <li>
            <CheckCircle2 size={16} /> Job-specific questions
          </li>
          <li>
            <CheckCircle2 size={16} /> Actionable feedback
          </li>
          <li>
            <CheckCircle2 size={16} /> Private practice workspace
          </li>
        </ul>
        <button className="dark-button full" type="button" onClick={onStart}>
          <Sparkles size={16} /> Start mock interview <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="trust-note">
        <strong>Designed for deliberate practice</strong>
        <span>Your recordings are never shared with employers.</span>
      </div>
    </aside>
  );
}
