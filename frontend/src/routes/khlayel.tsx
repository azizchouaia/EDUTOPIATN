import { useState, useRef, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BrainCircuit, Send, ChevronRight, ChevronDown, BookOpen, PenLine,
  Dumbbell, Lightbulb, Loader2, Plus, BarChart2,
  MessageSquare, Sparkles, Trophy, AlertTriangle,
  CheckCircle2, BookMarked, FlaskConical, Paperclip, X, FileText,
  Copy, Check, ArrowDown, ThumbsUp, ThumbsDown, RefreshCw, Trash2, ChevronsRight,
} from "lucide-react";
import api, { API_ORIGIN } from "@/lib/api";
import "katex/dist/katex.min.css";
import katex from "katex";
import DOMPurify from "dompurify";

// The model's markdown/LaTeX output is rendered via dangerouslySetInnerHTML —
// sanitize it so a malicious instruction (e.g. hidden in an uploaded PDF)
// can't inject <script>/<img onerror> and exfiltrate the JWT.
function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, mathMl: true, svg: true } });
}

export const Route = createFileRoute("/khlayel")({
  component: KhlayelPage,
});

// ── Types ────────────────────────────────────────────────────
type Mode = "tutor" | "corrector" | "resume" | "exercice";

interface GraphSpec {
  type: "function_graph";
  renderer: "desmos";
  expressions: { id: string; latex: string; color?: string }[];
  bounds?: { xmin: number; xmax: number; ymin: number; ymax: number };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  graph_spec?: GraphSpec | null;
  mode?: Mode;
  message_id?: number | null;
  feedback?: "up" | "down" | null;
  streaming?: boolean;
}

interface Conversation {
  id: number;
  mode: Mode;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// ── Callout block parser ──────────────────────────────────────
type Block =
  | { kind: "thm" | "def" | "meth" | "ex" | "att" | "conc"; content: string }
  | { kind: "text"; content: string };

function parseBlocks(text: string): Block[] {
  const TAGS = ["THM", "DEF", "METH", "EX", "ATT", "CONC"];
  const pattern = new RegExp(`\\[(${TAGS.join("|")})\\]([\\s\\S]*?)\\[\\/\\1\\]`, "g");
  const blocks: Block[] = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      blocks.push({ kind: "text", content: text.slice(last, match.index) });
    }
    blocks.push({ kind: match[1].toLowerCase() as Block["kind"], content: match[2].trim() });
    last = match.index + match[0].length;
  }
  if (last < text.length) blocks.push({ kind: "text", content: text.slice(last) });
  return blocks;
}

// ── KaTeX + Markdown renderer ─────────────────────────────────
function inlineFmt(text: string, math: string[]): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="kh-code">$1</code>')
    .replace(/\x00M(\d+)\x00/g, (_m, i) => {
      const e = math[+i];
      const disp = e.startsWith("D:");
      const expr = e.slice(2);
      try { return katex.renderToString(expr, { displayMode: disp, throwOnError: false }); }
      catch { return expr; }
    });
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => s.trim());
}

function mdToHtml(text: string): string {
  const math: string[] = [];
  const pushD = (e: string) => { math.push("D:" + e); return `\x00M${math.length - 1}\x00`; };
  const pushI = (e: string) => { math.push("I:" + e); return `\x00M${math.length - 1}\x00`; };
  let src = text
    // \[...\]  display  (multiline)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, e) => pushD(e))
    // \(...\)  inline
    .replace(/\\\((.+?)\\\)/gs,     (_m, e) => pushI(e))
    // $$...$$  display
    .replace(/\$\$([^$]+)\$\$/g,    (_m, e) => pushD(e))
    // $...$    inline
    .replace(/\$([^$\n]+)\$/g,      (_m, e) => pushI(e));

  const lines = src.split("\n");
  const out: string[] = [];
  let inList = false, ordered = false;

  const closeList = () => {
    if (inList) { out.push(ordered ? "</ol>" : "</ul>"); inList = false; }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Markdown table (| a | b | header + |---| separator). Math was extracted
    // first, so |x| inside formulas can't break the cell split.
    if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|\-]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const header = splitTableRow(line);
      let j = i + 2;
      const body: string[][] = [];
      while (j < lines.length && /^\s*\|.+\|\s*$/.test(lines[j])) { body.push(splitTableRow(lines[j])); j++; }
      // Normalize column counts — the model often emits ragged rows, which
      // makes the cell borders misalign. Pad every row to the widest one.
      const cols = Math.max(header.length, ...body.map(r => r.length));
      const pad = (r: string[]) => { while (r.length < cols) r.push(""); return r; };
      pad(header); body.forEach(pad);
      out.push('<div class="kh-table-wrap"><table class="kh-table">');
      out.push("<thead><tr>" + header.map(c => `<th>${inlineFmt(c, math) || "&nbsp;"}</th>`).join("") + "</tr></thead>");
      out.push("<tbody>" + body.map(r => "<tr>" + r.map(c => `<td>${inlineFmt(c, math) || "&nbsp;"}</td>`).join("") + "</tr>").join("") + "</tbody>");
      out.push("</table></div>");
      i = j; continue;
    }

    // Correction line markers [OK] / [KO]
    const ok = line.match(/^\[OK\]\s*(.+)/);
    if (ok) { closeList(); out.push(`<p class="kh-line kh-line-ok"><span class="kh-line-mark">✓</span><span>${inlineFmt(ok[1], math)}</span></p>`); i++; continue; }
    const ko = line.match(/^\[KO\]\s*(.+)/);
    if (ko) { closeList(); out.push(`<p class="kh-line kh-line-ko"><span class="kh-line-mark">✗</span><span>${inlineFmt(ko[1], math)}</span></p>`); i++; continue; }

    const m4 = line.match(/^####\s+(.+)/);
    const m3 = line.match(/^###\s+(.+)/);
    const m2 = line.match(/^##\s+(.+)/);
    const m1 = line.match(/^#\s+(.+)/);
    if (m4) { closeList(); out.push(`<h4 class="kh-h4">${inlineFmt(m4[1], math)}</h4>`); i++; continue; }
    if (m3) { closeList(); out.push(`<h3 class="kh-h3">${inlineFmt(m3[1], math)}</h3>`); i++; continue; }
    if (m2) { closeList(); out.push(`<h2 class="kh-h2">${inlineFmt(m2[1], math)}</h2>`); i++; continue; }
    if (m1) { closeList(); out.push(`<h1 class="kh-h1">${inlineFmt(m1[1], math)}</h1>`); i++; continue; }
    if (/^---+$/.test(line)) { closeList(); out.push('<hr class="kh-hr"/>'); i++; continue; }

    const ol = line.match(/^(\d+)\.\s+(.+)/);
    if (ol) {
      if (!inList || !ordered) { closeList(); out.push('<ol class="kh-ol">'); inList = true; ordered = true; }
      out.push(`<li>${inlineFmt(ol[2], math)}</li>`); i++; continue;
    }
    const ul = line.match(/^[*\-]\s+(.+)/);
    if (ul) {
      if (!inList || ordered) { closeList(); out.push('<ul class="kh-ul">'); inList = true; ordered = false; }
      out.push(`<li>${inlineFmt(ul[1], math)}</li>`); i++; continue;
    }
    if (line.trim() === "") { closeList(); out.push('<div class="kh-gap"></div>'); i++; continue; }
    closeList();
    out.push(`<p class="kh-p">${inlineFmt(line, math)}</p>`);
    i++;
  }
  closeList();
  return out.join("");
}

// ── Callout configs ───────────────────────────────────────────
const CALLOUT: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  thm:  { icon: <Sparkles className="h-4 w-4" />,      label: "Théorème",  cls: "kh-callout-thm"  },
  def:  { icon: <BookMarked className="h-4 w-4" />,    label: "Définition",cls: "kh-callout-def"  },
  meth: { icon: <FlaskConical className="h-4 w-4" />,  label: "Méthode",   cls: "kh-callout-meth" },
  ex:   { icon: <CheckCircle2 className="h-4 w-4" />,  label: "Exemple",   cls: "kh-callout-ex"   },
  att:  { icon: <AlertTriangle className="h-4 w-4" />, label: "Attention", cls: "kh-callout-att"   },
  conc: { icon: <Trophy className="h-4 w-4" />,        label: "Conclusion",cls: "kh-callout-conc"  },
};

// Collapsible callout box
function Callout({ kind, content }: { kind: Exclude<Block["kind"], "text">; content: string }) {
  const [open, setOpen] = useState(true);
  const cfg = CALLOUT[kind];
  return (
    <div className={`kh-callout ${cfg.cls}`}>
      <button type="button" className="kh-callout-header kh-callout-toggle" onClick={() => setOpen(o => !o)}>
        {cfg.icon}
        <span>{cfg.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto opacity-60 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div dangerouslySetInnerHTML={{ __html: sanitize(mdToHtml(content)) }} />}
    </div>
  );
}

function RichContent({ text, rtl }: { text: string; rtl?: boolean }) {
  const blocks = parseBlocks(text);
  return (
    <div className={rtl ? "kh-content kh-rtl" : "kh-content"} dir={rtl ? "rtl" : undefined}>
      {blocks.map((b, i) => {
        if (b.kind === "text") {
          return <div key={i} dangerouslySetInnerHTML={{ __html: sanitize(mdToHtml(b.content)) }} />;
        }
        return <Callout key={i} kind={b.kind} content={b.content} />;
      })}
    </div>
  );
}

// ── Desmos graph ──────────────────────────────────────────────
function DesmosGraph({ spec }: { spec: GraphSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const calc = useRef<any>(null);

  useEffect(() => {
    const init = () => {
      const D = (window as any).Desmos;
      if (!D || !ref.current) return;
      calc.current = D.GraphingCalculator(ref.current, {
        expressions: false, settingsMenu: false, zoomButtons: true, border: false, keypad: false,
      });
      if (spec.bounds) calc.current.setMathBounds({ left: spec.bounds.xmin, right: spec.bounds.xmax, bottom: spec.bounds.ymin, top: spec.bounds.ymax });
      spec.expressions.forEach(e => calc.current.setExpression({ id: e.id, latex: e.latex, color: e.color }));
    };
    if ((window as any).Desmos) { init(); }
    else {
      const s = document.createElement("script");
      s.src = "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => { calc.current?.destroy(); };
  }, [spec]);

  return (
    <div className="kh-graph">
      <div className="kh-graph-bar"><BarChart2 className="h-3.5 w-3.5" /> Graphe interactif</div>
      <div ref={ref} style={{ width: "100%", height: "300px" }} />
    </div>
  );
}

// ── Mode config ───────────────────────────────────────────────
const MODES: { id: Mode; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "tutor",     label: "Tuteur",     icon: <Lightbulb className="h-4 w-4" />, color: "#3b82f6" },
  { id: "corrector", label: "Correcteur", icon: <PenLine className="h-4 w-4" />,   color: "#10b981" },
  { id: "resume",    label: "Résumé",     icon: <BookOpen className="h-4 w-4" />,  color: "#8b5cf6" },
  { id: "exercice",  label: "Exercice",   icon: <Dumbbell className="h-4 w-4" />,  color: "#f59e0b" },
];

const QUICK_STARTS: { icon: React.ReactNode; label: string }[] = [
  { icon: <Lightbulb className="h-4 w-4 text-blue-500" />,   label: "Aide-moi avec les limites" },
  { icon: <PenLine className="h-4 w-4 text-emerald-500" />,  label: "Corrige mon exercice" },
  { icon: <BookOpen className="h-4 w-4 text-violet-500" />,  label: "Résumé Probabilités" },
  { icon: <Dumbbell className="h-4 w-4 text-amber-500" />,   label: "Génère un exercice bac" },
  { icon: <Sparkles className="h-4 w-4 text-gold" />,        label: "sbeh khir! 3andi masʾala f dérivée" },
  { icon: <Sparkles className="h-4 w-4 text-gold" />,        label: "صباح الخير، شرحلي الاحتمالات" },
];

// ── Scanned-PDF rescue ────────────────────────────────────────
// pdf-parse (backend) only reads PDFs with a text layer. Scanned PDFs (photos
// of exercises) come back empty — so we detect that here and rasterize the
// first pages into a single stitched JPEG the vision model can read.
async function pdfToImageIfScanned(file: File): Promise<File | null> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-expect-error — Vite ?url import has no type declaration
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, 3);

  // Any real text layer? Then let the backend extract it (cheaper + lossless).
  let textLen = 0;
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    textLen += tc.items.map((it: any) => it.str ?? "").join("").trim().length;
  }
  if (textLen >= 50) return null;

  // Scanned — render pages and stitch them vertically into one JPEG
  const canvases: HTMLCanvasElement[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1600 / base.width);
    const viewport = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = viewport.width; c.height = viewport.height;
    await page.render({ canvasContext: c.getContext("2d")!, viewport }).promise;
    canvases.push(c);
  }
  const width = Math.max(...canvases.map(c => c.width));
  const height = canvases.reduce((s, c) => s + c.height, 0);
  const out = document.createElement("canvas");
  out.width = width; out.height = height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const c of canvases) { ctx.drawImage(c, 0, y); y += c.height; }

  const blob = await new Promise<Blob | null>(res => out.toBlob(res, "image/jpeg", 0.82));
  if (!blob) return null;
  return new File([blob], file.name.replace(/\.pdf$/i, "") + ".jpg", { type: "image/jpeg" });
}

// ── Relative date for the sidebar ─────────────────────────────
function relativeDate(iso: string): string {
  const diffH = (Date.now() - new Date(iso).getTime()) / 3.6e6;
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.floor(diffH)} h`;
  if (diffH < 48) return "hier";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── SSE streaming client ──────────────────────────────────────
type StreamHandlers = {
  onDelta: (text: string) => void;
  onDone: (meta: any) => void;
  onError: (message: string, data?: any) => void;
};

async function streamChat(body: FormData | Record<string, unknown>, handlers: StreamHandlers) {
  const token = localStorage.getItem("token");
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api/ai/math-chat?stream=1`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isForm ? {} : { "Content-Type": "application/json" }),
      },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    handlers.onError("Erreur de connexion — réessaie.");
    return;
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return;
  }
  if (!res.ok) {
    let msg = "Erreur de connexion — réessaie.";
    let data: any = null;
    try { data = await res.json(); msg = data?.message ?? msg; } catch { /* not json */ }
    handlers.onError(msg, data);
    return;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    // Non-streamed reply (e.g. off-topic gate answer)
    const data = await res.json();
    handlers.onDone(data);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { handlers.onError("Streaming non supporté par le navigateur."); return; }
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop() ?? "";
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const obj = JSON.parse(line.slice(5).trim());
        if (obj.type === "delta") handlers.onDelta(obj.text);
        else if (obj.type === "done") handlers.onDone(obj);
        else if (obj.type === "error") handlers.onError(obj.message);
      } catch { /* partial frame — ignored */ }
    }
  }
}

// ── User bubble ───────────────────────────────────────────────
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-5 animate-kh-in">
      <div className="kh-user-bubble">{content}</div>
    </div>
  );
}

// ── Assistant card ────────────────────────────────────────────
// Heuristic: response probably got cut off if it doesn't end with typical
// closing punctuation (period, !, ?, closing bracket/paren, Arabic period, etc.)
function looksLikeTruncated(content: string): boolean {
  const trimmed = content.trimEnd();
  return !/[.!?»)\]}।۔]$/.test(trimmed);
}

function AssistantCard({
  msg, isLast, loading, onRegenerate, onFeedback, onContinue,
}: {
  msg: Message;
  isLast: boolean;
  loading: boolean;
  onRegenerate: () => void;
  onFeedback: (rating: "up" | "down") => void;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const modeInfo = MODES.find(m => m.id === msg.mode) ?? MODES[0];
  const isArabic = /[؀-ۿ]/.test(msg.content);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="flex gap-3 mb-7 animate-kh-in group">
      <div className="kh-avatar-ai flex-shrink-0">
        <BrainCircuit className="h-4 w-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Card header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-bordeaux tracking-wide">Khlayel</span>
          <span className="kh-mode-badge" style={{ color: modeInfo.color, borderColor: modeInfo.color + "40", backgroundColor: modeInfo.color + "10" }}>
            {modeInfo.icon} {modeInfo.label}
          </span>
          {msg.streaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        {/* Content card */}
        <div className="kh-assistant-card">
          <RichContent text={msg.content} rtl={isArabic} />
          {msg.graph_spec && <DesmosGraph spec={msg.graph_spec} />}
        </div>

        {/* Actions — appear once the message is complete */}
        {!msg.streaming && msg.content && (
          <div className="kh-msg-actions">
            <button onClick={copy} className="kh-action-btn" title="Copier la réponse">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {msg.message_id && (
              <>
                <button
                  onClick={() => onFeedback("up")}
                  className={`kh-action-btn ${msg.feedback === "up" ? "kh-action-active-up" : ""}`}
                  title="Bonne réponse"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onFeedback("down")}
                  className={`kh-action-btn ${msg.feedback === "down" ? "kh-action-active-down" : ""}`}
                  title="Mauvaise réponse"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {isLast && !loading && (
              <>
                <button onClick={onRegenerate} className="kh-action-btn" title="Régénérer la réponse">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {looksLikeTruncated(msg.content) && (
                  <button
                    onClick={onContinue}
                    className="kh-action-btn kh-action-continue"
                    title="La réponse semble incomplète — continuer"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold">Continuer</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4 animate-kh-in">
      <div className="kh-avatar-ai flex-shrink-0">
        <BrainCircuit className="h-4 w-4 text-gold" />
      </div>
      <div className="kh-assistant-card py-3 px-4">
        <div className="flex items-center gap-1.5">
          <div className="kh-dot" style={{ animationDelay: "0ms" }} />
          <div className="kh-dot" style={{ animationDelay: "160ms" }} />
          <div className="kh-dot" style={{ animationDelay: "320ms" }} />
          <span className="text-xs text-muted-foreground ml-1">Khlayel réfléchit…</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
function KhlayelPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [lastDetectedMode, setLastDetectedMode] = useState<Mode>("tutor");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [converting, setConverting] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationIdRef = useRef<number | null>(null);
  conversationIdRef.current = conversationId;

  // Auto-scroll the messages container only (never the window — scrollIntoView
  // would drag the whole page down to the footer on mount). Skips when the
  // user has deliberately scrolled up.
  useEffect(() => {
    const el = messagesRef.current;
    if (!el || messages.length === 0) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
  }, []);

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const startNew = useCallback(() => {
    setMessages([]); setConversationId(null); setError(null);
    setInput(""); setSelectedFile(null); setFilePreview(null); setLastDetectedMode("tutor");
  }, []);

  // ── Conversation history (sidebar) ──────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get<Conversation[]>("/ai/math-chat/conversations");
      setConversations(data);
    } catch { /* sidebar history is non-blocking */ }
  }, []);

  useEffect(() => { void fetchConversations(); }, [fetchConversations]);

  const loadConversation = useCallback(async (conv: Conversation) => {
    if (loading || conv.id === conversationIdRef.current) return;
    try {
      const { data } = await api.get<any[]>(`/ai/math-chat/conversations/${conv.id}/messages`);
      const mapped: Message[] = data.map(row => {
        let graph: GraphSpec | null = null;
        try {
          graph = typeof row.graph_spec === "string" ? JSON.parse(row.graph_spec) : row.graph_spec ?? null;
        } catch { /* malformed spec in DB */ }
        return {
          role: row.role,
          content: row.content,
          graph_spec: graph,
          message_id: row.role === "assistant" ? row.id ?? null : null,
          mode: conv.mode,
        };
      });
      setMessages(mapped);
      setConversationId(conv.id);
      setLastDetectedMode(conv.mode ?? "tutor");
      setError(null);
    } catch {
      setError("Impossible de charger cette conversation.");
    }
  }, [loading]);

  const deleteConversation = useCallback(async (id: number) => {
    try {
      await api.delete(`/ai/math-chat/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationIdRef.current === id) startNew();
    } catch {
      setError("Suppression impossible — réessaie.");
    }
  }, [startNew]);

  const applyFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type === "application/pdf") {
      // Scanned PDFs have no text layer — convert them to an image the
      // vision model can read, instead of letting the backend reject them.
      setConverting(true);
      try {
        const img = await pdfToImageIfScanned(file);
        applyFile(img ?? file);
      } catch {
        applyFile(file); // conversion failed — send the PDF as-is
      } finally {
        setConverting(false);
      }
      return;
    }
    applyFile(file);
  };

  const removeFile = () => { setSelectedFile(null); setFilePreview(null); };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    // Give it a readable name with timestamp
    const ext = file.type.split("/")[1] ?? "png";
    const named = new File([file], `image_${Date.now()}.${ext}`, { type: file.type });
    setSelectedFile(named);
    const reader = new FileReader();
    reader.onload = ev => setFilePreview(ev.target?.result as string);
    reader.readAsDataURL(named);
  }, []);

  const doSend = useCallback(async (msg: string, file: File | null, opts?: { skipUserBubble?: boolean }) => {
    setLoading(true);
    setError(null);

    if (!opts?.skipUserBubble) {
      const displayMsg = msg || (file ? `📎 ${file.name}` : "");
      setMessages(prev => [...prev, { role: "user", content: displayMsg }]);
    }

    let assistantStarted = false;
    const ensureAssistant = () => {
      if (assistantStarted) return;
      assistantStarted = true;
      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true, mode: undefined }]);
    };

    let payload: FormData | Record<string, unknown>;
    if (file) {
      const form = new FormData();
      form.append("message", msg);
      if (conversationIdRef.current) form.append("conversation_id", String(conversationIdRef.current));
      form.append("file", file);
      payload = form;
    } else {
      payload = { message: msg, conversation_id: conversationIdRef.current };
    }

    await streamChat(payload, {
      onDelta: (text) => {
        ensureAssistant();
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = { ...last, content: last.content + text };
          return next;
        });
      },
      onDone: (meta) => {
        ensureAssistant();
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: meta.content ?? last.content,
              streaming: false,
              mode: (meta.detected_mode as Mode) ?? "tutor",
              graph_spec: meta.graph_spec ?? null,
              message_id: meta.assistant_message_id ?? null,
            };
          }
          return next;
        });
        if (meta.conversation_id) setConversationId(meta.conversation_id);
        if (meta.detected_mode) setLastDetectedMode(meta.detected_mode as Mode);
        if (meta.quota) setQuota(meta.quota);
        setQuotaExceeded(false);
      },
      onError: (message, data) => {
        setError(message);
        if (data?.code === "AI_QUOTA_EXCEEDED") {
          setQuotaExceeded(true);
          if (data.quota) setQuota(data.quota);
        }
        // drop an empty streaming placeholder if nothing arrived
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming && !last.content) return prev.slice(0, -1);
          if (last?.role === "assistant" && last.streaming) return prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m);
          return prev;
        });
      },
    });

    setLoading(false);
    void fetchConversations(); // refresh sidebar (new conv title / updated_at ordering)
  }, [fetchConversations]);

  const sendMessage = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if ((!msg && !selectedFile) || loading) return;
    const fileToSend = selectedFile;
    setInput("");
    setSelectedFile(null); setFilePreview(null);
    void doSend(msg, fileToSend);
  }, [input, loading, selectedFile, doSend]);

  const regenerate = useCallback(() => {
    if (loading) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    // strip the file placeholder if any — we resend text only
    const text = lastUser.content.replace(/^📎\s.+$/, "").trim() || lastUser.content;
    setMessages(prev => {
      const next = [...prev];
      while (next.length && next[next.length - 1].role === "assistant") next.pop();
      return next;
    });
    void doSend(text, null, { skipUserBubble: true });
  }, [messages, loading, doSend]);

  const sendFeedback = useCallback(async (index: number, rating: "up" | "down") => {
    const msg = messages[index];
    if (!msg?.message_id) return;
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, feedback: rating } : m));
    try {
      await api.post("/ai/math-chat/feedback", { message_id: msg.message_id, rating });
    } catch { /* non-blocking */ }
  }, [messages]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const hasMessages = messages.length > 0;
  const currentModeInfo = MODES.find(m => m.id === lastDetectedMode) ?? MODES[0];
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i;
    return -1;
  })();
  const awaitingFirstToken = loading && messages[messages.length - 1]?.role !== "assistant";

  return (
    <div className="kh-page">
      {/* ── Left sidebar ── */}
      <aside className="kh-sidebar">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-gold/20 grid place-items-center ring-1 ring-gold/30">
            <BrainCircuit className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white leading-none">Khlayel</p>
            <p className="text-[10px] text-white/40 mt-0.5">Mathématiques · Tunisien</p>
          </div>
        </div>

        {/* New conversation */}
        <div className="px-3 py-3">
          <button onClick={startNew} className="kh-new-btn">
            <Plus className="h-4 w-4" /> Nouvelle conversation
          </button>
        </div>

        {/* Conversation history */}
        {conversations.length > 0 && (
          <div className="px-3 mt-1 flex-1 min-h-0 overflow-y-auto">
            <p className="flex items-center justify-between px-1 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Historique
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/40 tabular-nums">
                {conversations.length}
              </span>
            </p>
            {conversations.map(c => {
              const mi = MODES.find(m => m.id === c.mode) ?? MODES[0];
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void loadConversation(c)}
                  onKeyDown={e => { if (e.key === "Enter") void loadConversation(c); }}
                  className={`kh-conv-item w-full mb-1 ${c.id === conversationId ? "kh-conv-active" : ""}`}
                  title={c.title ?? "Conversation"}
                >
                  <span className="kh-conv-mode" style={{ color: mi.color, backgroundColor: mi.color + "26" }}>
                    {mi.icon}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-xs text-white/70 leading-tight">{c.title || "Conversation"}</p>
                    <p className="mt-0.5 text-[10px] text-white/30">{relativeDate(c.updated_at ?? c.created_at)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); void deleteConversation(c.id); }}
                    className="kh-conv-trash"
                    title="Supprimer la conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer — daily quota gauge (students), tagline otherwise */}
        <div className="mt-auto px-4 py-3.5 border-t border-white/10">
          {quota?.limit ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/40">
                <span>Messages aujourd'hui</span>
                <span className="font-bold text-white/70 tabular-nums">
                  {Math.min(quota.used, quota.limit)}/{quota.limit}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quota.used >= quota.limit ? "bg-red-400" : quota.used >= quota.limit * 0.8 ? "bg-amber-400" : "bg-gold"
                  }`}
                  style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-white/25 leading-relaxed">
              Spécialisé programme tunisien<br />Français · عربي · Darija
            </p>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="kh-main">
        {/* Messages */}
        <div className="kh-messages" ref={messagesRef} onScroll={onScroll}>
          <div className="kh-thread">
            {!hasMessages ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center text-center gap-8 py-16 px-6 min-h-full">
                <div className="relative">
                  <div className="kh-hero-avatar">
                    <BrainCircuit className="h-12 w-12 text-gold" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <h2 className="kh-hero-title">Bonjour ! Je suis Khlayel 👋</h2>
                  <p className="text-muted-foreground max-w-md leading-relaxed mt-3">
                    Ton assistant maths pour le programme tunisien.<br />
                    Tu peux me parler en <strong>français</strong>, <strong>عربي</strong>, ou <strong>darija</strong> — je m'adapte !
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                  {QUICK_STARTS.map(s => (
                    <button key={s.label} onClick={() => sendMessage(s.label)}
                      className="kh-quick-btn group">
                      <span className="kh-quick-icon">{s.icon}</span>
                      <span className="text-left flex-1 text-sm">{s.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) =>
                msg.role === "user"
                  ? <UserBubble key={i} content={msg.content} />
                  : (
                    <AssistantCard
                      key={i}
                      msg={msg}
                      isLast={i === lastAssistantIndex}
                      loading={loading}
                      onRegenerate={regenerate}
                      onFeedback={(rating) => sendFeedback(i, rating)}
                      onContinue={() => sendMessage("Continuez.")}
                    />
                  )
              )
            )}

            {awaitingFirstToken && <TypingIndicator />}
            {error && (
              <div className="mx-auto max-w-lg mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
                <p>{error}</p>
                {quotaExceeded && (
                  <Link
                    to="/subscriptions"
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-bordeaux px-4 py-2 text-xs font-semibold text-white shadow-elegant transition-transform hover:scale-105"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Voir les abonnements
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scroll-to-bottom */}
        {showScrollDown && hasMessages && (
          <button onClick={scrollToBottom} className="kh-scroll-down" title="Aller en bas">
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* Input area */}
        <div className="kh-input-area">
          <div className="kh-thread">
            {/* File preview */}
            {selectedFile && (
              <div className="kh-file-preview">
                {filePreview ? (
                  <img src={filePreview} alt="preview" className="kh-file-thumb" />
                ) : (
                  <div className="kh-file-icon"><FileText className="h-5 w-5 text-bordeaux" /></div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate">{selectedFile.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedFile.type.startsWith("image/") ? "📷 Image" : "📄 PDF"} · {(selectedFile.size / 1024).toFixed(0)} Ko
                  </span>
                </div>
                <button onClick={removeFile} className="ml-auto p-1 rounded-full hover:bg-muted transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}

            <div className="kh-input-wrapper">
              {/* Mode pill — shows auto-detected mode */}
              <div className="kh-input-mode" style={{ color: currentModeInfo.color }}>
                {currentModeInfo.icon}
                <span className="text-xs font-semibold hidden sm:inline">{currentModeInfo.label}</span>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onPaste={handlePaste}
                placeholder={selectedFile ? "Ajoute un message (optionnel)…" : "Pose ta question, demande un résumé, colle ton exercice…"}
                rows={1}
                disabled={loading}
                className="kh-textarea"
              />

              {/* File upload button */}
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={pickFile} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={loading || converting}
                className="kh-attach-btn" title={converting ? "Conversion du PDF…" : "Joindre une image ou un PDF"}>
                {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>

              <button onClick={() => sendMessage()} disabled={(!input.trim() && !selectedFile) || loading}
                className="kh-send-btn">
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Send className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground/40 mt-2">
              {quota?.limit ? (
                <span className={quota.used >= quota.limit ? "font-semibold text-destructive/70" : quota.used >= quota.limit * 0.8 ? "font-semibold text-amber-600/80" : ""}>
                  {Math.min(quota.used, quota.limit)}/{quota.limit} messages aujourd'hui ·{" "}
                </span>
              ) : null}
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · Coller une image avec Ctrl+V
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
