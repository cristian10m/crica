import { useState, useRef, useEffect, useMemo } from "react";
import QRCodeStyling from "qr-code-styling";
import {
  ArrowLeft, RefreshCw, Download, Upload, QrCode, FileImage, Image as ImageIcon, X,
} from "lucide-react";
import { Card, Btn, PageHead } from "../components/ui";

const TOOLS = [
  { id: "convert", name: "Format converter", desc: "Convert images between PNG, JPG, WEBP and more. Drop a file, pick a format, download.", icon: FileImage },
  { id: "qr", name: "QR generator", desc: "Make custom QR codes with your colours, shapes, a logo and a transparent background.", icon: QrCode },
];

export function ToolsTab() {
  const [open, setOpen] = useState(null);

  if (open === "convert") return <Converter onClose={() => setOpen(null)} />;
  if (open === "qr") return <QrTool onClose={() => setOpen(null)} />;

  return (
    <div className="page">
      <PageHead title="Tools" subtitle="Handy utilities that run right here on your device. Nothing is uploaded or synced." />
      <div className="tools-grid">
        {TOOLS.map((t) => (
          <button key={t.id} className="tool-card" onClick={() => setOpen(t.id)}>
            <span className="tool-ic"><t.icon size={22} /></span>
            <span className="tool-name">{t.name}</span>
            <span className="tool-desc">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Format converter ------------------------- */

const OUT = [
  { mime: "image/png", ext: "png", label: "PNG", lossy: false, alpha: true },
  { mime: "image/jpeg", ext: "jpg", label: "JPG", lossy: true, alpha: false },
  { mime: "image/webp", ext: "webp", label: "WEBP", lossy: true, alpha: true },
  { mime: "image/avif", ext: "avif", label: "AVIF", lossy: true, alpha: true },
  { mime: "bmp", ext: "bmp", label: "BMP", lossy: false, alpha: false },
  { mime: "svg", ext: "svg", label: "SVG", lossy: false, alpha: true },
];

// 24-bit BMP encoder (canvas.toBlob does not support BMP).
function encodeBMP(canvas) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const rowSize = (w * 3 + 3) & ~3;
  const pixSize = rowSize * h;
  const buf = new ArrayBuffer(54 + pixSize);
  const dv = new DataView(buf);
  dv.setUint8(0, 0x42); dv.setUint8(1, 0x4D);
  dv.setUint32(2, 54 + pixSize, true); dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true); dv.setInt32(18, w, true); dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true); dv.setUint16(28, 24, true); dv.setUint32(34, pixSize, true);
  dv.setInt32(38, 2835, true); dv.setInt32(42, 2835, true);
  let off = 54;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; dv.setUint8(off++, data[i + 2]); dv.setUint8(off++, data[i + 1]); dv.setUint8(off++, data[i]); }
    for (let p = 0; p < rowSize - w * 3; p++) dv.setUint8(off++, 0);
  }
  return new Blob([buf], { type: "image/bmp" });
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function Converter({ onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [out, setOut] = useState("image/png");
  const [quality, setQuality] = useState(92);
  const [jpgBg, setJpgBg] = useState("#ffffff");
  const [outW, setOutW] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const inputRef = useRef(null);

  const pick = (f) => {
    if (!f) return;
    setError(""); setDone("");
    setFile(f);
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(f); });
  };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const outDef = OUT.find((o) => o.mime === out);

  const convert = async () => {
    if (!file) return;
    setBusy(true); setError(""); setDone("");
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      let w = img.naturalWidth || 0, h = img.naturalHeight || 0;
      if (!w || !h) { w = w || 512; h = h || 512; } // SVG with no intrinsic size
      if (outW && +outW > 0 && w) { const s = +outW / w; w = Math.round(+outW); h = Math.round(h * s); }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!outDef.alpha) { ctx.fillStyle = jpgBg; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      let blob;
      if (out === "bmp") {
        blob = encodeBMP(canvas);
      } else if (out === "svg") {
        const png = canvas.toDataURL("image/png");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${png}"/></svg>`;
        blob = new Blob([svg], { type: "image/svg+xml" });
      } else {
        const q = outDef.lossy ? Math.min(1, Math.max(0.05, quality / 100)) : undefined;
        blob = await new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("unsupported")), out, q));
      }
      downloadBlob(blob, `${base}.${outDef.ext}`);
      setDone(`Saved ${base}.${outDef.ext}`);
    } catch (e) {
      setError(out === "image/avif"
        ? "This browser can't write AVIF. Try WEBP or PNG instead."
        : "Could not convert this file. It needs to be an image the browser can open (PNG, JPG, WEBP, GIF, BMP, SVG, AVIF).");
    }
    setBusy(false);
  };

  return (
    <div className="page">
      <div className="tool-head">
        <button className="tool-back" onClick={onClose}><ArrowLeft size={18} /></button>
        <h2>Format converter</h2>
      </div>

      <Card>
        <div
          className={"conv-drop" + (file ? " has" : "")}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        >
          <input ref={inputRef} type="file" accept="image/*,.svg,.avif,.bmp,.gif,.webp,.jpg,.jpeg,.png" hidden
            onChange={(e) => pick(e.target.files && e.target.files[0])} />
          {file ? (
            <div className="conv-file">
              <img src={preview} alt="" className="conv-thumb" />
              <div className="conv-meta">
                <span className="conv-name">{file.name}</span>
                <span className="conv-size">{(file.size / 1024).toFixed(0)} KB</span>
              </div>
              <button className="conv-clear" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(""); setDone(""); }}><X size={16} /></button>
            </div>
          ) : (
            <div className="conv-empty"><Upload size={26} /><span>Tap to choose an image, or drop it here</span></div>
          )}
        </div>

        <div className="conv-row">
          <span className="conv-lab">Convert to</span>
          <div className="conv-formats">
            {OUT.map((o) => (
              <button key={o.mime} className={"conv-fmt" + (out === o.mime ? " on" : "")} onClick={() => setOut(o.mime)}>{o.label}</button>
            ))}
          </div>
        </div>

        {outDef.lossy && (
          <div className="conv-row">
            <span className="conv-lab">Quality {quality}</span>
            <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(+e.target.value)} className="conv-range" />
          </div>
        )}
        {!outDef.alpha && (
          <div className="conv-row">
            <span className="conv-lab">Background</span>
            <span className="conv-hint">{outDef.label} has no transparency, so see-through areas fill with this colour.</span>
            <input type="color" value={jpgBg} onChange={(e) => setJpgBg(e.target.value)} className="conv-color" />
          </div>
        )}
        <div className="conv-row">
          <span className="conv-lab">Width (optional)</span>
          <input type="number" min="1" placeholder="keep original" value={outW} onChange={(e) => setOutW(e.target.value)} className="conv-num" />
          <span className="conv-hint">px, height scales to match</span>
        </div>

        <Btn variant="primary" onClick={convert} disabled={!file || busy} className="conv-go">
          {busy ? <RefreshCw size={16} className="spin" /> : <Download size={16} />} {busy ? "Converting" : "Convert and download"}
        </Btn>
        {done && <div className="conv-done">{done}</div>}
        {error && <div className="conv-error">{error}</div>}
      </Card>

      <p className="conv-note">Runs fully on your device. Accepts PNG, JPG, WEBP, GIF, BMP, SVG and AVIF as input. Saves as PNG, JPG, WEBP, AVIF, BMP or SVG. Note: AVIF saving depends on your browser, and SVG wraps the image rather than tracing it into true vectors. Video and audio (MP4, MP3) need a separate engine, ask me to switch that on.</p>
    </div>
  );
}

/* ------------------------- QR generator ------------------------- */

const DOT_TYPES = [
  { v: "square", label: "Square" },
  { v: "rounded", label: "Rounded" },
  { v: "dots", label: "Dots" },
  { v: "classy", label: "Classy" },
  { v: "classy-rounded", label: "Classy round" },
  { v: "extra-rounded", label: "Extra round" },
];
const CORNER_TYPES = [
  { v: "square", label: "Square" },
  { v: "extra-rounded", label: "Rounded" },
  { v: "dot", label: "Dot" },
];
const EC_LEVELS = ["L", "M", "Q", "H"];
const isHex = (s) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);

function HexField({ label, value, onChange }) {
  return (
    <div className="qr-hex">
      <span className="qr-lab">{label}</span>
      <div className="qr-hex-in">
        <input type="color" value={isHex(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="qr-swatch" />
        <input type="text" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value.trim())} placeholder="#000000" className={"qr-hex-text" + (isHex(value) ? "" : " bad")} />
      </div>
    </div>
  );
}

function QrTool({ onClose }) {
  const [data, setData] = useState("https://");
  const [fg, setFg] = useState("#0071e3");
  const [bg, setBg] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [dot, setDot] = useState("rounded");
  const [corner, setCorner] = useState("extra-rounded");
  const [ec, setEc] = useState("Q");
  const [size, setSize] = useState(320);
  const [logo, setLogo] = useState("");
  const [logoSize, setLogoSize] = useState(0.4);
  const holder = useRef(null);
  const qr = useRef(null);
  const logoInput = useRef(null);

  const options = useMemo(() => ({
    width: size, height: size, type: "canvas", data: data || " ",
    margin: 10,
    image: logo || undefined,
    qrOptions: { errorCorrectionLevel: logo ? "H" : ec },
    imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: logoSize, margin: 6, crossOrigin: "anonymous" },
    dotsOptions: { type: dot, color: isHex(fg) ? fg : "#000000" },
    cornersSquareOptions: { type: corner, color: isHex(fg) ? fg : "#000000" },
    cornersDotOptions: { color: isHex(fg) ? fg : "#000000" },
    backgroundOptions: { color: transparent ? "rgba(0,0,0,0)" : (isHex(bg) ? bg : "#ffffff") },
  }), [data, fg, bg, transparent, dot, corner, ec, size, logo, logoSize]);

  useEffect(() => {
    qr.current = new QRCodeStyling(options);
    if (holder.current) { holder.current.innerHTML = ""; qr.current.append(holder.current); }
    // eslint-disable-next-line
  }, []);
  useEffect(() => { if (qr.current) qr.current.update(options); }, [options]);

  const pickLogo = (f) => { if (!f) return; const r = new FileReader(); r.onload = () => setLogo(r.result); r.readAsDataURL(f); };
  const dl = (ext) => qr.current && qr.current.download({ name: "qr-code", extension: ext });

  return (
    <div className="page">
      <div className="tool-head">
        <button className="tool-back" onClick={onClose}><ArrowLeft size={18} /></button>
        <h2>QR generator</h2>
      </div>

      <div className="qr-layout">
        <Card className="qr-preview-card">
          <div className={"qr-preview" + (transparent ? " checker" : "")} ref={holder} />
          <div className="qr-dl">
            <Btn variant="primary" onClick={() => dl("png")}><Download size={16} /> PNG</Btn>
            <Btn variant="ghost" onClick={() => dl("svg")}><Download size={16} /> SVG</Btn>
          </div>
          {transparent && <span className="qr-tip">Transparent background is on, the PNG saves with see-through corners.</span>}
        </Card>

        <Card className="qr-controls">
          <div className="qr-field">
            <span className="qr-lab">Content (link or text)</span>
            <textarea value={data} rows={2} onChange={(e) => setData(e.target.value)} placeholder="https://your-link.com" className="qr-data" />
          </div>

          <HexField label="Code colour" value={fg} onChange={setFg} />
          {!transparent && <HexField label="Background colour" value={bg} onChange={setBg} />}
          <label className="qr-check"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> Transparent background</label>

          <div className="qr-field">
            <span className="qr-lab">Dot shape</span>
            <div className="qr-pills">
              {DOT_TYPES.map((d) => <button key={d.v} className={"qr-pill" + (dot === d.v ? " on" : "")} onClick={() => setDot(d.v)}>{d.label}</button>)}
            </div>
          </div>
          <div className="qr-field">
            <span className="qr-lab">Corner shape</span>
            <div className="qr-pills">
              {CORNER_TYPES.map((c) => <button key={c.v} className={"qr-pill" + (corner === c.v ? " on" : "")} onClick={() => setCorner(c.v)}>{c.label}</button>)}
            </div>
          </div>

          <div className="qr-field">
            <span className="qr-lab">Logo in the middle</span>
            {logo ? (
              <div className="qr-logo-row">
                <img src={logo} alt="" className="qr-logo-thumb" />
                <input type="range" min="0.2" max="0.6" step="0.05" value={logoSize} onChange={(e) => setLogoSize(+e.target.value)} />
                <button className="qr-logo-clear" onClick={() => setLogo("")}><X size={15} /></button>
              </div>
            ) : (
              <button className="qr-logo-add" onClick={() => logoInput.current && logoInput.current.click()}><ImageIcon size={15} /> Add a logo</button>
            )}
            <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files && e.target.files[0])} />
          </div>

          <div className="qr-field qr-two">
            <div>
              <span className="qr-lab">Size {size}px</span>
              <input type="range" min="160" max="1024" step="16" value={size} onChange={(e) => setSize(+e.target.value)} />
            </div>
            <div>
              <span className="qr-lab">Error correction{logo ? " (locked H for logo)" : ""}</span>
              <div className="qr-pills">
                {EC_LEVELS.map((l) => <button key={l} disabled={!!logo} className={"qr-pill" + ((logo ? "H" : ec) === l ? " on" : "")} onClick={() => setEc(l)}>{l}</button>)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
