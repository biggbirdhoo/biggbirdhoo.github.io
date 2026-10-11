// 作品页的数据模型：网站和排版编辑器共用这一份逻辑
// 所有坐标都以 1440px 宽的设计稿为准，网站显示时按屏幕宽度等比缩放

export const PAGE_WIDTH = 1440;
export const MIN_PAGE_HEIGHT = 900;
export const PAGE_BOTTOM_PADDING = 160;

export const PROJECT_URL = "/works/project.json";

// 正文统一手写体：英文 Caveat，中文 ZCOOL KuaiLe（站酷快乐体）
export const HAND_FONT = '"Caveat", "ZCOOL KuaiLe", cursive';
export const INK = "#2b2b2b";
export const TEXT_LINE_HEIGHT = 1.4;

export const uid = (prefix = "el") =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const slugify = (name) => {
  const s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `page-${Math.random().toString(36).slice(2, 7)}`;
};

// 元素旋转后的外接框（用来算页面高度）
export const elementBounds = (el) => {
  const r = ((el.rot || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const hw = (el.w * c + el.h * s) / 2;
  const hh = (el.w * s + el.h * c) / 2;
  return { left: el.cx - hw, right: el.cx + hw, top: el.cy - hh, bottom: el.cy + hh };
};

export const pageHeight = (page) => {
  let bottom = 0;
  for (const el of page?.elements || []) {
    if (el.hidden) continue;
    bottom = Math.max(bottom, elementBounds(el).bottom);
  }
  return Math.max(MIN_PAGE_HEIGHT, Math.ceil(bottom + PAGE_BOTTOM_PADDING));
};

export const findAsset = (project, id) => project?.assets?.find((a) => a.id === id);

// 元素在画布上的定位样式（scale = 显示像素 / 设计像素）
export const elementBoxStyle = (el, scale) => ({
  position: "absolute",
  left: (el.cx - el.w / 2) * scale,
  top: (el.cy - el.h / 2) * scale,
  width: el.w * scale,
  height: el.type === "text" ? "auto" : el.h * scale,
  minHeight: el.type === "text" ? el.h * scale : undefined,
  transform: el.rot ? `rotate(${el.rot}deg)` : undefined,
});

export const textStyle = (el, scale) => ({
  fontFamily: HAND_FONT,
  fontSize: el.fontSize * scale,
  lineHeight: TEXT_LINE_HEIGHT,
  color: el.color || INK,
  fontWeight: el.bold ? 700 : 500,
  textAlign: el.align || "left",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  margin: 0,
});

// 文字可选颜色（编辑器里的色块）
export const TEXT_COLORS = ["#2b2b2b", "#8a8a8a", "#e8798f", "#5b7fb5", "#6d9b6a", "#ffffff"];

// ---------- 视频 ----------
// 把用户粘贴的视频链接转换成可以嵌入网页的地址
export const parseVideoUrl = (raw) => {
  const text = String(raw || "").trim();
  let u;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");

  let yt = null;
  if (host === "youtu.be") yt = u.pathname.slice(1).split("/")[0];
  else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com"))
    yt = u.searchParams.get("v") || (u.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/) || [])[2];
  if (yt) {
    return {
      provider: "youtube",
      src: `https://www.youtube.com/embed/${yt}`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  if (host === "player.vimeo.com") return { provider: "vimeo", src: text };
  if (host.endsWith("vimeo.com")) {
    const id = (u.pathname.match(/(\d{5,})/) || [])[1];
    if (id) return { provider: "vimeo", src: `https://player.vimeo.com/video/${id}` };
  }

  if (host.endsWith("bilibili.com") || host === "b23.tv") {
    const bv = (text.match(/(BV[0-9A-Za-z]{8,})/) || [])[1];
    if (host === "player.bilibili.com") return { provider: "bilibili", src: text };
    if (bv)
      return {
        provider: "bilibili",
        src: `https://player.bilibili.com/player.html?bvid=${bv}&autoplay=0&high_quality=1`,
      };
  }

  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u.pathname)) return { provider: "file", src: text };
  return { provider: "iframe", src: text };
};

export const videoSrc = (project, el) =>
  el.assetId ? findAsset(project, el.assetId)?.file : el.src;

export const isVideoFile = (el) => el.provider === "file";

export const emptyProject = () => ({
  version: 1,
  pageWidth: PAGE_WIDTH,
  assets: [],
  pages: [
    {
      id: "the-last-omen",
      name: "The Last Omen",
      elements: [
        {
          id: uid(),
          type: "text",
          name: "标题",
          text: "The Last Omen",
          cx: 720,
          cy: 200,
          w: 700,
          h: 90,
          fontSize: 72,
          align: "center",
          rot: 0,
        },
        {
          id: uid(),
          type: "text",
          name: "正文",
          text: "A branching visual novel about female agency in ancient East Asian courts.\n在编辑器里双击这段文字就可以修改～",
          cx: 720,
          cy: 340,
          w: 760,
          h: 110,
          fontSize: 36,
          align: "center",
          rot: 0,
        },
      ],
    },
  ],
});
