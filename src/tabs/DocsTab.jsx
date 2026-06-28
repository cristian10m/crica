import { useState, useRef, useEffect } from "react";
import { FileText, Plus, Search, Trash2, ArrowLeft, Lock, Users, Share2, Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Quote, Eraser } from "lucide-react";
import { Card, Btn, IconBtn, Avatar, PageHead } from "../components/ui";
import { uid } from "../lib/format";

const relTime = (ms) => {
  const s = Math.max(0, Math.floor((Date.now() - (ms || 0)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return d === 1 ? "yesterday" : `${d}d ago`;
};
const snippet = (html) => (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);

export function DocsTab({ docs = [], setDocs, me, users }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const other = users.find((u) => u.id !== me.id && !u.hidden);

  const visible = docs.filter((d) => d.ownerId === me.id || d.shared);
  const q = query.trim().toLowerCase();
  const filtered = visible
    .filter((d) => !q || (d.title || "").toLowerCase().includes(q) || snippet(d.body).toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const openDoc = docs.find((d) => d.id === openId) || null;

  const newDoc = () => {
    const id = uid();
    const now = Date.now();
    setDocs((prev) => [...(prev || []), { id, ownerId: me.id, title: "", body: "", shared: false, createdAt: now, updatedAt: now, updatedBy: me.id }]);
    setOpenId(id);
  };
  const changeDoc = (id, patch) => setDocs((prev) => (prev || []).map((d) => d.id === id ? { ...d, ...patch, updatedAt: Date.now(), updatedBy: me.id } : d));
  const toggleShare = (doc) => setDocs((prev) => (prev || []).map((d) => d.id === doc.id ? { ...d, shared: !d.shared, updatedAt: Date.now(), updatedBy: me.id } : d));
  const removeDoc = (id) => { setDocs((prev) => (prev || []).filter((d) => d.id !== id)); setOpenId(null); };

  if (openDoc) {
    return (
      <DocEditor
        key={openDoc.id}
        doc={openDoc}
        me={me}
        isOwner={openDoc.ownerId === me.id}
        otherName={other ? other.name : "your partner"}
        ownerUser={users.find((u) => u.id === openDoc.ownerId)}
        onChange={(patch) => changeDoc(openDoc.id, patch)}
        onToggleShare={() => toggleShare(openDoc)}
        onDelete={() => removeDoc(openDoc.id)}
        onClose={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="page">
      <PageHead title="Docs" subtitle="Your private notes, scripts and writing. Share one to work on it together.">
        <Btn onClick={newDoc}><Plus size={16} /> New document</Btn>
      </PageHead>

      <div className="docs-search">
        <Search size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" />
      </div>

      {filtered.length === 0 ? (
        <Card className="empty"><FileText size={28} /><div>{q ? "No documents match that search." : "No documents yet. Create your first one to start writing."}</div></Card>
      ) : (
        <div className="docs-grid">
          {filtered.map((d) => {
            const mine = d.ownerId === me.id;
            const owner = users.find((u) => u.id === d.ownerId);
            return (
              <button key={d.id} className="doc-card" onClick={() => setOpenId(d.id)}>
                <div className="doc-card-top">
                  <FileText size={16} className="doc-card-ic" />
                  <span className="doc-card-title">{d.title || "Untitled"}</span>
                </div>
                <div className="doc-card-snip">{snippet(d.body) || "Empty document"}</div>
                <div className="doc-card-foot">
                  {d.shared && <span className="doc-pill"><Users size={11} /> Shared</span>}
                  {!mine && owner && <span className="doc-owner"><Avatar user={owner} size={16} /> {owner.name}</span>}
                  <span className="doc-time">{relTime(d.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { block: "<h1>", icon: Heading1, label: "Heading" },
  { block: "<h2>", icon: Heading2, label: "Subheading" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullets" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered" },
  { block: "<blockquote>", icon: Quote, label: "Quote" },
  { cmd: "removeFormat", icon: Eraser, label: "Clear formatting" },
];

function DocEditor({ doc, me, isOwner, otherName, ownerUser, onChange, onToggleShare, onDelete, onClose }) {
  const [title, setTitle] = useState(doc.title || "");
  const bodyRef = useRef(null);
  const focusedRef = useRef(false);
  const saveTimer = useRef(null);
  const latestRef = useRef({ title: doc.title || "", body: doc.body || "" });
  const savedRef = useRef({ title: doc.title || "", body: doc.body || "" });
  const [confirmDel, setConfirmDel] = useState(false);

  // Set the body once when this doc opens.
  useEffect(() => { if (bodyRef.current) bodyRef.current.innerHTML = doc.body || ""; /* eslint-disable-next-line */ }, []);

  // Live sync: if the other person edits while I am idle, refresh my view.
  useEffect(() => {
    if (focusedRef.current) return;
    if (doc.updatedBy === me.id) return; // ignore the echo of my own save
    if ((doc.title || "") !== latestRef.current.title) { setTitle(doc.title || ""); latestRef.current.title = doc.title || ""; }
    if (bodyRef.current && (doc.body || "") !== bodyRef.current.innerHTML) { bodyRef.current.innerHTML = doc.body || ""; latestRef.current.body = doc.body || ""; }
    savedRef.current = { title: doc.title || "", body: doc.body || "" };
    // eslint-disable-next-line
  }, [doc.updatedAt, doc.updatedBy]);

  const flush = () => {
    const { title: t, body: b } = latestRef.current;
    if (t === savedRef.current.title && b === savedRef.current.body) return;
    savedRef.current = { title: t, body: b };
    onChange({ title: t, body: b });
  };
  const scheduleSave = () => { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(flush, 650); };

  // Flush any pending edit when leaving the doc.
  useEffect(() => () => { clearTimeout(saveTimer.current); flush(); /* eslint-disable-next-line */ }, []);

  const onBodyInput = () => { latestRef.current.body = bodyRef.current.innerHTML; scheduleSave(); };
  const onTitle = (v) => { setTitle(v); latestRef.current.title = v; scheduleSave(); };
  const apply = (tool) => {
    if (tool.block) document.execCommand("formatBlock", false, tool.block);
    else document.execCommand(tool.cmd, false, null);
    if (bodyRef.current) { latestRef.current.body = bodyRef.current.innerHTML; bodyRef.current.focus(); }
    scheduleSave();
  };

  return (
    <div className="page doc-edit-page">
      <div className="doc-edit-bar">
        <IconBtn onClick={() => { flush(); onClose(); }} title="Back"><ArrowLeft size={18} /></IconBtn>
        <input className="doc-title-input" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Untitled document" />
        {isOwner ? (
          <button className={"doc-share-btn " + (doc.shared ? "on" : "")} onClick={onToggleShare} title={doc.shared ? "Stop sharing" : `Share with ${otherName}`}>
            {doc.shared ? <Users size={15} /> : <Share2 size={15} />} {doc.shared ? "Shared" : "Share"}
          </button>
        ) : (
          <span className="doc-shared-tag"><Users size={14} /> {ownerUser ? ownerUser.name : "Shared"}</span>
        )}
        {isOwner && (confirmDel
          ? <span className="doc-del-confirm"><button onClick={onDelete}>Delete</button><button onClick={() => setConfirmDel(false)}>Cancel</button></span>
          : <IconBtn onClick={() => setConfirmDel(true)} title="Delete"><Trash2 size={17} /></IconBtn>)}
      </div>

      <div className="doc-toolbar">
        {TOOLS.map((t, i) => (
          <button key={i} className="doc-tool" title={t.label} onMouseDown={(e) => { e.preventDefault(); apply(t); }}>
            <t.icon size={16} />
          </button>
        ))}
        {doc.shared && <span className="doc-live"><span className="doc-live-dot" /> Live, edits sync to {isOwner ? otherName : (ownerUser ? ownerUser.name : "the owner")}</span>}
      </div>

      <div className="doc-page-wrap">
        <div
          ref={bodyRef}
          className="doc-body"
          contentEditable
          suppressContentEditableWarning
          onInput={onBodyInput}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flush(); }}
          data-placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
