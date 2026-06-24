// ===========================================================================
// YOUR CUSTOM AVATAR DECORATIONS
// ===========================================================================
// Design overlays in Photoshop and register them here. They sit on top of the
// avatar like a frame, so the centre should be transparent (the avatar shows
// through) and the art should live around the edges.
//
// HOW TO ADD ONE:
//   1. Export a SQUARE transparent PNG.
//      - Recommended size: 512 x 512 px. Do not go above 1024 x 1024.
//      - Keep each file under ~150 KB so the app stays light.
//   2. Drop the file into:  public/decorations/<your-file>.png
//   3. Add a line to the list below:
//        { id: "deco_flames", name: "Flames", cost: 500, file: "flames.png" }
//      - id    : any unique short code, must start with "deco_"
//      - name  : what shows in the shop
//      - cost  : price in points
//      - file  : the PNG filename only (no folder), it loads from public/decorations/
//
// That is it. The decoration appears in the shop automatically.
// ===========================================================================

export const DECORATIONS = [
  // Examples, replace with your own once the PNGs are in public/decorations/:
  // { id: "deco_flames", name: "Flames", cost: 500, file: "flames.png" },
  // { id: "deco_laurel", name: "Laurel", cost: 800, file: "laurel.png" },
];

// Where the PNGs are served from. Works on Vercel and on a sub-path deploy.
export const decoSrc = (file) => `${import.meta.env.BASE_URL || "/"}decorations/${file}`;
