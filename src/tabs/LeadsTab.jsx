import { useState, useRef, useEffect } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Trash2, X, Phone, MessageCircle, Mail, GripVertical, Settings2, GripHorizontal,
} from "lucide-react";
import { Card, Btn, Modal, Field, PageHead } from "../components/ui";
import { DraggableList } from "../components/DraggableList";
import { uid } from "../lib/format";

const DEFAULT_STAGES = [
  { id: "new", name: "New", color: "#0071e3" },
  { id: "contacted", name: "Contacted", color: "#ff9500" },
  { id: "replied", name: "Replied", color: "#5e5ce6" },
  { id: "booked", name: "Call booked", color: "#af52de" },
  { id: "won", name: "Won", color: "#34c759" },
  { id: "lost", name: "Lost", color: "#8e8e93" },
];
const STAGE_COLORS = ["#0071e3", "#ff9500", "#ffcc00", "#34c759", "#30b0c7", "#5e5ce6", "#af52de", "#ff2d92", "#ff3b30", "#8e8e93"];

const digits = (s) => (s || "").replace(/[^\d+]/g, "");
const isPhone = (s) => digits(s).replace(/\D/g, "").length >= 7;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
const relTime = (ms) => {
  const d = Math.floor((Date.now() - (ms || 0)) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1d";
  return `${d}d`;
};

export function LeadsTab({ pipeline, setPipeline, me }) {
  const stages = (pipeline && pipeline.stages && pipeline.stages.length) ? pipeline.stages : DEFAULT_STAGES;
  const leads = (pipeline && pipeline.leads) ? pipeline.leads : [];

  const mutate = (fn) => setPipeline((prev) => {
    const s = (prev && prev.stages && prev.stages.length) ? prev.stages : DEFAULT_STAGES;
    const l = (prev && prev.leads) ? prev.leads : [];
    return fn({ stages: s, leads: l });
  });

  const moveLead = (leadId, toStage) => mutate(({ stages, leads }) => {
    const maxOrder = leads.filter((l) => l.stageId === toStage).reduce((m, l) => Math.max(m, l.order || 0), 0);
    return { stages, leads: leads.map((l) => l.id === leadId ? { ...l, stageId: toStage, order: maxOrder + 1, movedAt: Date.now() } : l) };
  });
  const saveLead = (data) => mutate(({ stages, leads }) => {
    if (data.id && leads.some((l) => l.id === data.id)) return { stages, leads: leads.map((l) => l.id === data.id ? { ...l, ...data } : l) };
    const stageId = data.stageId || stages[0].id;
    const maxOrder = leads.filter((l) => l.stageId === stageId).reduce((m, l) => Math.max(m, l.order || 0), 0);
    const { id, ...rest } = data;
    return { stages, leads: [...leads, { ...rest, id: uid(), createdAt: Date.now(), stageId, order: maxOrder + 1 }] };
  });
  const deleteLead = (id) => mutate(({ stages, leads }) => ({ stages, leads: leads.filter((l) => l.id !== id) }));
  const saveStages = (newStages) => mutate(({ leads }) => {
    const ids = new Set(newStages.map((s) => s.id));
    const fallback = newStages[0] ? newStages[0].id : "new";
    return { stages: newStages, leads: leads.map((l) => ids.has(l.stageId) ? l : { ...l, stageId: fallback }) };
  });

  const [editLead, setEditLead] = useState(null); // lead object or {new:true, stageId}
  const [showStages, setShowStages] = useState(false);

  // Heal older leads that were saved without a unique id (they would move together).
  useEffect(() => {
    if (pipeline && pipeline.leads && pipeline.leads.some((l) => !l.id)) {
      mutate(({ stages, leads }) => ({ stages, leads: leads.map((l) => l.id ? l : { ...l, id: uid() }) }));
    }
  }, [pipeline]);

  // ---- drag (pointer based, works on mouse and touch) ----
  const boardRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null); // { lead, x, y, over }

  useEffect(() => {
    if (!drag) return;
    const scroll = setInterval(() => {
      const el = boardRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const { x, y } = posRef.current;
      if (el.scrollWidth > el.clientWidth + 4) {
        if (x > r.right - 54) el.scrollLeft += 18;
        else if (x < r.left + 54) el.scrollLeft -= 18;
      }
      if (y > window.innerHeight - 90) window.scrollBy(0, 16);
      else if (y < 90) window.scrollBy(0, -16);
    }, 16);
    const move = (ev) => {
      const x = ev.clientX, y = ev.clientY;
      posRef.current = { x, y };
      const under = document.elementFromPoint(x, y);
      const col = under && under.closest("[data-stage]");
      setDrag((d) => d ? { ...d, x, y, over: col ? col.getAttribute("data-stage") : d.over } : d);
    };
    const up = () => {
      setDrag((d) => { if (d && d.over && d.over !== d.lead.stageId) moveLead(d.lead.id, d.over); return null; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { clearInterval(scroll); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [drag && drag.lead.id]);

  const startDrag = (lead, e) => {
    e.preventDefault(); e.stopPropagation();
    posRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ lead, x: e.clientX, y: e.clientY, over: lead.stageId });
  };

  const stageColor = (id) => (stages.find((s) => s.id === id) || {}).color || "#8e8e93";

  return (
    <div className="page leads-page">
      <PageHead title="Leads" subtitle="Track ad leads through your pipeline. Drag a card, or use the arrows to move it along.">
        <div className="leads-head-btns">
          <button className="leads-gear" onClick={() => setShowStages(true)} title="Edit stages"><Settings2 size={16} /></button>
          <Btn onClick={() => setEditLead({ new: true, stageId: stages[0].id })}><Plus size={16} /> Add lead</Btn>
        </div>
      </PageHead>

      <div className="lead-board" ref={boardRef}>
        {stages.map((st, si) => {
          const colLeads = leads.filter((l) => l.stageId === st.id).sort((a, b) => (a.order || 0) - (b.order || 0));
          return (
            <div className={"lead-col" + (drag && drag.over === st.id ? " drop-on" : "")} key={st.id} data-stage={st.id}>
              <div className="lead-col-head" style={{ borderColor: st.color }}>
                <span className="lead-col-dot" style={{ background: st.color }} />
                <span className="lead-col-name">{st.name}</span>
                <span className="lead-col-count">{colLeads.length}</span>
                <button className="lead-col-add" onClick={() => setEditLead({ new: true, stageId: st.id })} title="Add here"><Plus size={15} /></button>
              </div>
              <div className="lead-col-body">
                {colLeads.length === 0 && <div className="lead-empty">Drop leads here</div>}
                {colLeads.map((l) => (
                  <div
                    key={l.id}
                    className={"lead-card" + (drag && drag.lead.id === l.id ? " ghost" : "")}
                    data-stage={st.id}
                    onClick={() => setEditLead(l)}
                  >
                    <button className="lead-grip" onPointerDown={(e) => startDrag(l, e)} title="Drag" style={{ touchAction: "none" }}><GripVertical size={15} /></button>
                    <div className="lead-card-main" data-stage={st.id}>
                      <div className="lead-name">{l.name || "Unnamed lead"}</div>
                      {(l.source || l.value) && <div className="lead-sub">{l.source}{l.source && l.value ? " · " : ""}{l.value ? `£${l.value}` : ""}</div>}
                      {l.contact && <div className="lead-contact">{l.contact}</div>}
                      <div className="lead-foot">
                        <span className="lead-age">{relTime(l.createdAt)}</span>
                        {isPhone(l.contact) && (
                          <a className="lead-quick wa" href={`https://wa.me/${digits(l.contact).replace(/^\+/, "")}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp"><MessageCircle size={14} /></a>
                        )}
                        {isPhone(l.contact) && (
                          <a className="lead-quick" href={`tel:${digits(l.contact)}`} onClick={(e) => e.stopPropagation()} title="Call"><Phone size={13} /></a>
                        )}
                        {isEmail(l.contact) && (
                          <a className="lead-quick" href={`mailto:${l.contact}`} onClick={(e) => e.stopPropagation()} title="Email"><Mail size={13} /></a>
                        )}
                      </div>
                    </div>
                    <div className="lead-arrows">
                      <button disabled={si === 0} onClick={(e) => { e.stopPropagation(); moveLead(l.id, stages[si - 1].id); }} title="Move left"><ChevronLeft size={16} /></button>
                      <button disabled={si === stages.length - 1} onClick={(e) => { e.stopPropagation(); moveLead(l.id, stages[si + 1].id); }} title="Move right"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {drag && (
        <div className="lead-drag-clone" style={{ left: drag.x, top: drag.y, borderColor: stageColor(drag.over) }}>
          {drag.lead.name || "Lead"}
        </div>
      )}

      {editLead && (
        <LeadModal
          lead={editLead}
          stages={stages}
          onClose={() => setEditLead(null)}
          onSave={(data) => { saveLead(data); setEditLead(null); }}
          onDelete={(id) => { deleteLead(id); setEditLead(null); }}
          onMove={(id, stageId) => { moveLead(id, stageId); }}
        />
      )}
      {showStages && (
        <StagesModal stages={stages} onClose={() => setShowStages(false)} onSave={(s) => { saveStages(s); setShowStages(false); }} />
      )}
    </div>
  );
}

function LeadModal({ lead, stages, onClose, onSave, onDelete, onMove }) {
  const isNew = !!lead.new;
  const [name, setName] = useState(lead.name || "");
  const [contact, setContact] = useState(lead.contact || "");
  const [source, setSource] = useState(lead.source || "");
  const [value, setValue] = useState(lead.value || "");
  const [note, setNote] = useState(lead.note || "");
  const [stageId, setStageId] = useState(lead.stageId || stages[0].id);
  const [confirmDel, setConfirmDel] = useState(false);

  const save = () => onSave({ id: isNew ? undefined : lead.id, name: name.trim(), contact: contact.trim(), source: source.trim(), value: value.toString().trim(), note, stageId });

  return (
    <Modal open onClose={onClose} title={isNew ? "New lead" : "Lead"} onSubmit={() => { if (name.trim()) save(); }}>
      <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Who is this lead" /></Field>
      <Field label="Contact (phone / WhatsApp / email)"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+44 7... or name@email.com" /></Field>
      <div className="lead-two">
        <Field label="Source"><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Facebook ad" /></Field>
        <Field label="Value (£)"><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" inputMode="numeric" /></Field>
      </div>
      <Field label="Notes"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering" /></Field>
      <Field label="Stage">
        <div className="lead-stage-pick">
          {stages.map((s) => (
            <button key={s.id} className={"lead-stage-chip" + (stageId === s.id ? " on" : "")} onClick={() => setStageId(s.id)} style={stageId === s.id ? { borderColor: s.color, color: s.color } : {}}>
              <span className="dot" style={{ background: s.color }} />{s.name}
            </button>
          ))}
        </div>
      </Field>

      {!isNew && isPhone(contact) && (
        <div className="lead-modal-actions-quick">
          <a className="q wa" href={`https://wa.me/${digits(contact).replace(/^\+/, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
          <a className="q" href={`tel:${digits(contact)}`}><Phone size={14} /> Call</a>
        </div>
      )}

      <div className="modal-actions">
        {!isNew && (confirmDel
          ? <button className="lead-del-yes" onClick={() => onDelete(lead.id)}>Delete lead</button>
          : <button className="lead-del" onClick={() => setConfirmDel(true)}><Trash2 size={15} /></button>)}
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={!name.trim()}>{isNew ? "Add lead" : "Save"}</Btn>
      </div>
    </Modal>
  );
}

function StagesModal({ stages, onClose, onSave }) {
  const [list, setList] = useState(stages.map((s) => ({ ...s })));
  const rename = (id, name) => setList((l) => l.map((s) => s.id === id ? { ...s, name } : s));
  const recolor = (id, color) => setList((l) => l.map((s) => s.id === id ? { ...s, color } : s));
  const remove = (id) => setList((l) => l.length > 1 ? l.filter((s) => s.id !== id) : l);
  const add = () => setList((l) => [...l, { id: uid(), name: "New stage", color: STAGE_COLORS[l.length % STAGE_COLORS.length] }]);

  return (
    <Modal open onClose={onClose} title="Edit stages" wide onSubmit={() => onSave(list.map((s) => ({ ...s, name: s.name.trim() || "Untitled" })))}>
      <p className="stages-hint">Rename, recolour, reorder or remove your pipeline stages. Leads in a removed stage move to the first one.</p>
      <DraggableList
        items={list}
        getKey={(s) => s.id}
        onReorder={(next) => setList(next)}
        renderItem={(s, ctx) => (
          <div className="stage-edit-row">
            <button {...ctx.handle}><GripHorizontal size={17} /></button>
            <input className="stage-color-in" type="color" value={s.color} onChange={(e) => recolor(s.id, e.target.value)} />
            <input className="stage-name-in" value={s.name} onChange={(e) => rename(s.id, e.target.value)} />
            <button className="stage-del" onClick={() => remove(s.id)} disabled={list.length <= 1}><Trash2 size={15} /></button>
          </div>
        )}
      />
      <button className="stage-add" onClick={add}><Plus size={15} /> Add stage</button>
      <div className="modal-actions">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave(list.map((s) => ({ ...s, name: s.name.trim() || "Untitled" })))}>Save stages</Btn>
      </div>
    </Modal>
  );
}
