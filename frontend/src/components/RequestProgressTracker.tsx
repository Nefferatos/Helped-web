import { CheckCircle2, Circle, XCircle } from "lucide-react";
import {
  type RequestRecord,
  getRequestProgressSteps,
  getRequestCurrentStepIndex,
  requestWhatsHappening,
  requestWhatsNext,
  requestNeedsUserAction,
  requestStatusMeta,
} from "@/lib/requests";

const C = {
  teal: "#0E4E5E", tealMid: "#145F72", tealPale: "#E4F4F8",
  tealBorder: "rgba(14,78,94,0.22)", amberPale: "#FFFBEB",
  text: "#07181E", textMuted: "#3A6374", border: "#B6D9E4",
  surface: "#EEF8FB", white: "#FFFFFF",
};

export const ProgressTimeline = ({ request }: { request: RequestRecord }) => {
  const steps = getRequestProgressSteps(request);
  const currentIdx = getRequestCurrentStepIndex(request.status);
  const isClosed = request.status === "rejected";

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes pulse-ring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.7}}`}</style>
      {steps.map((step, idx) => {
        const isCompleted = !isClosed && idx < currentIdx;
        const isCurrent = !isClosed && idx === currentIdx;
        const isClosedStep = isClosed && idx === steps.length - 1;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                background: isCompleted ? C.teal : isCurrent ? C.white : isClosedStep ? "#FEE2E2" : C.surface,
                border: isCurrent ? `3px solid ${C.teal}` : isCompleted ? `2px solid ${C.teal}` : isClosedStep ? "2px solid #FCA5A5" : `2px solid ${C.border}`,
                boxShadow: isCurrent ? `0 0 0 4px ${C.tealBorder}` : "none",
              }}>
                {isCompleted ? <CheckCircle2 style={{ width: 14, height: 14, color: C.white }} />
                  : isCurrent ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.teal, animation: "pulse-ring 2s infinite" }} />
                    : isClosedStep ? <XCircle style={{ width: 14, height: 14, color: "#EF4444" }} />
                      : <Circle style={{ width: 10, height: 10, color: C.border }} />}
              </div>
              {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: isCompleted ? C.teal : C.border, opacity: isCompleted ? 1 : 0.5, margin: "4px 0" }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: isCurrent ? 800 : isCompleted ? 700 : 500, color: isCurrent ? C.teal : isCompleted ? C.text : isClosedStep ? "#DC2626" : C.textMuted, margin: 0 }}>
                {step.label}
              </p>
              {(isCurrent || isCompleted || isClosedStep) && (
                <p style={{ fontSize: 11, color: isClosedStep ? "#DC2626" : C.textMuted, margin: "3px 0 0 0", lineHeight: 1.5 }}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── StatusSummary: "What's happening" card ── */
export const StatusSummary = ({ request }: { request: RequestRecord }) => {
  const happening = requestWhatsHappening(request);
  const next = requestWhatsNext(request);
  const needsAction = requestNeedsUserAction(request.status);
  const meta = requestStatusMeta[request.status];

  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${needsAction ? "rgba(14,165,233,0.3)" : C.tealBorder}`,
      background: needsAction ? "linear-gradient(135deg, rgba(14,165,233,0.06), rgba(14,78,94,0.06))" : `linear-gradient(135deg, ${C.tealPale}60, ${C.amberPale}60)`,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${meta.badgeClassName}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClassName}`} />
          {meta.label}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.6 }}>{happening}</p>
      {next && (
        <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0 0", lineHeight: 1.6 }}>
          <strong style={{ color: C.tealMid }}>Next:</strong> {next}
        </p>
      )}
      {needsAction && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(14,165,233,0.10)", border: "1px solid rgba(14,165,233,0.20)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0369A1", margin: 0 }}>⚡ Your review is needed</p>
          <p style={{ fontSize: 11, color: "#0369A1", margin: "3px 0 0 0", opacity: 0.8 }}>We've recommended candidates for you. Review them and let us know.</p>
        </div>
      )}
    </div>
  );
};

/* ── RequestSummary: compact card for listing ── */
export const RequestSummary = ({
  request, onSelect, isSelected,
}: {
  request: RequestRecord; onSelect: () => void; isSelected: boolean;
}) => {
  const meta = requestStatusMeta[request.status];
  const needsAction = requestNeedsUserAction(request.status);
  const currentStepIdx = getRequestCurrentStepIndex(request.status);
  const steps = getRequestProgressSteps(request);
  const currentStep = currentStepIdx >= 0 && currentStepIdx < steps.length ? steps[currentStepIdx] : null;
  const isDirect = request.type === "direct";
  const maidName = request.maids?.[0]?.fullName;
  const typeLabel = isDirect ? "Direct Request" : "General Request";
  const reqId = `MR-${String(request.id).slice(-4).toUpperCase()}`;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(request.updatedAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <button type="button" onClick={onSelect} style={{
      width: "100%", textAlign: "left", borderRadius: 14,
      border: isSelected ? `2px solid ${C.teal}` : needsAction ? "2px solid rgba(14,165,233,0.25)" : `1.5px solid ${C.border}`,
      background: isSelected ? `linear-gradient(135deg, ${C.tealPale}, ${C.amberPale}40)` : C.white,
      padding: "14px 16px", cursor: "pointer", transition: "all 0.18s ease",
      boxShadow: isSelected ? `0 4px 20px ${C.tealBorder}` : "0 1px 4px rgba(0,0,0,0.04)",
      position: "relative",
    }}>
      {needsAction && (
        <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#0EA5E9" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.tealMid, letterSpacing: "0.08em" }}>{reqId}</span>
        <span style={{ fontSize: 10, color: C.textMuted }}>•</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{typeLabel}</span>
      </div>
      {maidName && <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px 0" }}>{maidName}</p>}
      {currentStep && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClassName}`} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{currentStep.label}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>Updated {timeAgo}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${meta.badgeClassName}`}>{meta.label}</span>
      </div>
    </button>
  );
};

