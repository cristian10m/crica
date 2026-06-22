import { useState, useEffect, useRef } from "react";

// Drag to reorder (pointer events, works on touch and mouse)
export function DraggableList({ items, getKey, onReorder, renderItem }) {
  const [list, setList] = useState(items);
  const dragging = useRef(false);
  const [dragKey, setDragKey] = useState(null);
  const containerRef = useRef(null);
  useEffect(() => { if (!dragging.current) setList(items); }, [items]);

  const down = (e, key) => {
    dragging.current = true; setDragKey(key);
    try { containerRef.current.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const move = (e) => {
    if (!dragging.current || dragKey == null || !containerRef.current) return;
    const rows = Array.from(containerRef.current.children);
    const y = e.clientY;
    let target = list.findIndex((i) => getKey(i) === dragKey);
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) { target = i; break; }
      if (i === 0 && y < rect.top) target = 0;
      if (i === rows.length - 1 && y > rect.bottom) target = rows.length - 1;
    }
    const cur = list.findIndex((i) => getKey(i) === dragKey);
    if (target >= 0 && target !== cur) {
      const next = list.slice(); const [m] = next.splice(cur, 1); next.splice(target, 0, m); setList(next);
    }
  };
  const up = () => { if (!dragging.current) return; dragging.current = false; setDragKey(null); onReorder(list); };

  return (
    <div ref={containerRef} className="drag-list" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {list.map((item) => (
        <div key={getKey(item)} className={"drag-row " + (dragKey === getKey(item) ? "is-dragging" : "")}>
          {renderItem(item, { handle: { onPointerDown: (e) => down(e, getKey(item)), style: { touchAction: "none" }, className: "drag-handle" } })}
        </div>
      ))}
    </div>
  );
}
