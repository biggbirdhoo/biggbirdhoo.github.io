import { useState } from "react";
import { findAsset } from "../works/pageModel";

// ---------------- 页面列表 ----------------
export const PagesPanel = ({ pages, currentId, onSwitch, onCreate, onRename, onDelete, onCopyId }) => (
  <section className="ed-panel ed-pages">
    <header>
      <h3>页面</h3>
      <button className="ed-mini" onClick={onCreate} title="新建页面">＋ 新建</button>
    </header>
    <ul>
      {pages.map((p) => (
        <li
          key={p.id}
          className={p.id === currentId ? "is-active" : ""}
          onClick={() => onSwitch(p.id)}
          onDoubleClick={() => onRename(p)}
          title="单击切换 · 双击重命名"
        >
          <span className="ed-page-name">{p.name}</span>
          <span className="ed-page-id">#{p.id}</span>
          <span className="ed-row-actions">
            <button title="复制页面 id（用于绑定 3D 物体）" onClick={(e) => (e.stopPropagation(), onCopyId(p))}>⧉</button>
            <button title="重命名" onClick={(e) => (e.stopPropagation(), onRename(p))}>✎</button>
            <button title="删除页面" onClick={(e) => (e.stopPropagation(), onDelete(p))}>🗑</button>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

// ---------------- 素材库 ----------------
export const AssetsPanel = ({ assets, usedIds, onUpload, onAdd, onDelete, uploading }) => {
  const [over, setOver] = useState(false);
  return (
    <section
      className={`ed-panel ed-assets ${over ? "is-over" : ""}`}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter(
          (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
        );
        if (files.length) onUpload(files);
      }}
    >
      <header>
        <h3>素材库</h3>
        <label className="ed-mini">
          ＋ 上传
          <input
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime"
            multiple
            hidden
            onChange={(e) => {
              const files = [...e.target.files];
              e.target.value = "";
              if (files.length) onUpload(files);
            }}
          />
        </label>
      </header>
      {uploading > 0 && <p className="ed-hint">正在上传 {uploading} 张…</p>}
      {assets.length === 0 && !uploading && (
        <p className="ed-hint">把透明 PNG 或视频（mp4）拖到这里或画布上，点击素材即可加到当前页面</p>
      )}
      <div className="ed-asset-grid">
        {assets.map((a) => (
          <div
            key={a.id}
            className="ed-asset"
            title={`${a.name}\n点击加到画布，也可以拖到画布上指定位置`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/x-asset", a.id)}
            onClick={() => onAdd(a)}
          >
            {a.kind === "video" ? (
              <video src={`${a.file}#t=0.1`} muted preload="metadata" />
            ) : (
              <img src={a.file} alt={a.name} draggable="false" />
            )}
            {a.kind === "video" && <i className="ed-asset-play">▶</i>}
            <span>{a.name}</span>
            <button
              className="ed-asset-del"
              title={usedIds.has(a.id) ? "有页面正在使用，不能删除" : "从素材库删除"}
              disabled={usedIds.has(a.id)}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(a);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ---------------- 图层 ----------------
export const LayersPanel = ({ project, page, selectedId, onSelect, onToggle, onDelete, onRename, onReorder }) => {
  const [dragFrom, setDragFrom] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const n = page.elements.length;
  const list = [...page.elements].reverse(); // 最上面的图层显示在最上面

  return (
    <section className="ed-panel ed-layers">
      <header>
        <h3>图层</h3>
        <span className="ed-hint-inline">拖动排序</span>
      </header>
      {n === 0 && <p className="ed-hint">还没有内容。点左边的素材，或者上方“＋ 文字”</p>}
      <ul>
        {list.map((el, i) => {
          const realIndex = n - 1 - i;
          const asset = el.type === "image" ? findAsset(project, el.assetId) : null;
          return (
            <li
              key={el.id}
              className={[
                el.id === selectedId ? "is-active" : "",
                el.hidden ? "is-hidden" : "",
                dropAt === i && dragFrom !== null ? (dragFrom > i ? "drop-above" : "drop-below") : "",
              ].join(" ")}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropAt(i);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== i) onReorder(n - 1 - dragFrom, realIndex);
                setDragFrom(null);
                setDropAt(null);
              }}
              onClick={() => onSelect(el.id)}
              onDoubleClick={() => onRename(el)}
            >
              <span className="ed-layer-thumb">
                {el.type === "video" ? (
                  <b className="ed-play">▶</b>
                ) : asset ? (
                  <img src={asset.file} alt="" draggable="false" />
                ) : (
                  <b>T</b>
                )}
              </span>
              <span className="ed-layer-name" title="双击重命名">{el.name}</span>
              <button
                className={el.hidden ? "is-off" : ""}
                title={el.hidden ? "显示" : "隐藏"}
                onClick={(e) => (e.stopPropagation(), onToggle(el, "hidden"))}
              >
                {el.hidden ? "◡" : "👁"}
              </button>
              <button
                className={el.locked ? "is-on" : ""}
                title={el.locked ? "解锁" : "锁定"}
                onClick={(e) => (e.stopPropagation(), onToggle(el, "locked"))}
              >
                {el.locked ? "🔒" : "🔓"}
              </button>
              <button title="删除（素材库里的原图不会删除）" onClick={(e) => (e.stopPropagation(), onDelete(el))}>
                🗑
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
