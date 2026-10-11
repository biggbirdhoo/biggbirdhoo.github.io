// 排版编辑器的本地小服务器（只在 npm run dev / npm run editor 时运行）
// 数据保存在 public/works/project.json，图片保存在 public/works/assets/
// 所有打开的编辑器窗口和网站预览都通过 /__editor/events 收到最新数据
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { emptyProject } from "../src/works/pageModel.js";

const API = "/__editor";

export default function editorApi() {
  let root = process.cwd();
  let projectFile, assetDir;
  const clients = new Set();
  let lastWrittenRev = -1;

  const readProject = async () => {
    try {
      return JSON.parse(await fsp.readFile(projectFile, "utf8"));
    } catch {
      const p = { _rev: 1, ...emptyProject() };
      await writeProject(p);
      return p;
    }
  };

  const writeProject = async (project) => {
    await fsp.mkdir(path.dirname(projectFile), { recursive: true });
    const tmp = projectFile + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(project, null, 2));
    await fsp.rename(tmp, projectFile);
    lastWrittenRev = project._rev;
    broadcast(project._rev);
  };

  const broadcast = (rev) => {
    for (const res of clients) res.write(`event: project\ndata: ${JSON.stringify({ rev })}\n\n`);
  };

  const readBody = (req, limit = 80 * 1024 * 1024) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (c) => {
        size += c.length;
        if (size > limit) {
          reject(new Error("文件太大"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  const send = (res, status, data) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(data));
  };

  const safeName = (name) => {
    const ext = (path.extname(name) || ".png").toLowerCase().replace(/[^.a-z0-9]/g, "");
    const base =
      path
        .basename(name, path.extname(name))
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "image";
    return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}${ext}`;
  };

  // 只允许写到 public/works/assets 里
  const assetPathFromUrl = (url) => {
    const name = path.basename(String(url || ""));
    if (!name || name.startsWith(".")) return null;
    return path.join(assetDir, name);
  };

  return {
    name: "jw-editor-api",
    apply: "serve",
    configResolved(config) {
      root = config.root;
      projectFile = path.join(root, "public/works/project.json");
      assetDir = path.join(root, "public/works/assets");
    },
    configureServer(server) {
      fs.mkdirSync(assetDir, { recursive: true });

      // 手动改了 project.json（比如导入、解压备份）也会通知所有窗口
      let watchTimer;
      try {
        fs.watch(path.dirname(projectFile), (ev, file) => {
          if (file !== "project.json") return;
          clearTimeout(watchTimer);
          watchTimer = setTimeout(async () => {
            try {
              const p = JSON.parse(await fsp.readFile(projectFile, "utf8"));
              if (p._rev !== lastWrittenRev) {
                lastWrittenRev = p._rev;
                broadcast(p._rev);
              }
            } catch {
              /* 文件正在写入 */
            }
          }, 150);
        });
      } catch {
        /* 某些系统不支持 watch，不影响使用 */
      }

      // 直接从硬盘提供 /works/ 下的文件：新上传的图片立刻能显示，数据永远是最新的
      const TYPES = {
        ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".svg": "image/svg+xml", ".json": "application/json",
        ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
      };
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/works/") || req.method !== "GET") return next();
        const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).slice("/works/".length);
        const file = path.join(root, "public/works", path.normalize(rel));
        if (!file.startsWith(path.join(root, "public/works"))) return next();
        try {
          const stat = await fsp.stat(file);
          if (!stat.isFile()) return next();
          res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Accept-Ranges", "bytes");
          // 支持分段读取，视频才能拖动进度条
          const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
          if (m) {
            const start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
            const end = m[1] && m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
            res.statusCode = 206;
            res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
            res.setHeader("Content-Length", end - start + 1);
            fs.createReadStream(file, { start, end }).pipe(res);
          } else {
            res.setHeader("Content-Length", stat.size);
            fs.createReadStream(file).pipe(res);
          }
        } catch {
          next();
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith(API)) return next();
        const url = new URL(req.url, "http://x");
        const route = url.pathname.slice(API.length);

        try {
          // 实时同步通道
          if (route === "/events" && req.method === "GET") {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });
            res.write(": hi\n\n");
            clients.add(res);
            const ping = setInterval(() => res.write(": ping\n\n"), 25000);
            req.on("close", () => {
              clearInterval(ping);
              clients.delete(res);
            });
            return;
          }

          if (route === "/project" && req.method === "GET") {
            return send(res, 200, await readProject());
          }

          // 保存：带上 baseRev，防止旧窗口覆盖新数据
          if (route === "/project" && req.method === "PUT") {
            const { baseRev, project } = JSON.parse((await readBody(req)).toString("utf8"));
            const current = await readProject();
            if (baseRev !== current._rev) return send(res, 409, current);
            const next = { ...project, _rev: current._rev + 1 };
            await writeProject(next);
            return send(res, 200, { rev: next._rev });
          }

          // 上传素材（原始文件内容放在 body 里）
          if (route === "/asset" && req.method === "POST") {
            const name = safeName(url.searchParams.get("name") || "image.png");
            const buf = await readBody(req, 1024 * 1024 * 1024); // 视频最大 1GB
            await fsp.writeFile(path.join(assetDir, name), buf);
            return send(res, 200, { file: `/works/assets/${name}` });
          }

          // 从素材库删除（编辑器只会在素材没被任何页面使用时调用）
          if (route === "/asset" && req.method === "DELETE") {
            const p = assetPathFromUrl(url.searchParams.get("file"));
            if (p) await fsp.rm(p, { force: true });
            return send(res, 200, { ok: true });
          }

          // 导入完整项目：{ project, files: { "/works/assets/x.png": base64 } }
          if (route === "/import" && req.method === "POST") {
            const bundle = JSON.parse((await readBody(req, 1500 * 1024 * 1024)).toString("utf8"));
            if (!bundle?.project?.pages) return send(res, 400, { error: "不是有效的项目文件" });
            for (const [file, b64] of Object.entries(bundle.files || {})) {
              const p = assetPathFromUrl(file);
              if (p) await fsp.writeFile(p, Buffer.from(b64, "base64"));
            }
            const current = await readProject();
            const next = { ...bundle.project, _rev: current._rev + 1 };
            await writeProject(next);
            return send(res, 200, { rev: next._rev });
          }

          send(res, 404, { error: "not found" });
        } catch (err) {
          send(res, 500, { error: String(err?.message || err) });
        }
      });
    },
  };
}
