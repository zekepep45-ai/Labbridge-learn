import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LabBridge Learn",
    short_name: "LabBridge",
    description: "Learn, practise and advance in Medical Laboratory Science.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f4",
    theme_color: "#164b35",
    orientation: "portrait-primary",
    icons: [
      { src: "/labbridge-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/labbridge-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/labbridge-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
