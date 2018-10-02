import wrap from "lodash-es/wrap";
import App from "resonantgeoview/src/App";

App.render = wrap(App.render, function (render, h) {
    var base = render.call(this, h);
    base.componentOptions.children.shift();
    return base;
});
