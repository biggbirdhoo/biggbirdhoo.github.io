// 「我的全部作品」页面（点击鬼屋段的灰色作品列表纸条打开，页面 id：all-works）
// 每张卡片：标题、类别、点击后打开的作品页 id、精选图、图片显示的位置（object-position）
// page 留空 = 还没做页面，卡片显示 "coming soon"
export const ALL_WORKS_ID = "all-works";

export const WORKS = [
  {
    title: "The Last Omen",
    tag: "Game",
    page: "the-last-omen",
    image: "/works/assets/shuyane-mv491z3p2qi.png",
    pos: "32% 50%",
  },
  { title: "OUT", tag: "VR", page: "out", image: "/works/assets/out-01-mv4a06n9cbs.jpg", pos: "60% 40%" },
  { title: "Flow", tag: "Interactive", page: "flow", image: "/works/assets/flow-01-mv49ydi2x65.png", pos: "88% 50%" },
  {
    title: "Princess Wencheng",
    tag: "3D Animation",
    page: "princess-wencheng",
    image: "/works/assets/wencheng-06-mv49zav8j28.png",
    pos: "68% 50%",
  },
  { title: "Apostles of the Rift", tag: "2D Design", page: "", image: "", pos: "50% 50%" },
  { title: "Legends of the Source", tag: "2D Game", page: "", image: "", pos: "50% 50%" },
  {
    title: "The Loving of Camellia",
    tag: "Accessible Design",
    page: "camellia",
    image: "/works/assets/camellia-16-mv4a0s7pukh.png",
    pos: "35% 50%",
  },
  { title: "Album Collection", tag: "Photography", page: "album", image: "/works/assets/album-11-mv4a0lmocvp.jpg", pos: "50% 35%" },
];
