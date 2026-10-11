import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Canvas from "./Canvas";
import { AssetsPanel, LayersPanel, PagesPanel } from "./Panels";
import ContextBar from "./ContextBar";
import { mapPage, useEditorStore } from "./useEditorStore";
import { parseVideoUrl, slugify, uid } from "../works/pageModel";

const LAST_PAGE_KEY = "jw-editor-page";
const STATUS_TEXT = {
  loading: "读取中…",
  saved: "已自动保存 ✓",
  dirty: "有修改…",
  saving: "保存中…",
  error: "⚠ 连不上本地服务，修改暂存在这个窗口",
};

const readVideoSize = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ w: v.videoWidth || 1280, h: v.videoHeight || 720 });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => resolve({ w: 1280, h: 720 });
    v.src = url;
  });

const readImageSize = (file) =>
  new Promise((resolve) => {
    if (file.type.startsWith("video/")) return resolve(readVideoSize(file));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 400 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ w: 400, h: 400 });
    img.src = url;
  });

const blobToBase64 = (blob) =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
  });

const Editor = () => {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(null), 2600);
  }, []);

  const store = useEditorStore({ onToast: showToast });
  const { project } = store;
  const canvasRef = useRef(null);

  const [pageId, setPageId] = useState(() => {
    try {
      return localStorage.getItem(LAST_PAGE_KEY);
    } catch {
      return null;
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [zoom, setZoom] = useState(0.6);
  const [fitMode, setFitMode] = useState(true);
  const [uploading, setUploading] = useState(0);

  const page = project?.pages.find((p) => p.id === pageId) || project?.pages[0];

  useEffect(() => {
    if (page && page.id !== pageId) setPageId(page.id);
    try {
      if (page) localStorage.setItem(LAST_PAGE_KEY, page.id);
    } catch {
      /* 无痕模式等情况下忽略 */
    }
  }, [page, pageId]);

  // ---------- 缩放 ----------
  const fit = useCallback(() => {
    const el = canvasRef.current?.scrollEl();
    if (!el || !project) return;
    setZoom(Math.max(0.15, Math.min(1.5, (el.clientWidth - 96) / project.pageWidth)));
  }, [project]);

  useEffect(() => {
    if (!fitMode) return;
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fitMode, fit, page?.id]);

  const zoomBy = useCallback((k) => {
    setFitMode(false);
    setZoom((z) => Math.max(0.1, Math.min(3, z * k)));
  }, []);

  // ---------- 页面 ----------
  const switchPage = (id) => {
    setPageId(id);
    setSelectedId(null);
    setEditingId(null);
  };

  const createPage = () => {
    const name = window.prompt("新页面的名字（例如作品名）", "New Work");
    if (!name?.trim()) return;
    let id = slugify(name);
    const ids = new Set(project.pages.map((p) => p.id));
    if (ids.has(id)) {
      let i = 2;
      while (ids.has(`${id}-${i}`)) i++;
      id = `${id}-${i}`;
    }
    store.update((p) => ({ ...p, pages: [...p.pages, { id, name: name.trim(), elements: [] }] }));
    switchPage(id);
  };

  const renamePage = (pg) => {
    const name = window.prompt("重命名页面（页面 id 不变，3D 物体的绑定不受影响）", pg.name);
    if (!name?.trim() || name === pg.name) return;
    store.update((p) => mapPage(p, pg.id, (x) => ({ ...x, name: name.trim() })));
  };

  const deletePage = (pg) => {
    if (project.pages.length <= 1) return showToast("至少要保留一个页面");
    if (!window.confirm(`删除页面「${pg.name}」？（可以用撤销找回，素材库不受影响）`)) return;
    store.update((p) => ({ ...p, pages: p.pages.filter((x) => x.id !== pg.id) }));
    if (pg.id === page.id) switchPage(project.pages.find((x) => x.id !== pg.id).id);
  };

  const copyPageId = async (pg) => {
    try {
      await navigator.clipboard.writeText(pg.id);
      showToast(`已复制页面 id：${pg.id}`);
    } catch {
      window.prompt("页面 id：", pg.id);
    }
  };

  // ---------- 元素 ----------
  const updatePage = (fn, opts) => store.update((p) => mapPage(p, page.id, fn), opts);

  const addElement = (el) => {
    updatePage((pg) => ({ ...pg, elements: [...pg.elements, el] }));
    setSelectedId(el.id);
  };

  const addAssetToCanvas = (asset, pos) => {
    const c = pos || canvasRef.current.viewCenter();
    if (asset.kind === "video") {
      const w = Math.min(asset.w, 640);
      return addElement({
        id: uid(),
        type: "video",
        name: asset.name,
        assetId: asset.id,
        provider: "file",
        mode: "controls",
        cx: c.x,
        cy: c.y,
        w,
        h: (w * asset.h) / asset.w,
        rot: 0,
      });
    }
    const w = Math.min(asset.w, 520);
    addElement({
      id: uid(),
      type: "image",
      name: asset.name,
      assetId: asset.id,
      cx: c.x,
      cy: c.y,
      w,
      h: (w * asset.h) / asset.w,
      rot: 0,
    });
  };

  const addText = () => {
    const c = canvasRef.current.viewCenter();
    const el = {
      id: uid(),
      type: "text",
      name: "文字",
      text: "双击这里写字",
      cx: c.x,
      cy: c.y,
      w: 420,
      h: 60,
      fontSize: 44,
      align: "left",
      rot: 0,
    };
    addElement(el);
    setEditingId(el.id);
  };

  // 粘贴视频链接（YouTube / Vimeo / B站 / mp4 地址）
  const addVideoLink = () => {
    const url = window.prompt("粘贴视频链接\n支持 YouTube、Vimeo、B站，或者 .mp4 视频地址\n（要上传本地视频文件，直接拖进素材库就行）");
    if (!url?.trim()) return;
    const v = parseVideoUrl(url);
    if (!v) return showToast("这个链接看起来不太对，检查一下再试试");
    const c = canvasRef.current.viewCenter();
    addElement({
      id: uid(),
      type: "video",
      name: v.provider === "file" ? "视频" : `${v.provider} 视频`,
      ...v,
      mode: "controls",
      cx: c.x,
      cy: c.y,
      w: 640,
      h: 360,
      rot: 0,
    });
  };

  const updateSelected = (patch) => {
    if (!selectedId) return;
    updatePage((pg) => ({
      ...pg,
      elements: pg.elements.map((x) => (x.id === selectedId ? { ...x, ...patch } : x)),
    }));
  };

  const deleteElement = (el) => {
    updatePage((pg) => ({ ...pg, elements: pg.elements.filter((x) => x.id !== el.id) }));
    if (selectedId === el.id) setSelectedId(null);
  };

  const toggleElement = (el, key) => {
    updatePage((pg) => ({
      ...pg,
      elements: pg.elements.map((x) => (x.id === el.id ? { ...x, [key]: !x[key] } : x)),
    }));
  };

  const renameElement = (el) => {
    const name = window.prompt("图层名字", el.name);
    if (!name?.trim()) return;
    updatePage((pg) => ({
      ...pg,
      elements: pg.elements.map((x) => (x.id === el.id ? { ...x, name: name.trim() } : x)),
    }));
  };

  const reorder = (from, to) => {
    updatePage((pg) => {
      const els = [...pg.elements];
      const [m] = els.splice(from, 1);
      els.splice(to, 0, m);
      return { ...pg, elements: els };
    });
  };

  // ---------- 素材 ----------
  const uploadFiles = async (files, dropPos) => {
    setUploading((n) => n + files.length);
    const added = [];
    for (const file of files) {
      try {
        const size = await readImageSize(file);
        const r = await fetch(`/__editor/asset?name=${encodeURIComponent(file.name)}`, {
          method: "POST",
          body: file,
        });
        if (!r.ok) throw new Error();
        const { file: url } = await r.json();
        const isVideo = file.type.startsWith("video/");
        added.push({
          id: uid(isVideo ? "vid" : "img"),
          name: file.name.replace(/\.[^.]+$/, ""),
          file: url,
          ...(isVideo ? { kind: "video" } : {}),
          ...size,
        });
      } catch {
        showToast(`「${file.name}」上传失败`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (!added.length) return;
    store.update((p) => ({ ...p, assets: [...p.assets, ...added] }));
    if (dropPos) added.forEach((a, i) => addAssetToCanvas(a, { x: dropPos.x + i * 30, y: dropPos.y + i * 30 }));
    else showToast(`已加入素材库：${added.length} 个，点击素材即可放到画布上`);
  };

  const usedIds = useMemo(() => {
    const s = new Set();
    project?.pages.forEach((p) => p.elements.forEach((el) => el.assetId && s.add(el.assetId)));
    return s;
  }, [project]);

  const deleteAsset = async (asset) => {
    if (usedIds.has(asset.id)) return;
    if (!window.confirm(`从素材库移除「${asset.name}」？（可以撤销）`)) return;
    store.update((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== asset.id) }));
  };

  // ---------- 导出 / 导入 ----------
  const exportProject = async () => {
    showToast("正在打包…");
    const files = {};
    for (const a of project.assets) {
      try {
        files[a.file] = await blobToBase64(await (await fetch(a.file)).blob());
      } catch {
        /* 跳过丢失的文件 */
      }
    }
    const bundle = { format: "jw-portfolio-project", version: 1, exportedAt: new Date().toISOString(), project, files };
    const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `作品页项目-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    showToast("已导出完整项目（含所有图片）");
  };

  const importProject = async (file) => {
    try {
      const bundle = JSON.parse(await file.text());
      if (bundle?.format !== "jw-portfolio-project" || !bundle.project?.pages) throw new Error();
      if (!window.confirm(`导入「${file.name}」会替换当前所有页面和素材库，确定吗？\n（建议先导出一份当前项目备份）`)) return;
      showToast("正在导入…");
      const r = await fetch("/__editor/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      if (!r.ok) throw new Error();
      await store.reload({ fromOtherWindow: true });
      setSelectedId(null);
      showToast("导入完成");
    } catch {
      showToast("这个文件不是有效的项目文件");
    }
  };

  // ---------- 快捷键 ----------
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      const sel = page?.elements.find((x) => x.id === selectedId);

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
      } else if (mod && e.key.toLowerCase() === "d" && sel) {
        e.preventDefault();
        addElement({ ...sel, id: uid(), cx: sel.cx + 30, cy: sel.cy + 30, locked: false, hidden: false });
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        deleteElement(sel);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (sel && !sel.locked && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        updatePage((pg) => ({
          ...pg,
          elements: pg.elements.map((x) => (x.id === sel.id ? { ...x, cx: x.cx + dx, cy: x.cy + dy } : x)),
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!project || !page) {
    return (
      <div className="ed-loading">
        {store.status === "error" ? (
          <>
            <p>连不上编辑器的本地服务。</p>
            <p>请双击项目里的「启动编辑器.bat」，或在终端运行 <code>npm run editor</code>。</p>
          </>
        ) : (
          <p>读取中…</p>
        )}
      </div>
    );
  }

  return (
    <div className="ed-app">
      <header className="ed-topbar">
        <div className="ed-brand">
          <img src="/ui/logo.webp" alt="" />
          <span>排版编辑器</span>
        </div>

        <div className="ed-tools">
          <button onClick={store.undo} disabled={!store.canUndo} title="撤销 Ctrl+Z">↶ 撤销</button>
          <button onClick={store.redo} disabled={!store.canRedo} title="重做 Ctrl+Shift+Z">↷ 重做</button>
          <span className="ed-sep" />
          <button onClick={addText} title="添加文字（双击文字可以修改）">＋ 文字</button>
          <button onClick={addVideoLink} title="插入视频链接（YouTube / Vimeo / B站 / mp4）">＋ 视频链接</button>
          <span className="ed-sep" />
          <button onClick={() => zoomBy(1 / 1.2)} title="缩小">－</button>
          <button className="ed-zoom" onClick={() => setFitMode(true) || fit()} title="适应宽度">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.2)} title="放大">＋</button>
        </div>

        <div className="ed-actions">
          <span className={`ed-status is-${store.status}`}>{STATUS_TEXT[store.status]}</span>
          <button className="ed-primary" onClick={() => window.open(`/#/work/${encodeURIComponent(page.id)}`, "_blank")}>
            预览 ↗
          </button>
          <button onClick={exportProject} title="导出完整项目（所有页面 + 图片）为一个文件">导出</button>
          <label className="ed-btn" title="从导出的项目文件恢复">
            导入
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files[0];
                e.target.value = "";
                if (f) importProject(f);
              }}
            />
          </label>
        </div>
      </header>

      <aside className="ed-left">
        <PagesPanel
          pages={project.pages}
          currentId={page.id}
          onSwitch={switchPage}
          onCreate={createPage}
          onRename={renamePage}
          onDelete={deletePage}
          onCopyId={copyPageId}
        />
        <AssetsPanel
          assets={project.assets}
          usedIds={usedIds}
          uploading={uploading}
          onUpload={(files) => uploadFiles(files)}
          onAdd={(a) => addAssetToCanvas(a)}
          onDelete={deleteAsset}
        />
      </aside>

      <main className="ed-main">
        <ContextBar
          el={page.elements.find((x) => x.id === selectedId && !x.hidden)}
          onChange={updateSelected}
          onReplaceLink={(el) => {
            const url = window.prompt("新的视频链接", el.src || "");
            const v = url && parseVideoUrl(url);
            if (v) updateSelected({ ...v, thumb: v.thumb, assetId: undefined });
            else if (url) showToast("这个链接看起来不太对");
          }}
        />
        <Canvas
          ref={canvasRef}
          store={store}
          project={project}
          page={page}
          zoom={zoom}
          selectedId={selectedId}
          onSelect={setSelectedId}
          editingId={editingId}
          onEdit={setEditingId}
          onZoomWheel={zoomBy}
          onDropFiles={(files, pos, assetId) => {
            if (files) uploadFiles(files, pos);
            else {
              const a = project.assets.find((x) => x.id === assetId);
              if (a) addAssetToCanvas(a, pos);
            }
          }}
        />
      </main>

      <aside className="ed-right">
        <LayersPanel
          project={project}
          page={page}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={toggleElement}
          onDelete={deleteElement}
          onRename={renameElement}
          onReorder={reorder}
        />
        <div className="ed-tips">
          <p><b>拖动</b> 移动 · <b>角点</b> 缩放 · <b>顶部圆点</b> 旋转（按住 Shift 每次 15°）</p>
          <p><b>双击文字</b> 修改 · 文字右侧把手调宽度</p>
          <p>拖动时会<b>自动吸附对齐</b>（粉色参考线），按住 Alt 可暂时关闭</p>
          <p>Delete 删除 · Ctrl+D 复制 · 方向键微调 · Ctrl+滚轮缩放</p>
        </div>
      </aside>

      {toast && <div className="ed-toast">{toast}</div>}
    </div>
  );
};

export default Editor;
