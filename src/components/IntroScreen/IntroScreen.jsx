import React, { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import styles from "./IntroScreen.module.scss";

// 加载页：一张手绘的「访客通行证」从刷卡机里慢慢刷过去，进度 = 卡片位置
// 加载完成 → 机器“滴”一声亮绿灯、卡片盖上 WELCOME 章 → 点击进入（顺便解锁背景音乐）

const MESSAGES = [
  "sharpening pencils…",
  "watering the forest…",
  "filling up the ocean…",
  "hiding the treasure…",
  "waking up the ghosts…",
];
const AUTO_ENTER_MS = 7000;
// 某个小文件迟迟不回来时不让访客干等：进度到 85% 以上且 6 秒没变化 → 视为加载完成
const STALL_MS = 6000;

const IntroScreen = () => {
  const { progress } = useProgress();
  const [shown, setShown] = useState(0); // 平滑后的进度
  const [phase, setPhase] = useState("loading"); // loading | ready | leaving | gone
  const target = useRef(0);
  const last = useRef({ value: -1, at: 0 });
  if (progress !== last.current.value) last.current = { value: progress, at: performance.now() };
  target.current = progress;

  // 平滑追赶真实进度，卡片不会一跳一跳
  useEffect(() => {
    let raf;
    let v = 0;
    const tick = () => {
      const stalled = target.current >= 85 && performance.now() - last.current.at > STALL_MS;
      const t = stalled ? 100 : target.current;
      v += (t - v) * 0.08 + (t > v ? 0.05 : 0);
      if (v > t) v = t;
      setShown(v);
      if (t >= 100 && v >= 99.6) {
        setShown(100);
        setPhase((p) => (p === "loading" ? "ready" : p));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const enter = () => setPhase((p) => (p === "ready" ? "leaving" : p));

  useEffect(() => {
    if (phase === "ready") {
      const t = setTimeout(enter, AUTO_ENTER_MS);
      const onKey = (e) => (e.key === "Enter" || e.key === " ") && enter();
      window.addEventListener("keydown", onKey);
      return () => {
        clearTimeout(t);
        window.removeEventListener("keydown", onKey);
      };
    }
    if (phase === "leaving") {
      const t = setTimeout(() => setPhase("gone"), 1100);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;

  const pct = Math.round(shown);
  const done = phase !== "loading";
  const msg = done ? "beep! access granted ✦" : MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(shown / 20))];

  return (
    <div
      className={`${styles.intro} ${done ? styles.isReady : ""} ${phase === "leaving" ? styles.isLeaving : ""}`}
      onClick={done ? enter : undefined}
      role="dialog"
      aria-label="Loading Jw's Studio"
    >
      {/* 手绘抖动滤镜（线条会轻轻“沸腾”） */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="jw-wobble">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1">
            <animate attributeName="seed" values="1;3;5;2" dur="0.6s" calcMode="discrete" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </svg>

      <span className={`${styles.spark} ${styles.s1}`}>✦</span>
      <span className={`${styles.spark} ${styles.s2}`}>✧</span>
      <span className={`${styles.spark} ${styles.s3}`}>✦</span>
      <span className={`${styles.spark} ${styles.s4}`}>✧</span>

      <img className={styles.logo} src="/ui/logo.webp" alt="Jw's Studio" draggable="false" />

      <div className={styles.machine}>
        {/* 通行证 */}
        <div className={styles.cardTrack} style={{ left: done ? "50%" : `${25 + shown * 0.5}%` }}>
          <div className={styles.card}>
            <svg className={styles.cardFrame} viewBox="0 0 300 190" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M14 6 Q7 6 6 14 L5 176 Q6 184 14 184 L286 185 Q294 184 294 176 L295 15 Q294 6 286 6 Z"
                className={styles.ink}
              />
              <path d="M10 46 L290 44" className={styles.inkThin} />
            </svg>
            <div className={styles.cardHead}>VISITOR PASS ✦ No.001</div>
            <div className={styles.cardBody}>
              <div className={styles.photo}>
                <img src="/ui/portrait.webp" alt="" draggable="false" />
              </div>
              <div className={styles.info}>
                <span className={styles.label}>studio</span>
                <span className={styles.value}>Jw's Studio</span>
                <span className={styles.label}>guest</span>
                <span className={styles.value}>you ♡</span>
                <div className={styles.barcode} aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} style={{ width: [2, 4, 1, 3][(i * 7) % 4] }} />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.stamp}>WELCOME!</div>
          </div>
        </div>

        {/* 刷卡机（画在卡片前面，挡住卡片下半截） */}
        <div className={styles.reader}>
          <svg viewBox="0 0 520 110" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M10 14 Q8 7 17 7 L503 9 Q513 9 512 18 L510 96 Q510 104 501 103 L18 102 Q9 102 10 93 Z"
              className={styles.readerBody}
            />
            <path d="M26 19 Q260 23 494 20" className={styles.inkThin} />
            <path d="M26 27 Q260 30 494 28" className={styles.inkThin} />
          </svg>
          <span className={styles.brand}>JW-O-MATIC</span>
          <div className={styles.screen}>{done ? "OK ✓" : `${String(pct).padStart(2, "0")}%`}</div>
          <span className={styles.led} />
        </div>
      </div>

      <p className={styles.msg}>{msg}</p>

      <button className={styles.enter} onClick={enter} tabIndex={done ? 0 : -1}>
        tap to enter ✦
      </button>
      <p className={styles.hint}>scroll / drag to explore · sound on ♪</p>

      <a
        className={styles.credits}
        href="https://github.com/andrewwoan/mr-pandas-psychologically-safe-portfolio"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        built on Mr. Panda's portfolio ♡ credits
      </a>
    </div>
  );
};

export default IntroScreen;
