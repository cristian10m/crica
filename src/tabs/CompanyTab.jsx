import { useState, useEffect, useMemo } from "react";
import { Plus, Minus, Pencil, Trash2, Building2, PiggyBank, Receipt, ArrowUp, ArrowDown, Trophy } from "lucide-react";
import { Card, Btn, Modal, Field, PageHead, NumStep } from "../components/ui";
import { useCountUp } from "../lib/hooks";
import { todayStr, dateDiff, prettyDate } from "../lib/dates";
import { nextInvoiceDate } from "../lib/invoices";
import { uid, fmtMoney } from "../lib/format";
import { fireConfetti } from "../lib/confetti";
import { BLUE, tooltipStyle } from "../lib/constants";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

// Progress to the company goal, drawn as a half-circle sweep. One measure, one
// hue: the unfilled track is a light step of the same blue as the fill, so the
// whole arc reads as a single scale rather than two colours meeting.
function VaultGauge({ pct, hit }) {
  const R = 86, CX = 100, CY = 100;
  const LEN = Math.PI * R;
  const p = Math.max(0, Math.min(1, pct || 0));
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  return (
    <svg viewBox="0 0 200 110" className="vault-gauge" role="img"
      aria-label={`${Math.round(p * 100)} percent of the company goal reached`}>
      <path className="vault-gauge-track" d={arc} />
      <path className={"vault-gauge-fill" + (hit ? " hit" : "")} d={arc}
        strokeDasharray={LEN} strokeDashoffset={LEN * (1 - p)} />
      {/* Quarter marks, notched out of the arc so they stay recessive. */}
      {[0.25, 0.5, 0.75].map((t) => {
        const a = Math.PI * (1 - t);
        return (
          <line key={t} className="vault-gauge-tick"
            x1={CX + Math.cos(a) * (R - 9)} y1={CY - Math.sin(a) * (R - 9)}
            x2={CX + Math.cos(a) * (R + 9)} y2={CY - Math.sin(a) * (R + 9)} />
        );
      })}
    </svg>
  );
}

export function CompanyTab({ finance, setFinance, clients, setClients }) {
  const [moneyModal, setMoneyModal] = useState(null); // null | "in" | "out"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goalModal, setGoalModal] = useState(false);
  const [goalVal, setGoalVal] = useState("");
  const [clientModal, setClientModal] = useState(null); // null | "new" | client

  const vault = finance.vault || { current: 0, target: 50000 };
  const transactions = finance.transactions || [];
  const pct = vault.target > 0 ? vault.current / vault.target : 0;
  const displayVault = Math.round(useCountUp(vault.current));

  // The vault balance after each day that had money movement. Walked forward from
  // the balance implied by today's total minus every recorded transaction, so the
  // line always ends exactly on the current balance.
  const history = useMemo(() => {
    const txs = (transactions || []).filter((t) => t && t.date && typeof t.amount === "number")
      .slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (txs.length < 2) return [];
    const net = txs.reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0);
    let bal = vault.current - net;
    const byDay = new Map();
    txs.forEach((t) => { bal += t.type === "in" ? t.amount : -t.amount; byDay.set(t.date, Math.round(bal)); });
    return [...byDay.entries()].map(([date, value]) => ({ date, label: prettyDate(date), value })).slice(-40);
  }, [transactions, vault.current]);

  const monthDelta = useMemo(() => {
    const m = todayStr().slice(0, 7);
    return (transactions || []).filter((t) => (t.date || "").slice(0, 7) === m)
      .reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0);
  }, [transactions]);

  // Monthly income is computed automatically from the active clients
  const activeClients = clients.filter((c) => c.active);
  const recurring = activeClients.reduce((s, c) => s + (c.monthlyAmount || 0), 0);
  const displayRecurring = Math.round(useCountUp(recurring));

  // Any money added or removed flows into the company vault (the big goal)
  const applyMoney = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const type = moneyModal;
    const tx = { id: uid(), date: todayStr(), amount: amt, type, note: note.trim() || (type === "in" ? "Money in" : "Money out") };
    const newCurrent = type === "in" ? vault.current + amt : Math.max(0, vault.current - amt);
    setFinance({ ...finance, vault: { ...vault, current: newCurrent }, transactions: [tx, ...transactions] });
    if (type === "in") setTimeout(() => fireConfetti(window.innerWidth / 2, window.innerHeight / 2.5), 120);
    setMoneyModal(null); setAmount(""); setNote("");
  };
  const saveGoal = () => {
    const v = parseFloat(goalVal); if (!v || v <= 0) return;
    setFinance({ ...finance, vault: { ...vault, target: v } });
    setGoalModal(false); setGoalVal("");
  };

  const saveClient = (data) => {
    if (data.id) setClients(clients.map((c) => c.id === data.id ? { ...c, ...data } : c));
    else setClients([...clients, { id: uid(), active: true, lastInvoiced: null, ...data }]);
    setClientModal(null);
  };
  const removeClient = (id) => { setClients(clients.filter((c) => c.id !== id)); setClientModal(null); };
  const markPaid = (c) => {
    const tx = { id: uid(), date: todayStr(), amount: c.monthlyAmount, type: "in", note: `${c.name} payment`, clientId: c.id };
    setFinance({ ...finance, vault: { ...vault, current: vault.current + c.monthlyAmount }, transactions: [tx, ...transactions] });
    setClients(clients.map((x) => x.id === c.id ? { ...x, lastInvoiced: todayStr() } : x));
    setTimeout(() => fireConfetti(window.innerWidth / 2, window.innerHeight / 2.5), 100);
  };

  return (
    <div className="page">
      <PageHead title="Company" subtitle="The company pot, the income, the clients." />

      {/* Vault, the big goal */}
      <Card className="vault-card">
        <div className="vault-head">
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Company vault</div>
            <button className="goal-edit" onClick={() => { setGoalVal(String(vault.target)); setGoalModal(true); }}>
              Goal {fmtMoney(vault.target)} <Pencil size={12} />
            </button>
          </div>
        </div>
        <div className="vault-gauge-wrap">
          <VaultGauge pct={pct} hit={pct >= 1} />
          <div className="vault-gauge-center">
            <div className="vault-amount">{fmtMoney(displayVault)}</div>
            <div className="vault-of">{Math.round(pct * 100)}% of {fmtMoney(vault.target)}</div>
          </div>
        </div>
        <div className={"vault-remain" + (pct >= 1 ? " hit" : "")}>
          {pct >= 1
            ? <><Trophy size={14} /> Goal reached</>
            : <>{fmtMoney(Math.max(0, vault.target - vault.current))} still to go</>}
        </div>

        {history.length > 1 && (
          <div className="vault-trend">
            <div className="vault-trend-head">
              <span>Balance over time</span>
              {monthDelta !== 0 && (
                <span className={"vault-delta " + (monthDelta > 0 ? "up" : "down")}>
                  {monthDelta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {fmtMoney(Math.abs(monthDelta))} this month
                </span>
              )}
            </div>
            <div style={{ width: "100%", height: 128 }}>
              <ResponsiveContainer>
                <AreaChart data={history} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
                  <defs>
                    <linearGradient id="vaultFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#86868b" }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(0,113,227,0.35)", strokeWidth: 1.5 }}
                    formatter={(v) => [fmtMoney(v), "Vault"]} />
                  <Area type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2}
                    fill="url(#vaultFill)" dot={false} activeDot={{ r: 4.5, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="vault-actions">
          <Btn variant="soft" onClick={() => setMoneyModal("in")}><Plus size={16} /> Add money</Btn>
          <Btn variant="ghost" onClick={() => setMoneyModal("out")}><Minus size={16} /> Remove</Btn>
        </div>
      </Card>

      {/* Monthly income, calculated automatically from clients */}
      <Card>
        <div className="month-head">
          <div className="card-title">Monthly income</div>
          <span className="muted-small">auto from clients</span>
        </div>
        <div className="month-amount">{fmtMoney(displayRecurring)}<span className="per-mo"> /mo</span></div>
        {activeClients.length > 0 ? (
          <div className="income-breakdown">
            {activeClients.map((c) => (
              <div key={c.id} className="legend-line"><span>{c.name}</span><span>{fmtMoney(c.monthlyAmount)}/mo</span></div>
            ))}
          </div>
        ) : (
          <div className="muted-small">Add active clients below and your monthly income adds up here on its own.</div>
        )}
      </Card>

      {/* Clients */}
      <div className="section-head">
        <h3>Clients</h3>
        <Btn variant="soft" onClick={() => setClientModal("new")}><Plus size={16} /> Add client</Btn>
      </div>
      {clients.length === 0 && <Card className="empty"><Building2 size={26} /><div>No clients yet. Add one to track retainers and invoice days.</div></Card>}
      {clients.map((c) => {
        const next = nextInvoiceDate(c);
        const dueIn = next ? dateDiff(next, todayStr()) : null;
        return (
          <Card key={c.id} className="client-card">
            <div className="client-dot" style={{ background: c.active ? BLUE : "#c7c7cc" }} />
            <div className="client-main" onClick={() => setClientModal(c)}>
              <div className="client-name">{c.name}{!c.active && <span className="muted-small"> (paused)</span>}</div>
              <div className="client-meta">
                <span className="chip"><PiggyBank size={11} /> {fmtMoney(c.monthlyAmount)}/mo</span>
                <span className="chip"><Receipt size={11} /> Invoice day {c.invoiceDay}</span>
                {dueIn != null && c.active && <span className={"chip " + (dueIn <= 2 ? "warn" : "")}>{dueIn <= 0 ? "Invoice due" : `Invoice in ${dueIn}d`}</span>}
              </div>
            </div>
            {c.active && <Btn variant="soft" className="paid-btn" onClick={() => markPaid(c)}>Mark paid</Btn>}
          </Card>
        );
      })}

      {/* History of money in and out */}
      <div className="section-head"><h3>History</h3></div>
      {transactions.length === 0 && <Card className="empty"><Receipt size={26} /><div>No money movements yet. Add money or mark a client paid and it shows up here.</div></Card>}
      {transactions.slice(0, 30).map((tx) => (
        <Card key={tx.id} className="tx-row">
          <div className={"tx-ic " + tx.type}>{tx.type === "in" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</div>
          <div className="tx-main">
            <div className="tx-note">{tx.note}</div>
            <div className="tx-date">{prettyDate(tx.date)}</div>
          </div>
          <div className={"tx-amt " + tx.type}>{tx.type === "in" ? "+" : "-"}{fmtMoney(tx.amount)}</div>
        </Card>
      ))}

      {/* Money modal */}
      <Modal open={moneyModal !== null} onClose={() => setMoneyModal(null)} title={moneyModal === "in" ? "Add money to vault" : "Remove money"}>
        <Field label="Amount"><input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus /></Field>
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client retainer" /></Field>
        <div className="modal-actions"><Btn onClick={applyMoney}>{moneyModal === "in" ? "Add to vault" : "Remove"}</Btn></div>
      </Modal>

      {/* Goal modal */}
      <Modal open={goalModal} onClose={() => setGoalModal(false)} title="Vault goal">
        <Field label="Goal amount"><input type="number" inputMode="decimal" value={goalVal} onChange={(e) => setGoalVal(e.target.value)} autoFocus /></Field>
        <div className="modal-actions"><Btn onClick={saveGoal}>Save goal</Btn></div>
      </Modal>

      <ClientModal open={clientModal !== null} client={clientModal === "new" ? null : clientModal} onClose={() => setClientModal(null)} onSave={saveClient} onDelete={removeClient} />
    </div>
  );
}

function ClientModal({ open, client, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [invoiceDay, setInvoiceDay] = useState("1");
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (open) { setName(client?.name || ""); setMonthlyAmount(client ? String(client.monthlyAmount) : ""); setInvoiceDay(String(client?.invoiceDay || 1)); setActive(client ? client.active : true); }
  }, [open, client]);
  return (
    <Modal open={open} onClose={onClose} title={client ? "Edit client" : "Add client"}>
      <Field label="Client name"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Northwind Co" /></Field>
      <div className="grid-2">
        <Field label="Monthly pay"><input type="number" inputMode="decimal" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Invoice day"><NumStep value={invoiceDay} min={1} max={28} width={62} suffix="of the month" onChange={setInvoiceDay} /></Field>
      </div>
      <label className="toggle-row"><span>Active client</span>
        <button className={"toggle " + (active ? "toggle-on" : "")} onClick={() => setActive(!active)}><span className="toggle-knob" /></button>
      </label>
      <div className="modal-actions">
        {client && <Btn variant="ghost-danger" onClick={() => onDelete(client.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => name.trim() && onSave({ ...(client || {}), name: name.trim(), monthlyAmount: parseFloat(monthlyAmount) || 0, invoiceDay: Math.max(1, Math.min(28, parseInt(invoiceDay) || 1)), active })}>Save</Btn>
      </div>
    </Modal>
  );
}
