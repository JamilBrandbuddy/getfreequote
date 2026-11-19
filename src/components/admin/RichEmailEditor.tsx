import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Image, Undo2, Redo2, Heading2, Pilcrow, Minus, MousePointerClick, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ctaButtonHtml, LOGO_URL } from "@/lib/email-campaign";

const COLORS = ["#1e293b", "#0b2545", "#b91c1c", "#15803d", "#c2410c", "#64748b"];

export function RichEmailEditor({ value, onChange, label = "Email body" }: { value: string; onChange: (html: string) => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);
  const emit = () => onChange(ref.current?.innerHTML ?? "");
  const keep = () => { const s = window.getSelection(); if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0); };
  const restore = () => { ref.current?.focus(); const s = window.getSelection(); if (saved.current && s) { s.removeAllRanges(); s.addRange(saved.current); } };
  const cmd = (c: string, v?: string) => { restore(); document.execCommand(c, false, v); emit(); };
  const insert = (html: string) => { restore(); document.execCommand("insertHTML", false, html); emit(); };
  const B = ({ t, on, children }: { t: string; on: () => void; children: React.ReactNode }) => (
    <Button type="button" size="icon" variant="ghost" className="size-8" title={t} aria-label={t} onMouseDown={(e) => e.preventDefault()} onClick={on}>{children}</Button>
  );
  return (
    <div className="rounded-xl border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1" role="toolbar" aria-label="Formatting">
        <B t="Undo" on={() => cmd("undo")}><Undo2 className="size-4" /></B><B t="Redo" on={() => cmd("redo")}><Redo2 className="size-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        <B t="Heading" on={() => cmd("formatBlock", "<h2>")}><Heading2 className="size-4" /></B><B t="Paragraph" on={() => cmd("formatBlock", "<p>")}><Pilcrow className="size-4" /></B>
        <B t="Bold" on={() => cmd("bold")}><Bold className="size-4" /></B><B t="Italic" on={() => cmd("italic")}><Italic className="size-4" /></B><B t="Underline" on={() => cmd("underline")}><Underline className="size-4" /></B>
        <Popover><PopoverTrigger asChild><Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Text colour" onMouseDown={(e) => { e.preventDefault(); keep(); }}><span className="size-4 rounded-full border border-border bg-gradient-to-br from-primary to-destructive" /></Button></PopoverTrigger>
          <PopoverContent className="flex w-auto gap-1 p-2">{COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} className="size-6 rounded-full border border-border" style={{ background: c }} onClick={() => { document.execCommand("styleWithCSS", false, "true"); cmd("foreColor", c); }} />)}</PopoverContent></Popover>
        <span className="mx-1 h-5 w-px bg-border" />
        <B t="Align left" on={() => cmd("justifyLeft")}><AlignLeft className="size-4" /></B><B t="Align centre" on={() => cmd("justifyCenter")}><AlignCenter className="size-4" /></B><B t="Align right" on={() => cmd("justifyRight")}><AlignRight className="size-4" /></B>
        <B t="Bullet list" on={() => cmd("insertUnorderedList")}><List className="size-4" /></B><B t="Numbered list" on={() => cmd("insertOrderedList")}><ListOrdered className="size-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        <UrlPop label="Insert link" icon={<Link2 className="size-4" />} keep={keep} fields={["Link text", "https:// address"]} onDone={([t, u]) => /^https:\/\//i.test(u) && insert(`<a href="${u.replace(/"/g, "")}">${(t || u).replace(/</g, "&lt;")}</a>`)} />
        <UrlPop label="Insert image" icon={<Image className="size-4" />} keep={keep} fields={["Image https:// address", "Description (alt text)"]} onDone={([u, a]) => /^https:\/\//i.test(u) && insert(`<img src="${u.replace(/"/g, "")}" alt="${(a || "").replace(/"/g, "")}" style="max-width:100%;height:auto;display:block" width="560">`)} />
        <UrlPop label="Insert button" icon={<MousePointerClick className="size-4" />} keep={keep} fields={["Button label", "https:// address"]} onDone={([l, u]) => { const h = ctaButtonHtml(l, u); if (h) insert(h); }} />
        <B t="Insert Riverbend logo" on={() => insert(`<p style="text-align:center"><img src="${LOGO_URL}" alt="Riverbend Autoglass" width="160" style="width:160px;height:auto"></p>`)}><Stamp className="size-4" /></B>
        <B t="Divider" on={() => insert("<hr>")}><Minus className="size-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        {["{{customer_name}}", "{{service_type}}"].map((v) => <Button key={v} type="button" size="sm" variant="ghost" className="h-8 px-2 font-mono text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(v)}>{v}</Button>)}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label={label} onInput={emit} onBlur={() => { keep(); emit(); }} onKeyUp={keep} onMouseUp={keep}
        className="prose prose-sm min-h-[280px] max-w-none p-4 text-foreground focus:outline-none [&_h2]:text-xl [&_h2]:font-semibold [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" />
    </div>
  );
}

function UrlPop({ label, icon, fields, onDone, keep }: { label: string; icon: React.ReactNode; fields: string[]; onDone: (v: string[]) => void; keep: () => void }) {
  const [open, setOpen] = useState(false); const [vals, setVals] = useState<string[]>(fields.map(() => ""));
  const bad = vals.some((v, i) => fields[i].includes("https") && v && !/^https:\/\/\S+$/i.test(v));
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setVals(fields.map(() => "")); }}>
      <PopoverTrigger asChild><Button type="button" size="icon" variant="ghost" className="size-8" title={label} aria-label={label} onMouseDown={(e) => { e.preventDefault(); keep(); }}>{icon}</Button></PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <p className="text-sm font-medium">{label}</p>
        {fields.map((f, i) => <Input key={f} placeholder={f} aria-label={f} value={vals[i]} onChange={(e) => setVals((s) => s.map((x, j) => (j === i ? e.target.value : x)))} />)}
        {bad && <p className="text-xs text-destructive">Only secure https:// links are allowed.</p>}
        <Button type="button" size="sm" disabled={bad || !vals.some(Boolean)} onClick={() => { onDone(vals); setOpen(false); }}>Insert</Button>
      </PopoverContent>
    </Popover>
  );
}
