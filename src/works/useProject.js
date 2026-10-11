import { useEffect, useState } from "react";
import { PROJECT_URL } from "./pageModel";

// 网站读取作品页数据；本地开发时编辑器一保存，这里就自动刷新
export const useProject = () => {
  const [project, setProject] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${PROJECT_URL}?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => alive && p && setProject(p))
        .catch(() => {});
    load();

    let es;
    if (import.meta.env.DEV) {
      es = new EventSource("/__editor/events");
      es.addEventListener("project", load);
    }
    return () => {
      alive = false;
      es?.close();
    };
  }, []);

  return project;
};
