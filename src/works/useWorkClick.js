import { useMemo, useRef } from "react";
import { WORK_LINKS } from "../config/links";
import { openWork } from "./workRoute";

// 让场景里的物体可以点击打开作品页。
// 用法：<group {...useWorkClick(nodes)}>，哪个物体打开哪页在 src/config/links.js 的 WORK_LINKS 里配置。
// 一个物体上画了好几样东西时（比如 not_waterfall 这张大贴图），可以只让贴图里的某一块区域可点：
//   not_waterfall: [{ uv: [u0, v0, u1, v1], page: "页面id" }]   （uv 从贴图左上角算起，0~1）
// 纸片模型大多是透明贴图：射线会打到透明的部分。这里读取贴图的透明度，
// 只把"真正看得见的那一层"当作被点到的物体（缩小到 512px 读取，很省性能）
const alphaCache = new WeakMap();
const alphaAt = (material, uv) => {
  const img = material?.map?.image;
  if (!img || !uv || !img.width) return 1;
  let c = alphaCache.get(img);
  if (!c) {
    const w = Math.min(512, img.width);
    const h = Math.max(1, Math.round((img.height * w) / img.width));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    c = { w, h, data: ctx.getImageData(0, 0, w, h).data };
    alphaCache.set(img, c);
  }
  const x = Math.min(c.w - 1, Math.max(0, Math.floor(uv.x * c.w)));
  const y = Math.min(c.h - 1, Math.max(0, Math.floor(uv.y * c.h)));
  return c.data[(y * c.w + x) * 4 + 3] / 255;
};

const firstVisibleHit = (e) => {
  for (const hit of e.intersections || []) {
    try {
      if (alphaAt(hit.object.material, hit.uv) >= 0.5) return hit;
    } catch {
      return hit;
    }
  }
  return null;
};

export const useWorkClick = (nodes) => {
  const hovering = useRef(false);

  const byGeometry = useMemo(() => {
    const m = new Map();
    for (const [name, node] of Object.entries(nodes || {})) {
      if (node.geometry) m.set(node.geometry.uuid, name);
    }
    return m;
  }, [nodes]);

  return useMemo(() => {
    const target = (e) => {
      const link = WORK_LINKS[byGeometry.get(e.object?.geometry?.uuid)];
      if (!link) return null;
      // 前面挡着别的东西（比如树），或者点到的是透明的地方，都不算
      const visible = firstVisibleHit(e);
      if (!visible || visible.object !== e.object) return null;
      if (typeof link === "string") return link;
      const uv = visible.uv;
      if (!uv) return null;
      const hit = link.find(
        ({ uv: [u0, v0, u1, v1] }) => uv.x >= u0 && uv.x <= u1 && uv.y >= v0 && uv.y <= v1
      );
      return hit?.page || null;
    };
    const setCursor = (on) => {
      if (on === hovering.current) return;
      hovering.current = on;
      document.body.style.cursor = on ? "pointer" : "auto";
    };
    return {
      onClick: (e) => {
        const id = target(e);
        if (!id) return;
        e.stopPropagation();
        setCursor(false);
        openWork(id);
      },
      onPointerMove: (e) => {
        const on = Boolean(target(e));
        if (on) e.stopPropagation();
        setCursor(on);
      },
      onPointerOut: () => setCursor(false),
    };
  }, [byGeometry]);
};
