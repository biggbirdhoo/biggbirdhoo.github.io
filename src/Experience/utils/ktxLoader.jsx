// 贴图加载器：原模板用 KTX2，这里改成直接读 WebP（由 npm run textures 从 PNG 生成）
// 保留原来的函数名 useKTX2Texture，这样各个场景组件不用改调用方式
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";

const prepare = (texture) => {
  texture.flipY = false; // glTF 的 UV 方向
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

export const useKTX2Texture = (
  textureUrl,
  transparent = true,
  alphaTestValue = 0.6,
  side = "front"
) => {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  const material = useMemo(() => {
    if (!texture) return null;
    prepare(texture);
    texture.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent,
      alphaTest: alphaTestValue,
      side: side === "front" ? THREE.FrontSide : THREE.DoubleSide,
    });
  }, [texture, transparent, alphaTestValue, side]);

  return material;
};

useKTX2Texture.preload = (url) => useLoader.preload(THREE.TextureLoader, url);
