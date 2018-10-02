import MapScreenshotDialog from "resonantgeoview/src/views/MapScreenshotDialog";


var baseRender = MapScreenshotDialog.render;
MapScreenshotDialog.render = function(h) {
  var base = baseRender.call(this, h);
  base.componentOptions.children[0].componentOptions.children[1].children.splice(
    1,
    0,
    h(
      "v-btn",
      {
        attrs: { color: "primary" },
        on: {
          click: e => {
            this.log(e);
          }
        }
      },
      "Dossier"
    )
  );
  return base;
};
