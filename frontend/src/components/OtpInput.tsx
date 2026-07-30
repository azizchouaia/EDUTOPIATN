import { useEffect, useRef, useState } from "react";

// ── 6-box OTP input ─────────────────────────────────────────────────────────
export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<HTMLInputElement[]>([]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const next = value.split("");
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const next = value.split("");
        next[idx - 1] = "";
        onChange(next.join(""));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const padded = value.padEnd(6, " ").split("");
    padded[idx] = char;
    onChange(padded.join("").trimEnd());
    if (idx < 5) refs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
      e.preventDefault();
    }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { if (el) refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ""}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onClick={() => refs.current[idx]?.select()}
          className="h-12 w-10 rounded-lg border border-input bg-background text-center text-lg font-bold text-bordeaux shadow-sm transition-all focus:border-bordeaux focus:outline-none focus:ring-2 focus:ring-gold/50"
          aria-label={`Chiffre ${idx + 1}`}
        />
      ))}
    </div>
  );
}

// ── Resend countdown hook ────────────────────────────────────────────────────
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(0);

  function start() {
    setRemaining(seconds);
    clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(timerRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { remaining, start, active: remaining > 0 };
}
