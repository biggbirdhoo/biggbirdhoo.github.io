// 作品页里的视频：上传的视频 / mp4 链接用 <video>，YouTube、Vimeo、B站等用嵌入播放器
// preview=true 时（编辑器里）只显示画面，不响应点击，方便拖动
const VideoView = ({ el, src, preview = false }) => {
  const fill = { width: "100%", height: "100%", display: "block", border: 0, background: "#000" };

  if (!src) {
    return <div style={{ ...fill, display: "grid", placeItems: "center", color: "#aaa", background: "#f1f0ec" }}>视频丢失</div>;
  }

  if (el.provider === "file") {
    const loop = el.mode === "loop";
    return (
      <video
        src={preview ? `${src}#t=0.1` : src}
        style={{ ...fill, objectFit: "cover" }}
        playsInline
        preload="metadata"
        controls={!preview && !loop}
        autoPlay={!preview && loop}
        muted={preview || loop}
        loop={loop}
      />
    );
  }

  if (preview && el.thumb) {
    return <img src={el.thumb} alt="" draggable="false" style={{ ...fill, objectFit: "cover" }} />;
  }

  return (
    <iframe
      src={src}
      title={el.name || "video"}
      style={{ ...fill, pointerEvents: preview ? "none" : "auto" }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
};

export default VideoView;
