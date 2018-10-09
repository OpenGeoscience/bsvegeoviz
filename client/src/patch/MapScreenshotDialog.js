import wrap from "lodash-es/wrap";
import MapScreenshotDialog from "resonantgeoview/src/views/MapScreenshotDialog";

import DossierCreator from "./DossierCreator";

MapScreenshotDialog.data = wrap(MapScreenshotDialog.data, function (data) {
  return { ...data(), ...{ dossierDialog: false } };
});

MapScreenshotDialog.render = wrap(MapScreenshotDialog.render, function (render, h) {
  var base = render.call(this, h);
  base.componentOptions.children.splice(
    1,
    0,
    h(
      DossierCreator,
      {
        props: {
          value: this.dossierDialog,
          image: this.image
        },
        on: {
          input: (value) => {
            this.dossierDialog = value;
          }
        }
      }
    )
  );
  base.componentOptions.children[0].componentOptions.children[1].children.splice(
    1,
    0,
    h(
      "v-btn",
      {
        props: {
          disabled: !this.image
        },
        attrs: { color: "primary" },
        on: {
          click: e => {
            this.dossierDialog = true;
          }
        }
      },
      "Dossier"
    )
  );
  return base;
});
