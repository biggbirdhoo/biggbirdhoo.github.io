import { useEffect, useRef, useState } from "react";
import { CONTACT, SOCIAL_LINKS } from "../../config/links";
import styles from "./ContactModal.module.scss";

const RINGS = [165, 310, 455];

// 手绘笔记本边框（viewBox 1000 x 620）
const NotebookFrame = () => (
  <svg
    className={styles.frame}
    viewBox="0 0 1000 620"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      className={styles.line}
      d="M24 32 C250 18 520 36 760 22 S972 26 978 30 C988 200 970 420 984 590 C760 602 480 584 240 598 S32 592 26 594 C14 420 32 200 24 32 Z"
    />
    <path
      className={`${styles.line} ${styles.sketch}`}
      d="M30 26 C260 30 540 20 770 30 S960 22 972 36 C980 210 978 430 978 584 C740 594 470 592 250 590 S40 600 20 586 C22 410 20 190 30 26"
    />
    <path className={`${styles.line} ${styles.spine}`} d="M500 44 C494 200 506 400 498 584" />
    {RINGS.map((y) => (
      <g key={y} className={styles.ring}>
        <path className={styles.line} d={`M446 ${y - 6} Q500 ${y - 30} 554 ${y - 6}`} />
        <path className={styles.line} d={`M448 ${y + 10} Q500 ${y - 10} 552 ${y + 10}`} />
        <path className={styles.line} d={`M446 ${y - 6} C432 ${y - 4} 430 ${y + 12} 448 ${y + 10}`} />
        <path className={styles.line} d={`M554 ${y - 6} C568 ${y - 4} 570 ${y + 12} 552 ${y + 10}`} />
      </g>
    ))}
  </svg>
);

const ContactModal = ({ open, onClose }) => {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef(null);

  // 打开 / 关闭（关闭时先播放淡出动画再卸载）
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 弹窗打开时，滚轮 / 触摸不再传给后面的 3D 场景
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    const events = ["wheel", "touchstart", "touchmove", "mousemove"];
    events.forEach((t) => el.addEventListener(t, stop, { passive: true }));
    return () => events.forEach((t) => el.removeEventListener(t, stop));
  }, [mounted]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${CONTACT.email}`;
    }
  };

  if (!mounted) return null;

  const socials = SOCIAL_LINKS.filter((s) => s.size === "square");

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${closing ? styles.closing : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Contact"
    >
      <div className={styles.book} onClick={(e) => e.stopPropagation()}>
        <NotebookFrame />

        <button className={styles.back} onClick={onClose} aria-label="Close">
          <img src="/ui/back.webp" alt="back" draggable="false" />
        </button>

        {/* 左页：拍立得照片 */}
        <div className={styles.left}>
          <figure className={styles.polaroid}>
            <span className={styles.tape} aria-hidden="true" />
            <img src="/ui/portrait.webp" alt={CONTACT.fullName} draggable="false" />
            <figcaption>it&apos;s me! ✦</figcaption>
          </figure>
        </div>

        {/* 右页：自我介绍 + 联系方式 */}
        <div className={styles.right}>
          <h2 className={styles.hello}>
            Hello, I&apos;m {CONTACT.name}!
            <svg className={styles.underline} viewBox="0 0 220 14" aria-hidden="true">
              <path d="M4 9 C40 2 80 13 120 6 S190 4 216 8" />
            </svg>
          </h2>
          <p className={styles.sub}>
            narrative games · XR · hand-drawn 2D × 3D
            <br />
            this is my little paper world ~
          </p>

          <svg className={styles.squiggle} viewBox="0 0 120 10" aria-hidden="true">
            <path d="M2 5 Q10 0 18 5 T34 5 T50 5 T66 5 T82 5 T98 5 T114 5" />
          </svg>

          <div className={styles.row}>
            <span className={styles.label}>say hi ✉</span>
            <span className={styles.value}>
              <a className={styles.link} href={`mailto:${CONTACT.email}`}>
                {CONTACT.email}
              </a>
              <button className={styles.copy} onClick={copyEmail}>
                {copied ? "copied!" : "copy"}
              </button>
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>play my games ▶</span>
            <span className={styles.value}>
              <a className={styles.link} href={CONTACT.itch} target="_blank" rel="noopener noreferrer">
                biggbirdhoo.itch.io
              </a>
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>based in ⌖</span>
            <span className={styles.value}>{CONTACT.base}</span>
          </div>

          <p className={styles.findMe}>…or catch me doodling around here:</p>
          <div className={styles.socials}>
            {socials.map((s, i) => (
              <a
                key={s.id}
                href={s.url || undefined}
                target={s.url ? "_blank" : undefined}
                rel={s.url ? "noopener noreferrer" : undefined}
                aria-label={s.label}
                title={s.label}
                style={{ animationDelay: `${i * -0.5}s` }}
              >
                <img src={s.icon} alt={s.label} draggable="false" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
