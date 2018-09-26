import Vue from 'vue';

import ResonantGeo from 'resonantgeo/src';
import { Session } from 'resonantgeo/src/rest';
import { API_URL } from 'resonantgeoview/src/constants';
import eventstream from 'resonantgeoview/src/utils/eventstream';
import AsyncComputed from 'vue-async-computed';
import '@fortawesome/fontawesome-free/css/all.css';
import girder from 'resonantgeoview/src/girder';
import cookies from 'js-cookie';

import App from 'resonantgeoview/src/App.vue';
import router from 'resonantgeoview/src/router';
import store from 'resonantgeoview/src/store';

window.router = router;
window.girder = girder;

window.mockAuth = { "expires": "2019-03-25T18:05:46.631415+00:00", "token": "ri0Ot2VtkjfewGNnIU5WUZdkusWCxsUnh7WfjlxOnu6gGTh9sjFTrAsYVAz8nvc6" };

Vue.use(AsyncComputed);

eventstream.open();
girder.rest = new Session({ apiRoot: API_URL });

Vue.use(ResonantGeo, {
  girder: girder.rest,
});

girder.rest.$refresh().then(() => {
  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app');
});

function setCookieFromAuth(auth) {
  const expires = new Date(auth.expires);
  cookies.set('girderToken', auth.token, { expires });
}

function abc(auth) {
  girder.rest.interceptors.request.handlers[0].fulfilled = (config) => {
    const headers = {
      'Girder-Token': auth.token,
      ...config.headers,
    };
    return {
      ...config,
      baseURL: '/api/v1',
      headers,
    };
  }
}

(config) => {
  const headers = {
    'Girder-Token': this.token,
    ...config.headers,
  };
  return {
    ...config,
    baseURL: this.apiRoot,
    headers,
  };
};


window.setCookieFromAuth = setCookieFromAuth;
window.abc = abc;
