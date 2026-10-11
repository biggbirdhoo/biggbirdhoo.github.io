// 作品页用网址 #/work/<页面id> 打开，可以直接分享，浏览器返回键也能关闭
export const WORK_HASH = "#/work/";

export const readWorkId = () =>
  window.location.hash.startsWith(WORK_HASH)
    ? decodeURIComponent(window.location.hash.slice(WORK_HASH.length))
    : null;

export const openWork = (id) => {
  window.history.pushState({ fromSite: true }, "", `${WORK_HASH}${encodeURIComponent(id)}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
};

export const closeWork = () => {
  if (window.history.state?.fromSite) {
    window.history.back();
  } else {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
};
