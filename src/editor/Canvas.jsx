import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { elementBounds, elementBoxStyle, findAsset, pageHeight, textStyle, videoSrc } from "../works/pageModel";
import VideoView from "../works/VideoView";
import { mapElement } from "./useEditorStore";

const EXTRA_SPACE = 700; // 页面底部下方留出的空白工作区（设计像素）
const SNAP_PX = 7; // 磁性吸附的感应距离（屏幕像素）

// 找最近的吸附位置：moving 是被拖元素的 [左/中/右] 或 [上/中/下]，targets 是可以对齐的线
const snapAxis = (moving, targets, threshold) => {
  let best = null;
  for (const m of moving) {
    for (const t of targets) {
      const d = t - m;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line: t };
    }
  }
  return best;
};

// 可交互画布：拖动移动、角点缩放、旋转、文字宽度、双击改字、拖入图片
const Canvas = forwardRef(function Canvas(
  { store, project, page, zoom, selectedId, onSelect, editingId, onEdit, onDropFiles, onZoomWheel },
  ref
) {
  const scrollRef = useRef(null);
  const pageRef = useRef(null);
  const [guides, setGuides] = useState({ x: [], y: [] });
  const W = project.pageWidth;
  const ph = pageHeight(page);

  // 屏幕坐标 → 设计稿坐标
  const toDesign = (clientX, clientY) => {
    const r = pageRef.current.getBoundingClientRect();
    return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
  };

  useImperativeHandle(ref, () => ({
    // 当前可见区域的中心（新加的元素放在这里）
    viewCenter() {
      const s = scrollRef.current.getBoundingClientRect();
      const p = toDesign(s.left + s.width / 2, s.top + s.height / 2);
      return { x: Math.min(Math.max(p.x, 120), W - 120), y: Math.max(p.y, 120) };
    },
    toDesign,
    scrollEl: () => scrollRef.current,
  }));

  // 正在改字时点到别处：先让文字框失焦，保证内容被保存
  const finishTyping = () => {
    const a = document.activeElement;
    if (a && a.isContentEditable) a.blur();
  };

  // ---------- 通用拖拽 ----------
  const drag = (e, onMove) => {
    e.preventDefault();
    e.stopPropagation();
    const base = store.getProject();
    const start = toDesign(e.clientX, e.clientY);
    let moved = false;
    const move = (ev) => {
      const p = toDesign(ev.clientX, ev.clientY);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) * zoom < 2) return;
      moved = true;
      onMove(p, start, ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ x: [], y: [] });
      if (moved) store.pushHistory(base);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const patch = (el, values) =>
    store.update((p) => mapElement(p, page.id, el.id, values), { history: false });

  const startMove = (e, el) => {
    if (e.button !== 0) return;
    if (editingId === el.id) return e.stopPropagation();
    finishTyping();
    onSelect(el.id);
    if (el.locked) return e.stopPropagation();

    // 磁性吸附：对齐页面中线 / 左右边，以及其他元素的边和中线（按住 Alt 暂时关闭）
    const b0 = elementBounds(el);
    const xs = [0, W / 2, W];
    const ys = [0];
    for (const o of page.elements) {
      if (o.id === el.id || o.hidden) continue;
      const b = elementBounds(o);
      xs.push(b.left, (b.left + b.right) / 2, b.right);
      ys.push(b.top, (b.top + b.bottom) / 2, b.bottom);
    }

    drag(e, (p, s, ev) => {
      let dx = p.x - s.x;
      let dy = p.y - s.y;
      const gx = [];
      const gy = [];
      if (!ev.altKey) {
        const th = SNAP_PX / zoom;
        const sx = snapAxis([b0.left + dx, (b0.left + b0.right) / 2 + dx, b0.right + dx], xs, th);
        const sy = snapAxis([b0.top + dy, (b0.top + b0.bottom) / 2 + dy, b0.bottom + dy], ys, th);
        if (sx) {
          dx += sx.d;
          gx.push(sx.line);
        }
        if (sy) {
          dy += sy.d;
          gy.push(sy.line);
        }
      }
      setGuides({ x: gx, y: gy });
      patch(el, { cx: el.cx + dx, cy: el.cy + dy });
    });
  };

  const startScale = (e, el) =>
    drag(e, (p, s) => {
      const d0 = Math.hypot(s.x - el.cx, s.y - el.cy) || 1;
      const k = Math.max(0.03, Math.hypot(p.x - el.cx, p.y - el.cy) / d0);
      patch(el, {
        w: el.w * k,
        h: el.h * k,
        ...(el.type === "text" ? { fontSize: Math.max(6, el.fontSize * k) } : {}),
      });
    });

  const startRotate = (e, el) =>
    drag(e, (p, s, ev) => {
      const a0 = (Math.atan2(s.y - el.cy, s.x - el.cx) * 180) / Math.PI;
      const a = (Math.atan2(p.y - el.cy, p.x - el.cx) * 180) / Math.PI;
      let rot = (el.rot || 0) + a - a0;
      if (ev.shiftKey) rot = Math.round(rot / 15) * 15;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      patch(el, { rot: Math.abs(rot) < 0.8 ? 0 : rot });
    });

  // 文字框右边的小把手：只改宽度（换行位置），字号不变
  const startWidth = (e, el) =>
    drag(e, (p, s) => {
      const r = ((el.rot || 0) * Math.PI) / 180;
      const ux = Math.cos(r);
      const uy = Math.sin(r);
      const dl = (p.x - s.x) * ux + (p.y - s.y) * uy;
      const w = Math.max(60, el.w + dl);
      const shift = (w - el.w) / 2;
      patch(el, { w, cx: el.cx + ux * shift, cy: el.cy + uy * shift });
    });

  // ---------- 拖入图片 ----------
  const onDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])].filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    const assetId = e.dataTransfer?.getData("text/x-asset");
    const pos = toDesign(e.clientX, e.clientY);
    if (files.length) onDropFiles(files, pos);
    else if (assetId) onDropFiles(null, pos, assetId);
  };

  // Ctrl + 滚轮缩放
  useEffect(() => {
    const el = scrollRef.current;
    const wheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onZoomWheel(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [onZoomWheel]);

  const selected = page.elements.find((el) => el.id === selectedId && !el.hidden);

  return (
    <div
      ref={scrollRef}
      className="ed-canvas-scroll"
      onPointerDown={(e) => {
        if (e.button === 0) {
          finishTyping();
          onSelect(null);
          onEdit(null);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="ed-canvas-stage" style={{ width: W * zoom + 96 }}>
        <div
          ref={pageRef}
          className="ed-page"
          style={{
            width: W * zoom,
            height: (ph + EXTRA_SPACE) * zoom,
            "--page-end": `${ph * zoom}px`,
          }}
        >
          <div className="ed-page-end" style={{ top: ph * zoom }}>
            <span>页面到这里结束 · 往下放东西页面会自动变长</span>
          </div>

          {page.elements.map((el) =>
            el.hidden ? null : (
              <CanvasElement
                key={el.id}
                el={el}
                asset={el.type === "image" ? findAsset(project, el.assetId) : null}
                video={el.type === "video" ? videoSrc(project, el) : null}
                zoom={zoom}
                editing={editingId === el.id}
                onPointerDown={(e) => startMove(e, el)}
                onDoubleClick={() => el.type === "text" && !el.locked && onEdit(el.id)}
                onCommitText={(text) => {
                  onEdit(null);
                  if (text !== el.text) {
                    store.update((p) => mapElement(p, page.id, el.id, { text: text || " " }));
                  }
                }}
                onMeasure={(h) =>
                  store.update(
                    (p) =>
                      mapElement(p, page.id, el.id, (cur) =>
                        Math.abs(cur.h - h) < 0.5 ? cur : { h, cy: cur.cy + (h - cur.h) / 2 }
                      ),
                    { history: false }
                  )
                }
              />
            )
          )}

          {/* 吸附参考线 */}
          {guides.x.map((x, i) => (
            <div key={`gx${i}`} className="ed-guide ed-guide-v" style={{ left: x * zoom }} />
          ))}
          {guides.y.map((y, i) => (
            <div key={`gy${i}`} className="ed-guide ed-guide-h" style={{ top: y * zoom }} />
          ))}

          {selected && (
            <div
              className={`ed-selection ${selected.locked ? "is-locked" : ""}`}
              style={{
                ...elementBoxStyle(selected, zoom),
                height: selected.h * zoom,
                minHeight: undefined,
              }}
            >
              {!selected.locked && editingId !== selected.id && (
                <>
                  {["nw", "ne", "sw", "se"].map((c) => (
                    <span
                      key={c}
                      className={`ed-handle ed-handle-${c}`}
                      onPointerDown={(e) => startScale(e, selected)}
                    />
                  ))}
                  {selected.type === "text" && (
                    <span className="ed-handle ed-handle-e" onPointerDown={(e) => startWidth(e, selected)} />
                  )}
                  <span className="ed-rotate-stem" />
                  <span className="ed-handle ed-rotate" onPointerDown={(e) => startRotate(e, selected)} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const CanvasElement = ({ el, asset, video, zoom, editing, onPointerDown, onDoubleClick, onCommitText, onMeasure }) => {
  const textRef = useRef(null);

  // 文字高度由内容决定，量出来后存回数据（用于选框和页面高度）
  useLayoutEffect(() => {
    // 只在当前正在操作的窗口里测量，避免多个窗口同时写入
    if (el.type !== "text" || editing || !textRef.current || !document.hasFocus()) return;
    const h = textRef.current.offsetHeight / zoom;
    if (Math.abs(h - el.h) >= 1) onMeasure(h);
  });

  useEffect(() => {
    if (!editing || !textRef.current) return;
    const node = textRef.current;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, [editing]);

  const box = {
    ...elementBoxStyle(el, zoom),
    pointerEvents: el.locked ? "none" : "auto",
    cursor: el.locked ? "default" : editing ? "text" : "move",
  };

  if (el.type === "video") {
    return (
      <div className="ed-el ed-video" style={{ ...box, height: el.h * zoom }} onPointerDown={onPointerDown}>
        <VideoView el={el} src={video} preview />
        <span className="ed-video-badge">▶ {el.provider === "file" ? (el.mode === "loop" ? "自动循环" : "视频") : el.provider}</span>
      </div>
    );
  }

  if (el.type === "image") {
    if (!asset) {
      return <div className="ed-missing" style={{ ...box, height: el.h * zoom }} onPointerDown={onPointerDown}>素材丢失</div>;
    }
    return (
      <img
        src={asset.file}
        alt=""
        draggable="false"
        className="ed-el"
        style={{ ...box, display: "block" }}
        onPointerDown={onPointerDown}
      />
    );
  }

  return (
    <div
      key={editing ? "edit" : "view"}
      ref={textRef}
      className={`ed-el ed-text ${editing ? "is-editing" : ""}`}
      style={{ ...box, ...textStyle(el, zoom), minHeight: undefined, height: "auto" }}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(e) => (editing ? e.stopPropagation() : onPointerDown(e))}
      onDoubleClick={onDoubleClick}
      onBlur={(e) => editing && onCommitText(e.currentTarget.innerText.replace(/\n$/, ""))}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
        e.stopPropagation();
      }}
    >
      {el.text}
    </div>
  );
};

export default Canvas;
