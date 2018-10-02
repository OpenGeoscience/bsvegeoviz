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

import './patch/';

window.mockAuth = { "expires": "2019-03-25T18:05:46.631415+00:00", "token": "fHYOZGnjFTIiAYfrN8WsBJXIBLj0mraeWkLKOjBBeDDrcdk1u9WA5bAwtBuZJGL0" };

window.bsveAuth = "Basic bWF0dGhldy5tYUBraXR3YXJlLmNvbTpCZWFyZXIgZXlKcmFXUWlPaUpTU20xU1dUZ3hNVEJhZUUwMlNXeGxkR1V4ZGtvd09YZElVak5KVXpoWGJVSllaSGh1TUY4Mk16Vk5JaXdpWVd4bklqb2lVbE15TlRZaWZRLmV5SjJaWElpT2pFc0ltcDBhU0k2SWtGVUxqaFFjR1ZXUlhCT01VTmlYMGxKYlVjMlFYZHdNMEk1U0c0M2RVNXhiVGhUUWpOMlJFbFdXbHBYYmxFdUsxbDFhMUpEYW1wR1FVODNSME5SWTJGbE1uTTNMM2xMYmxSQlNETlJUME5VWkVkaldFY3pTRVU1YnowaUxDSnBjM01pT2lKb2RIUndjem92TDNGaExXRjFkR2d1WW5OMlpXTnZjM2x6ZEdWdExtNWxkQzl2WVhWMGFESXZZWFZ6Wm5abGIyRnlZVGRCYmpnNFpXSXdhRGNpTENKaGRXUWlPaUpDVTFaRklpd2lhV0YwSWpveE5UTTRNREF4TVRFNUxDSmxlSEFpT2pFMU16Z3dNRFEzTVRrc0ltTnBaQ0k2SWpCdllXWjJZbUV4TlhGdE1VNXZjRVl4TUdnM0lpd2lkV2xrSWpvaU1EQjFaMk50T1RCa01HZHNSREZ6UlhBd2FEY2lMQ0p6WTNBaU9sc2liMlptYkdsdVpWOWhZMk5sYzNNaUxDSmljM1psTFhCeWIyWnBiR1VpTENKdmNHVnVhV1FpWFN3aWMzVmlJam9pYldGMGRHaGxkeTV0WVVCcmFYUjNZWEpsTG1OdmJTSXNJbVpwY25OMFRtRnRaU0k2SWsxaGRIUm9aWGNpTENKc1lYTjBUbUZ0WlNJNklrMWhJaXdpY0hKcGJXRnllVVZ0WVdsc0lqb2liV0YwZEdobGR5NXRZVUJyYVhSM1lYSmxMbU52YlNKOS5vZmpkeWNCNHo3NjNvQ01vNEdJc215Yk05X1M0WXFJVFNQTk9Ub0VkRjZTOUM5a29ZLWotSGlPb3NubUhFMUZtcjZvXzIxMktrRjZjZ09ZMUtZUXVycDFWbXI5MXh4RmhjQmxIcXlRY0wtZUI0YV9TYWpkVEJ3UDEyZUo2ekx3QndLYmxhMDZlR3E5MUM3bzgtcmhhSUZMcE1KYjUwdGR5c0YwUXF4MUQ0WEZONjlocDhBN1dlWV9hWGEtR0JHOE5SU04yaEM5YVBNSFNHcDZpblBFUVJ5ZDFJamh3X2FrTHMzdVdHaTUzSDU3SmdqM25QVVdrVVlRbUFCVTlMNmxvVDF1Wjd2SXA2T3ZDMk5zVUREVHVuLVBKVHpSc0t6MlFWUTBkMDJBdlJ6ZFJUYXRMcldjMnF0WWJ4YUQ2OXAxNmFodUc0RUpab1RwQ3F5RG51LUwtSVFfVGhpcmRQYXJ0eV81UDg3azFCWnpyVHFzd0dVaE1xYXdJdnJ5UEQ2UHFTdTNrcFFzNHBTdGRNV3JMWFdMaDBCODN0OTRQclJEdGJHai92KzZhdDUrNlVXYTRTUzRPM2IvakVqODlHVklUck10bWt4SFZUYTR2RT0=";

Vue.use(AsyncComputed);

eventstream.open();
girder.rest = new Session({ apiRoot: API_URL });

Vue.use(ResonantGeo, {
  girder: girder.rest,
});


// abc(window.mockAuth);

function setCookieFromAuth(auth) {
  const expires = new Date(auth.expires);
  cookies.set('girderToken', auth.token, { expires });
}

function abc(auth) {
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

(async () => {
  var { data: result } = await girder.rest.get('bsve/authentication2', {
    params: {
      apiroot: 'http://dev.bsvecosystem.net/api'
    },
    headers: {
      Authorization: bsveAuth
    }
  });
  abc(result.authToken);

  await girder.rest.$refresh();

  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app');
})();



window.setCookieFromAuth = setCookieFromAuth;
window.abc = abc;
