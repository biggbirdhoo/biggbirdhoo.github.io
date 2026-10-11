import { useCallback, useEffect, useRef, useState } from "react";

// 编辑器的数据中心：读取 / 自动保存 / 撤销重做 / 多窗口同步
const API = "/__editor";
const HISTORY_LIMIT = 120;

const strip = (p) => {
  if (!p) return p;
  const { _rev, ...rest } = p; // eslint-disable-line no-unused-vars
  return rest;
};

// 两个窗口同时改了数据时的合并规则：
// 本窗口改过的页面用本窗口的版本，其他页面用服务器上的最新版本；素材库取并集
const mergeProjects = (latest, local, synced) => {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const syncedPages = new Map((synced?.pages || []).map((p) => [p.id, p]));
  const localPages = new Map(local.pages.map((p) => [p.id, p]));
  const pages = [];
  for (const lp of latest.pages) {
    const mine = localPages.get(lp.id);
    const base = syncedPages.get(lp.id);
    if (!mine) {
      // 本窗口删掉了这一页：只有服务器上这页也没被别人改过时才删除
      if (base && same(base, lp)) continue;
      pages.push(lp);
    } else {
      pages.push(base && same(base, mine) ? lp : mine);
    }
  }
  for (const mp of local.pages) {
    if (!latest.pages.some((p) => p.id === mp.id) && !syncedPages.has(mp.id)) pages.push(mp);
  }
  const assetIds = new Set(latest.assets.map((a) => a.id));
  const assets = [...latest.assets, ...local.assets.filter((a) => !assetIds.has(a.id))];
  return { ...latest, assets, pages };
};

export const useEditorStore = ({ onToast }) => {
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | saved | saving | dirty | error
  const [, setTick] = useState(0); // 刷新撤销 / 重做按钮状态

  const projectRef = useRef(null);
  const syncedRef = useRef(null); // 最近一次和服务器一致的数据
  const revRef = useRef(0);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const dirty = useRef(false);
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const timer = useRef(null);
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const apply = (next) => {
    projectRef.current = next;
    setProject(next);
  };

  const load = useCallback(async ({ fromOtherWindow = false } = {}) => {
    try {
      const r = await fetch(`${API}/project`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const p = await r.json();
      revRef.current = p._rev;
      syncedRef.current = strip(p);
      apply(syncedRef.current);
      if (fromOtherWindow) {
        undoStack.current = [];
        redoStack.current = [];
        setTick((t) => t + 1);
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  const save = useCallback(async () => {
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    saving.current = true;
    dirty.current = false;
    setStatus("saving");
    const sending = projectRef.current;
    try {
      const r = await fetch(`${API}/project`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRev: revRef.current, project: sending }),
      });
      if (r.status === 409) {
        // 另一个窗口先保存了：合并两边的修改，再保存一次
        const latest = await r.json();
        const merged = mergeProjects(strip(latest), projectRef.current, syncedRef.current);
        revRef.current = latest._rev;
        syncedRef.current = strip(latest);
        apply(merged);
        dirty.current = true;
        saveAgain.current = true;
        toastRef.current?.("另一个窗口也改了内容，已自动合并");
      } else if (r.ok) {
        revRef.current = (await r.json()).rev;
        syncedRef.current = sending;
      } else {
        throw new Error(r.status);
      }
      setStatus(dirty.current ? "dirty" : "saved");
    } catch {
      dirty.current = true;
      setStatus("error");
      clearTimeout(timer.current);
      timer.current = setTimeout(save, 3000);
    } finally {
      saving.current = false;
      if (saveAgain.current) {
        saveAgain.current = false;
        save();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 400);
  }, [save]);

  // 修改数据。history:false 用于拖动过程中的连续变化（松手时再记一步历史）
  const update = useCallback(
    (fn, { history = true } = {}) => {
      const prev = projectRef.current;
      if (!prev) return;
      const next = fn(prev);
      if (!next || next === prev) return;
      if (history) {
        undoStack.current.push(prev);
        if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
        redoStack.current = [];
        setTick((t) => t + 1);
      }
      apply(next);
      scheduleSave();
    },
    [scheduleSave]
  );

  const pushHistory = useCallback((base) => {
    if (!base || base === projectRef.current) return;
    undoStack.current.push(base);
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    setTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const p = undoStack.current.pop();
    if (!p) return;
    redoStack.current.push(projectRef.current);
    apply(p);
    setTick((t) => t + 1);
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const p = redoStack.current.pop();
    if (!p) return;
    undoStack.current.push(projectRef.current);
    apply(p);
    setTick((t) => t + 1);
    scheduleSave();
  }, [scheduleSave]);

  // 首次读取 + 订阅其他窗口的修改
  useEffect(() => {
    load();
    const es = new EventSource(`${API}/events`);
    es.addEventListener("project", (e) => {
      const { rev } = JSON.parse(e.data);
      if (rev > revRef.current && !dirty.current && !saving.current) load({ fromOtherWindow: true });
    });
    es.onerror = () => setStatus((s) => (s === "saved" ? "error" : s));
    es.onopen = () => setStatus((s) => (s === "error" && !dirty.current ? "saved" : s));
    const beforeUnload = (e) => {
      if (dirty.current || saving.current) {
        save();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      es.close();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [load, save]);

  return {
    project,
    status,
    update,
    pushHistory,
    undo,
    redo,
    reload: load,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    getProject: () => projectRef.current,
  };
};

// ---------- 页面 / 元素的小工具 ----------
export const mapPage = (project, pageId, fn) => ({
  ...project,
  pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)),
});

export const mapElement = (project, pageId, elId, patch) =>
  mapPage(project, pageId, (p) => ({
    ...p,
    elements: p.elements.map((el) =>
      el.id === elId ? { ...el, ...(typeof patch === "function" ? patch(el) : patch) } : el
    ),
  }));
