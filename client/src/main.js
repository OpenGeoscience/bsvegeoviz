import Vue from 'vue';
import AsyncComputed from 'vue-async-computed';
import cookies from 'js-cookie';
import Girder, { RestClient } from '@girder/components/src';
import girder from 'resonantgeoview/src/girder';
import ResonantGeo from 'resonantgeo/src';
import App from 'resonantgeoview/src/App.vue';
import router from 'resonantgeoview/src/router';
import store from 'resonantgeoview/src/store';
import { API_URL } from 'resonantgeoview/src/constants';

import '@fortawesome/fontawesome-free/css/all.css';

import { remove_bsve_css, handleDataExchange, handleBsveSearch } from './bsve';
import './patch/';

Vue.use(AsyncComputed);
Vue.use(Girder);

girder.rest = new RestClient({ apiRoot: API_URL });

Vue.use(ResonantGeo, {
  girder: girder.rest,
});

function setCookieFromAuth(auth) {
  const expires = new Date(auth.expires);
  cookies.set('girderToken', auth.token, { expires });
}

function login(auth) {
  setCookieFromAuth(auth);
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

async function start() {
  // if (false) {
  if (window.BSVE !== undefined) {
    console.log('BSVE JS object exists');

    BSVE.init(async () => {
      remove_bsve_css();
      // show_spinner();

      console.log('BSVE.init() callback');
      console.log(BSVE.api.user());

      // in the ready callback function, access to workbench vars are now available.
      var user = BSVE.api.user(), // current logged in user
        authTicket = BSVE.api.authTicket(), // harbinger-auth-ticket
        tenancy = BSVE.api.tenancy(), // logged in user's tenant
        dismissed = false; // used for dismissing modal alert for tagging confirmation

      // set auth cookie for bsve proxy endpoints
      document.cookie = 'minervaHeaders=' + encodeURIComponent(JSON.stringify({
        'harbinger-auth-ticket': authTicket
      }));

      // set bsve api root cookie
      document.cookie = 'bsveRoot=' + encodeURIComponent((() => {
        var appRoot = BSVE.api.appRoot();
        var match = appRoot.match(/([a-z]*)\.bsvecosystem.net/i);
        if (match === null) {
          throw new Error('Unknown app root "' + appRoot + '"');
        }
        var env = match[1].toLowerCase();
        if (env === 'www') {
          return 'https://api.bsvecosystem.net';
        }
        return 'https://api-' + env + '.bsvecosystem.net';
      }));

      var auth = 'Basic ' + window.btoa(user + ':' + authTicket);

      // log in to minerva using bsve credentials
      var { data: result } = await girder.rest.get('bsve/authentication', {
        params: {
          apiroot: 'https:' + BSVE.api.appRoot() + '/api'
        },
        headers: {
          Authorization: auth
        }
      });

      login(result.authToken);

      await girder.rest.fetchUser();
      handleDataExchange(store);
      handleBsveSearch(store);

      new Vue({
        router,
        store,
        render: h => h(App),
        provide: { girderRest: girder.rest },
      }).$mount('#app');
    });
  } else {
    console.log('No BSVE object defined, running local');
    var { data: result } = await girder.rest.get('bsve/authentication2', {
      params: {
        apiroot: 'http://dev.bsvecosystem.net/api'
      },
      headers: {
        Authorization: ''
      }
    });
    login(result.authToken);

    await girder.rest.fetchUser();

    new Vue({
      router,
      store,
      render: h => h(App),
      provide: { girderRest: girder.rest }
    }).$mount('#app');
  }
}
start();
