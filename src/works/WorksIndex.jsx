import { useEffect, useRef, useState } from "react";
import { WORKS } from "../config/works";
import { openWork } from "./workRoute";
import styles from "./WorksIndex.module.scss";

// 全部作品：一排竖卡片。鼠标在卡片区域左右移动时，整排会顺滑地跟着滚动；
// 滚轮也可以左右滑；手机上直接用手指左右划。
const WorksIndex = () => {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const state = useRef({ current: 0, target: 0, max: 0, raf: 0 });
  const [touch] = useState(() => window.matchMedia?.("(hover: none)").matches);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (touch) return;
    const vp = viewportRef.current;
    const tr = trackRef.current;
    const s = state.current;

    const measure = () => {
      s.max = Math.max(0, tr.scrollWidth - vp.clientWidth);
      s.target = Math.min(s.target, s.max);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(tr);

    const tick = () => {
      s.current += (s.target - s.current) * 0.075; // 越小越"丝滑"
      if (Math.abs(s.target - s.current) < 0.05) s.current = s.target;
      tr.style.transform = `translate3d(${-s.current}px,0,0)`;
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);

    const onMove = (e) => {
      const r = vp.getBoundingClientRect();
      // 两边各留一点"死区"，鼠标在中间时不会乱晃
      const t = Math.min(1, Math.max(0, ((e.clientX - r.left) / r.width - 0.12) / 0.76));
      s.target = t * s.max;
    };
    const onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      s.target = Math.min(s.max, Math.max(0, s.target + d));
    };
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("wheel", onWheel);
    };
  }, [touch]);

  return (
    <section className={styles.space}>
      <h1 className={styles.title}>My Creative Space</h1>
      <p className={styles.hint}>Swipe to explore ✦</p>

      <div ref={viewportRef} className={`${styles.viewport} ${touch ? styles.touch : ""}`}>
        <div ref={trackRef} className={styles.track}>
          {WORKS.map((w, i) => {
            const ready = Boolean(w.page);
            return (
              <button
                key={w.title}
                className={[
                  styles.card,
                  ready ? "" : styles.soon,
                  active !== null && active !== i ? styles.dim : "",
                ].join(" ")}
                style={{ animationDelay: `${0.08 * i + 0.15}s` }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => ready && openWork(w.page)}
                aria-label={ready ? `Open ${w.title}` : `${w.title} (coming soon)`}
              >
                <span className={styles.frame}>
                  {w.image ? (
                    <img src={w.image} alt="" draggable="false" style={{ objectPosition: w.pos }} />
                  ) : (
                    <span className={styles.placeholder}>
                      <span>{w.title}</span>
                      <em>coming soon ~</em>
                    </span>
                  )}
                  <span className={styles.overlay}>
                    <small>{w.tag}</small>
                    <b>{ready ? "open ↗" : "soon ✿"}</b>
                  </span>
                </span>
                <span className={styles.caption}>
                  <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                  {w.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className={styles.footer}>more little worlds on the way ♡</p>
    </section>
  );
};

export default WorksIndex;
