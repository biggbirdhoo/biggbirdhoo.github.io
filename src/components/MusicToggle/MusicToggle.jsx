import { useEffect, useRef, useState } from "react";
import styles from "./MusicToggle.module.scss";

// 背景音乐：第一次点击 / 按键后淡入播放（浏览器不允许未经互动就出声），
// 快结束时淡出，再从头淡入循环；右下角的小按钮可以静音（会记住选择）
const SRC = "/audio/bgm.mp3";
const VOLUME = 0.45; // 背景音乐的最大音量（0~1）
const FADE_IN = 2.2; // 秒
const FADE_OUT = 2.5; // 秒
const STORE_KEY = "jw-music-muted";

const readMuted = () => {
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
};

const MusicToggle = () => {
  const [muted, setMuted] = useState(readMuted);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeRef = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // 音量渐变
  const fadeTo = (target, seconds, done) => {
    const a = audioRef.current;
    if (!a) return;
    cancelAnimationFrame(fadeRef.current);
    const from = a.volume;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / (seconds * 1000));
      a.volume = from + (target - from) * (t * t * (3 - 2 * t)); // 缓入缓出
      if (t < 1) fadeRef.current = requestAnimationFrame(step);
      else done?.();
    };
    fadeRef.current = requestAnimationFrame(step);
  };

  const start = () => {
    const a = audioRef.current;
    if (!a || mutedRef.current) return;
    a.volume = 0;
    a.play()
      .then(() => {
        setPlaying(true);
        fadeTo(VOLUME, FADE_IN);
      })
      .catch(() => {});
  };

  const stop = (pause = true) => {
    const a = audioRef.current;
    if (!a) return;
    fadeTo(0, 0.8, () => {
      if (pause) a.pause();
      setPlaying(false);
    });
  };

  useEffect(() => {
    const a = new Audio(SRC);
    a.preload = "auto";
    a.loop = false;
    a.volume = 0;
    audioRef.current = a;

    // 快到结尾时淡出，结束后从头淡入，形成柔和的循环
    let fadingOut = false;
    const onTime = () => {
      if (!a.duration || mutedRef.current) return;
      if (!fadingOut && a.duration - a.currentTime <= FADE_OUT) {
        fadingOut = true;
        fadeTo(0, Math.max(0.3, a.duration - a.currentTime - 0.1));
      }
    };
    const onEnded = () => {
      fadingOut = false;
      a.currentTime = 0;
      if (!mutedRef.current) start();
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);

    // 第一次互动时开始播放
    const unlock = () => {
      if (!mutedRef.current && a.paused) start();
      ["pointerdown", "keydown", "touchend"].forEach((t) => window.removeEventListener(t, unlock, true));
    };
    ["pointerdown", "keydown", "touchend"].forEach((t) => window.addEventListener(t, unlock, true));

    // 切到别的标签页时暂停，回来再淡入
    const onVisibility = () => {
      if (document.hidden) {
        if (!a.paused) {
          cancelAnimationFrame(fadeRef.current);
          a.pause();
        }
      } else if (!mutedRef.current && a.currentTime > 0) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(fadeRef.current);
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibility);
      ["pointerdown", "keydown", "touchend"].forEach((t) => window.removeEventListener(t, unlock, true));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (e) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    try {
      localStorage.setItem(STORE_KEY, next ? "1" : "0");
    } catch {
      /* 忽略 */
    }
    if (next) stop();
    else start();
  };

  const on = playing && !muted;

  return (
    <button
      className={`${styles.toggle} ${on ? styles.on : ""}`}
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? "Turn music on" : "Mute music"}
      title={muted ? "music on ♪" : "shh… mute"}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.icon}>
        {/* 手绘感的小音符 */}
        <path
          d="M19 33.5c0 3-2.6 5.2-5.6 5.2S8.5 37 8.5 34.5s2.5-4.6 5.6-4.6c2 0 3.4.7 4.9 1.8V12.6l17.6-4.3v21.4c0 3-2.6 5.2-5.6 5.2s-4.9-1.8-4.9-4.2 2.5-4.6 5.6-4.6c2 0 3.4.7 4.9 1.8V15.4L19 19.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {muted && (
          <path d="M8 8 L40 40" stroke="#e8798f" strokeWidth="3.2" strokeLinecap="round" />
        )}
      </svg>
      <span className={styles.bars} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
};

export default MusicToggle;
