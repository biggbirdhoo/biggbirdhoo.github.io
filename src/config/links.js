// 所有外部链接集中放在这里，改链接只需要改这个文件
// url 留空（""）时图标只有动画、点了不跳转

export const NICKNAME_URL =
  "https://biggeaglehoo.wordpress.com/2025/01/17/%f0%9f%92%a1who-am-i/";

// 联系方式（Contact 弹窗里显示）
export const CONTACT = {
  name: "Brooke",
  fullName: "Jiawen (Brooke) Hu",
  email: "biggbirdhoo@gmail.com",
  itch: "https://biggbirdhoo.itch.io/",
  base: "Melbourne · Hangzhou",
};

// action: "contact" 表示点击打开联系弹窗，而不是跳转链接
export const SOCIAL_LINKS = [
  { id: "cv", label: "My CV", icon: "/ui/cv.webp", url: "/files/Resume_EN_Jiawen_Hu.pdf", size: "wide" },
  { id: "contact", label: "Contact", icon: "/ui/contact.webp", action: "contact", size: "wide" },
  { id: "youtube", label: "YouTube", icon: "/ui/youtube.webp", url: "https://www.youtube.com/@biggeagle_", size: "square" },
  { id: "instagram", label: "Instagram", icon: "/ui/instagram.webp", url: "https://www.instagram.com/itsnotbrookkk?igsi=eWc2cjlrcHp5Y2d0&utm_source=qr", size: "square" },
  { id: "linkedin", label: "LinkedIn", icon: "/ui/linkedin.webp", url: "https://www.linkedin.com/in/jiawen-h-b51188389/?isSelfProfile=true", size: "square" },
];

// 点击 3D 场景里的哪个物体，打开哪个作品页
// 左边是物体名（Blender 物体名去掉 "." 和空格，例如 Plane.112 → Plane112），
// 右边是作品页 id（在排版编辑器左侧页面列表里能看到并一键复制）
export const WORK_LINKS = {
  // 沙漠段：The Last Omen（金字塔整体 + 里面的金条、经幡、转经筒，以及海报和介绍卡片）
  Plane118: "the-last-omen",
  Pyramid_Door: "the-last-omen",
  Plane095: "the-last-omen",
  Plane096: "the-last-omen",
  Plane072: "the-last-omen",
  Plane112: "the-last-omen",
  Senior_Human_Researcher: "the-last-omen",

  // 海洋段：宝箱（盖子、锁、箱子）→ OUT
  Treasure_Chest_Top: "out",
  Lock: "out",
  Plane026: "out",

  // 鬼屋段：灰色作品列表纸条 → 全部作品页 My Creative Space（卡片内容在 src/config/works.js）
  Plane126: "all-works",

  // 森林段：瀑布 + 瀑布前的池塘 → Flow
  Waterfall001: "flow",
  Waterfall_Foam001: "flow",

  // not_waterfall 这一个物体上画了房子、石头、树等很多东西，所以按贴图区域来分：
  // uv: [左, 上, 右, 下]（0~1，从贴图左上角算起）
  not_waterfall: [
    { uv: [0.0, 0.575, 0.48, 1.0], page: "princess-wencheng" }, // 黑白房子 → 文成公主
    { uv: [0.485, 0.72, 0.61, 0.98], page: "flow" }, // 瀑布左边的石头
    { uv: [0.72, 0.72, 0.83, 0.975], page: "flow" }, // 瀑布右边的石头
  ],

  // 已做好、暂时没绑定到 3D 物体的页面：camellia、album（可以从全部作品页进入）
  // Human_Resarcher: "",  // 沙漠段：文成公主 × 明山神话 卡片
  // Plane125: "",         // 鬼屋段：2D × 3D XR Games 工具卡片
};
