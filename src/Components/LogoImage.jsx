import React from "react";

export default function LogoImage({ src, alt = "", style = {}, ...props }) {
  if (!src) return null;
  return <img src={src} alt={alt} style={style} {...props} />;
}
