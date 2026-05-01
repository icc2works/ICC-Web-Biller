// ===================== CLOUD DATABASE CONFIG =====================
// Firebase Realtime Database is the only persistent storage for the app.

window.CNC_CLOUD_DB_CONFIG = window.CNC_CLOUD_DB_CONFIG || {
  enabled: true,
  provider: 'firebase',
  rootPath: 'iccBilling/default',
  firebaseConfig: {
    apiKey: 'AIzaSyAmz5uNooaxKS0eMj4mVRvInBtyICapJD8',
    authDomain: 'icc-web-biller.firebaseapp.com',
    databaseURL: 'https://icc-web-biller-default-rtdb.firebaseio.com/',
    projectId: 'icc-web-biller',
    storageBucket: 'icc-web-biller.firebasestorage.app',
    messagingSenderId: '931634593961',
    appId: '1:931634593961:web:2e61625edb7d8002c6e9b8'
  }
};

// ===================== CLOUD DATABASE ADAPTER =====================
// Uses Firebase Realtime Database for all persistent data.

(function() {
  const state = {
    enabled: false,
    connected: false,
    error: '',
    ref: null,
    readyPromise: null
  };

  function getConfig() {
    return window.CNC_CLOUD_DB_CONFIG || {};
  }

  function hasFirebaseConfig(config) {
    const fb = config.firebaseConfig || {};
    return Boolean(
      config.enabled &&
      window.firebase &&
      fb.apiKey &&
      fb.databaseURL &&
      fb.apiKey.indexOf('YOUR_') !== 0 &&
      fb.databaseURL.indexOf('YOUR_') === -1
    );
  }

  function keyPath(key) {
    return String(key).replace(/[.#$/[\]]/g, '_');
  }

  async function init() {
    if (state.readyPromise) return state.readyPromise;

    state.readyPromise = new Promise(async (resolve) => {
      const config = getConfig();
      state.enabled = Boolean(config.enabled);

      if (!hasFirebaseConfig(config)) {
        state.connected = false;
        state.error = config.enabled ? 'Firebase config is incomplete or SDK is unavailable.' : '';
        resolve(false);
        return;
      }

      try {
        const appName = 'icc-billing-cloud';
        const existing = window.firebase.apps.find(app => app.name === appName);
        const app = existing || window.firebase.initializeApp(config.firebaseConfig, appName);
        state.ref = app.database().ref(config.rootPath || 'iccBilling/default');
        state.connected = true;
        state.error = '';
        resolve(true);
      } catch (error) {
        console.error('Cloud DB init failed:', error);
        state.connected = false;
        state.error = error.message || String(error);
        resolve(false);
      }
    });

    return state.readyPromise;
  }

  async function getAll() {
    if (!await init()) return null;
    const snap = await state.ref.once('value');
    return snap.val() || null;
  }

  async function setData(key, value) {
    if (!await init()) return false;
    try {
      await state.ref.child(keyPath(key)).set(value);
      return true;
    } catch (error) {
      console.error('Cloud DB save failed:', error);
      state.error = error.message || String(error);
      return false;
    }
  }

  async function setAll(data) {
    if (!await init()) return false;
    try {
      await state.ref.set(data || {});
      return true;
    } catch (error) {
      console.error('Cloud DB full save failed:', error);
      state.error = error.message || String(error);
      return false;
    }
  }

  async function removeData(key) {
    if (!await init()) return false;
    try {
      await state.ref.child(keyPath(key)).remove();
      return true;
    } catch (error) {
      console.error('Cloud DB remove failed:', error);
      state.error = error.message || String(error);
      return false;
    }
  }

  async function subscribe(callback) {
    if (!await init()) return false;
    state.ref.on('value', snap => callback(snap.val() || {}));
    return true;
  }

  function status() {
    return {
      enabled: state.enabled,
      connected: state.connected,
      error: state.error
    };
  }

  window.CloudDB = {
    init,
    getAll,
    setData,
    setAll,
    removeData,
    subscribe,
    status
  };
})();
