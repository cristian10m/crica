import { useState, useEffect } from "react";
import { Lightbulb, Plus, Trash2, Pencil, Heart, Pin, ExternalLink, CheckSquare, X, Search } from "lucide-react";
import { Card, Btn, IconBtn, Modal, Field, Avatar, PageHead } from "../components/ui";
import { prettyDate, todayStr } from "../lib/dates";
import { uid } from "../lib/format";
import { BLUE } from "../lib/constants";

const STATUS = {
  spark: { label: "Spark", color: "#FF9500" },
  exploring: { label: "Exploring", color: "#5AC8FA" },
  building: { label: "Building", color: BLUE },
  shipped: { label: "Shipped", color: "#34C759" },
  parked: { label: "Parked", color: "#86868b" },
};
const STATUS_ORDER = ["spark", "exploring", "building", "shipped", "parked"];
const votes = (i) => Object.keys(i.votes || {}).length;
const normLink = (l) => (!l ? "" : /^https?:\/\//i.test(l) ? l : "https://" + l);
const linkLabel = (l) => { try { return new URL(normLink(l)).hostname.replace(/^www\./, ""); } catch (e) { return l; } };

export function IdeaTab({ users, me, ideas, setIdeas, onMakeTask }) {
  const [modal, setModal] = useState(null); // null | "new" | idea
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("new"); // new | top

  const save = (data) => {
    if (data.id) setIdeas(ideas.map((i) => i.id === data.id ? { ...i, ...data } : i));
    else setIdeas([...ideas, { id: uid(), authorId: me.id, createdAt: Date.now(), date: todayStr(), status: "spark", votes: {}, pinned: false, ...data }]);
    setModal(null);
  };
  const remove = (id) => { setIdeas(ideas.filter((i) => i.id !== id)); setModal(null); };
  const update = (id, patch) => setIdeas(ideas.map((i) => i.id === id ? { ...i, ...patch } : i));
  const toggleVote = (idea) => { const v = { ...(idea.votes || {}) }; if (v[me.id]) delete v[me.id]; else v[me.id] = true; update(idea.id, { votes: v }); };
  const cycleStatus = (idea) => { const idx = STATUS_ORDER.indexOf(idea.status || "spark"); update(idea.id, { status: STATUS_ORDER[(idx + 1) % STATUS_ORDER.length] }); };
  const makeTask = (idea) => { onMakeTask(idea); update(idea.id, { status: "building" }); };

  const q = query.trim().toLowerCase();
  const list = ideas
    .filter((i) => statusFilter === "all" || (i.status || "spark") === statusFilter)
    .filter((i) => !q || (i.title || "").toLowerCase().includes(q) || (i.body || "").toLowerCase().includes(q))
    .sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (sort === "top") return votes(b) - votes(a) || (b.createdAt || 0) - (a.createdAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  return (
    <div className="page">
      <PageHead title="Idea board" subtitle="A shared place to capture and grow ideas.">
        <Btn onClick={() => setModal("new")}><Plus size={16} /> Add idea</Btn>
      </PageHead>

      <div className="search-bar">
        <Search size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas" />
        {query && <button className="search-clear" onClick={() => setQuery("")} aria-label="Clear"><X size={15} /></button>}
      </div>

      <div className="idea-tools">
        <div className="filter-row idea-filter">
          <button className={"text-pill " + (statusFilter === "all" ? "on" : "")} onClick={() => setStatusFilter("all")}>All</button>
          {STATUS_ORDER.map((s) => (
            <button key={s} className={"text-pill " + (statusFilter === s ? "on" : "")} onClick={() => setStatusFilter(s)}>{STATUS[s].label}</button>
          ))}
        </div>
        <div className="idea-sort">
          <button className={"text-pill " + (sort === "new" ? "on" : "")} onClick={() => setSort("new")}>Newest</button>
          <button className={"text-pill " + (sort === "top" ? "on" : "")} onClick={() => setSort("top")}>Top</button>
        </div>
      </div>

      {list.length === 0 && (
        <Card className="empty"><Lightbulb size={26} /><div>{q || statusFilter !== "all" ? "No ideas match." : "No ideas yet. Drop the first one in."}</div></Card>
      )}

      <div className="idea-grid">
        {list.map((idea) => {
          const st = STATUS[idea.status] || STATUS.spark;
          const author = users.find((u) => u.id === idea.authorId);
          const mine = !!(idea.votes || {})[me.id];
          const link = normLink(idea.link);
          return (
            <Card key={idea.id} className={"idea-card " + (idea.pinned ? "idea-pinned" : "")}>
              <div className="idea-top">
                <button className="status-pill" style={{ color: st.color, borderColor: st.color + "66" }} onClick={() => cycleStatus(idea)} title="Click to move it along">{st.label}</button>
                <div className="idea-spacer" />
                <button className={"vote-btn " + (mine ? "on" : "")} onClick={() => toggleVote(idea)} title="Like this idea"><Heart size={14} /> {votes(idea) || ""}</button>
              </div>
              <div className="idea-title" onClick={() => setModal(idea)}>{idea.title}</div>
              {idea.body && <div className="idea-body">{idea.body}</div>}
              {link && <a className="idea-link" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> {linkLabel(idea.link)}</a>}
              <div className="idea-foot">
                <span className="idea-author">{author && <Avatar user={author} size={18} />} {author ? author.name : "Someone"} · {prettyDate(idea.date)}</span>
                <div className="idea-actions">
                  <IconBtn className={idea.pinned ? "pin-on" : ""} onClick={() => update(idea.id, { pinned: !idea.pinned })} title={idea.pinned ? "Unpin" : "Pin to top"}><Pin size={15} /></IconBtn>
                  <IconBtn onClick={() => makeTask(idea)} title="Turn into a task on your board"><CheckSquare size={15} /></IconBtn>
                  <IconBtn onClick={() => setModal(idea)} title="Edit"><Pencil size={15} /></IconBtn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <IdeaModal open={modal !== null} idea={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} onDelete={remove} />
    </div>
  );
}

function IdeaModal({ open, idea, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("spark");
  useEffect(() => {
    if (!open) return;
    setTitle(idea?.title || ""); setBody(idea?.body || ""); setLink(idea?.link || ""); setStatus(idea?.status || "spark");
  }, [open, idea]);

  return (
    <Modal open={open} onClose={onClose} title={idea ? "Edit idea" : "New idea"}>
      <Field label="Idea"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the idea?" autoFocus /></Field>
      <Field label="Details (optional)"><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Flesh it out, why it matters, how it could work" /></Field>
      <Field label="Link (optional)"><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="example.com/reference" /></Field>
      <span className="field-label">Stage</span>
      <div className="seg-pills">
        {STATUS_ORDER.map((s) => (
          <button key={s} className={"pill " + (status === s ? "pill-on" : "")} onClick={() => setStatus(s)} style={status === s ? { borderColor: STATUS[s].color, color: STATUS[s].color } : {}}>{STATUS[s].label}</button>
        ))}
      </div>
      <div className="modal-actions">
        {idea && <Btn variant="ghost-danger" onClick={() => onDelete(idea.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(idea || {}), title: title.trim(), body: body.trim(), link: link.trim(), status })}>Save</Btn>
      </div>
    </Modal>
  );
}
