import { SOCIAL_LINKS } from "../../config/links";
import styles from "./SocialBar.module.scss";

// 首页底部的手绘图标栏：平时轻微摆动，鼠标悬停时放大并晃一下
const SocialBar = ({ onContact }) => {
  return (
    <nav className={styles.bar} aria-label="Links">
      {SOCIAL_LINKS.map((item, i) => {
        const isContact = item.action === "contact";
        const hasUrl = Boolean(item.url);
        return (
          <a
            key={item.id}
            className={`${styles.item} ${styles[item.size]}`}
            href={hasUrl ? item.url : undefined}
            target={hasUrl ? "_blank" : undefined}
            rel={hasUrl ? "noopener noreferrer" : undefined}
            aria-label={item.label}
            title={item.label}
            role={hasUrl ? undefined : "button"}
            tabIndex={0}
            onClick={(e) => {
              if (isContact) {
                e.preventDefault();
                onContact?.();
              }
            }}
            onKeyDown={(e) => {
              if (isContact && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onContact?.();
              }
            }}
            style={{ animationDelay: `${i * -0.45}s` }}
          >
            <img src={item.icon} alt={item.label} draggable="false" />
          </a>
        );
      })}
    </nav>
  );
};

export default SocialBar;
