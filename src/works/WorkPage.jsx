import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PageView from "./PageView";
import { useProject } from "./useProject";
import styles from "./WorkPage.module.scss";
import WorksIndex from "./WorksIndex";
import { ALL_WORKS_ID } from "../config/works";

// 点击场景物体后打开的作品介绍页（盖在 3D 场景上面）
const WorkPage = ({ pageId, onClose }) => {
  const project = useProject();
  const [closing, setClosing] = useState(false);
  const [width, setWidth] = useState(0);
  const overlayRef = useRef(null);
  const bodyRef = useRef(null);

  const isIndex = pageId === ALL_WORKS_ID;
  const page = isIndex ? { name: "My Creative Space" } : project?.pages?.find((p) => p.id === pageId);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 320);
  };

  // 宽度变化时重新缩放页面
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Esc 关闭；滚轮和触摸只滚动这一页，不影响后面的 3D 场景
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const el = overlayRef.current;
    const stop = (e) => e.stopPropagation();
    const events = ["wheel", "touchstart", "touchmove", "mousemove"];
    events.forEach((t) => el.addEventListener(t, stop, { passive: true }));
    return () => {
      window.removeEventListener("keydown", onKey);
      events.forEach((t) => el.removeEventListener(t, stop));
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page) document.title = `${page.name} — Jw's Studio`;
    return () => {
      document.title = "Jw's Studio — Portfolio";
    };
  }, [page]);

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${closing ? styles.closing : ""}`}
      style={isIndex ? { background: "#f4f4f2" } : undefined}
    >
      <header className={styles.header}>
        <button className={styles.logo} onClick={close} aria-label="Jw's Studio">
          <img src="/ui/logo.webp" alt="Jw's Studio" draggable="false" />
        </button>
        <button className={styles.back} onClick={close} aria-label="Close">
          <img src="/ui/back.webp" alt="back" draggable="false" />
        </button>
      </header>

      <div ref={bodyRef} className={styles.body}>
        {isIndex && <WorksIndex />}
        {!isIndex && project && !page && <p className={styles.missing}>这一页还没有做好～</p>}
        {!isIndex && page && width > 0 && <PageView project={project} page={page} width={width} />}
      </div>
    </div>
  );
};

export default WorkPage;
