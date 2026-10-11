import { TEXT_COLORS } from "../works/pageModel";

// 选中文字或视频时，画布上方出现的小工具条
const LinkButton = ({ el, onChange }) => (
  <button
    className={el.link ? "is-on" : ""}
    title={el.link ? `链接：${el.link}（点击修改，清空即可去掉）` : "点击后打开一个网址"}
    onClick={() => {
      const url = window.prompt("点击这个元素时打开的网址（留空 = 不加链接）", el.link || "https://");
      if (url === null) return;
      const v = url.trim();
      onChange({ link: v && v !== "https://" ? v : undefined });
    }}
  >
    🔗 {el.link ? "已加链接" : "链接"}
  </button>
);

const ContextBar = ({ el, onChange, onReplaceLink }) => {
  if (!el || el.locked) return null;

  if (el.type === "image") {
    return (
      <div className="ed-context" onPointerDown={(e) => e.stopPropagation()}>
        <LinkButton el={el} onChange={onChange} />
      </div>
    );
  }

  if (el.type === "text") {
    const size = Math.round(el.fontSize);
    const setSize = (v) => {
      const n = Math.max(8, Math.min(400, Number(v) || size));
      if (n !== size) onChange({ fontSize: n });
    };
    const align = el.align || "left";
    return (
      <div className="ed-context" onPointerDown={(e) => e.stopPropagation()}>
        <span className="ed-context-label">字号</span>
        <button onClick={() => setSize(size - 2)} title="小一号">－</button>
        <input
          key={size}
          className="ed-size"
          type="number"
          defaultValue={size}
          min={8}
          max={400}
          onBlur={(e) => setSize(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button onClick={() => setSize(size + 2)} title="大一号">＋</button>

        <span className="ed-sep" />
        {[
          ["left", "靠左", "M3 5h14M3 9h9M3 13h14M3 17h9"],
          ["center", "居中", "M3 5h14M5.5 9h9M3 13h14M5.5 17h9"],
          ["right", "靠右", "M3 5h14M8 9h9M3 13h14M8 17h9"],
        ].map(([v, label, d]) => (
          <button
            key={v}
            className={align === v ? "is-on" : ""}
            title={label}
            onClick={() => onChange({ align: v })}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        ))}

        <span className="ed-sep" />
        <button className={el.bold ? "is-on" : ""} title="加粗" onClick={() => onChange({ bold: !el.bold })}>
          <b>B</b>
        </button>
        <span className="ed-sep" />
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            className={`ed-swatch ${(el.color || TEXT_COLORS[0]) === c ? "is-on" : ""}`}
            style={{ "--c": c }}
            title="文字颜色"
            onClick={() => onChange({ color: c })}
          />
        ))}
        <span className="ed-sep" />
        <LinkButton el={el} onChange={onChange} />
      </div>
    );
  }

  if (el.type === "video") {
    return (
      <div className="ed-context" onPointerDown={(e) => e.stopPropagation()}>
        {el.provider === "file" ? (
          <>
            <span className="ed-context-label">播放方式</span>
            <button className={el.mode !== "loop" ? "is-on" : ""} onClick={() => onChange({ mode: "controls" })}>
              ▶ 点击播放（有进度条）
            </button>
            <button className={el.mode === "loop" ? "is-on" : ""} onClick={() => onChange({ mode: "loop" })}>
              ↻ 自动循环（静音，像动图）
            </button>
          </>
        ) : (
          <>
            <span className="ed-context-label">{el.provider} 视频</span>
            <button onClick={() => onReplaceLink(el)}>更换链接</button>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default ContextBar;
