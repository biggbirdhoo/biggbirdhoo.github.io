import { elementBoxStyle, findAsset, pageHeight, PAGE_WIDTH, textStyle, videoSrc } from "./pageModel";
import VideoView from "./VideoView";

// 元素设置了 link 时，点击会在新窗口打开
const linkProps = (el) =>
  el.link
    ? {
        onClick: () => window.open(el.link, "_blank", "noopener,noreferrer"),
        role: "link",
        title: el.link,
        className: "work-link",
      }
    : {};

// 按设计稿渲染一个作品页（网站用；编辑器有自己的可交互版本）
const PageView = ({ project, page, width }) => {
  const scale = width / (project.pageWidth || PAGE_WIDTH);
  const height = pageHeight(page) * scale;

  return (
    <div style={{ position: "relative", width, height }}>
      {page.elements.map((el) => {
        if (el.hidden) return null;
        if (el.type === "image") {
          const asset = findAsset(project, el.assetId);
          if (!asset) return null;
          return (
            <img
              key={el.id}
              src={asset.file}
              alt=""
              draggable="false"
              {...linkProps(el)}
              style={{
                ...elementBoxStyle(el, scale),
                display: "block",
                userSelect: "none",
                cursor: el.link ? "pointer" : undefined,
              }}
            />
          );
        }
        if (el.type === "video") {
          return (
            <div key={el.id} style={{ ...elementBoxStyle(el, scale), overflow: "hidden", borderRadius: 4 }}>
              <VideoView el={el} src={videoSrc(project, el)} />
            </div>
          );
        }
        return (
          <div
            key={el.id}
            {...linkProps(el)}
            style={{ ...elementBoxStyle(el, scale), ...textStyle(el, scale), cursor: el.link ? "pointer" : undefined }}
          >
            {el.text}
          </div>
        );
      })}
    </div>
  );
};

export default PageView;
