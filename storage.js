(function () {
  'use strict';
  var DB_COLLECTION = 'family';
  var DB_DOC = 'data';
  function getDb() { return firebase.firestore(); }
  async function ensureAuth() {
    try {
      var auth = firebase.auth();
      if (!auth.currentUser) { await auth.signInAnonymously(); console.log('[storage] signed in anonymously'); }
    } catch (e) { console.warn('[storage] anonymous sign-in failed:', e.message); }
  }
  async function saveGalleryPhotos(db, gallery) {
    if (!Array.isArray(gallery)) return;
    for (var i = 0; i < gallery.length; i++) {
      var item = gallery[i];
      if (item && typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:')) {
        try {
          await db.collection(DB_COLLECTION).doc('gallery_photo_' + i).set({ d: item.dataUrl });
          console.log('[storage] saved gallery photo ' + i);
        } catch (e) { console.warn('[storage] failed to save photo ' + i + ':', e.message); }
      }
    }
  }

  async function loadGalleryPhotos(db, gallery) {
    if (!Array.isArray(gallery) || gallery.length === 0) return gallery;
    var result = gallery.slice();
    for (var i = 0; i < result.length; i++) {
      try {
        var snap = await db.collection(DB_COLLECTION).doc('gallery_photo_' + i).get();
        if (snap.exists && snap.data().d && snap.data().d.length > 10) {
          result[i] = Object.assign({}, result[i], { dataUrl: snap.data().d });
          console.log('[storage] loaded gallery photo ' + i);
        }
      } catch (e) { console.warn('[storage] failed to load photo ' + i + ':', e.message); }
    }
    return result;
  }

  async function saveGalleryObjPhotos(db, gallery) {
    if (!gallery || typeof gallery !== 'object') return;
    var keys = Object.keys(gallery);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = gallery[key];
      if (typeof val === 'string' && val.startsWith('data:')) {
        try {
          await db.collection(DB_COLLECTION).doc('gallery_photo_' + key).set({ d: val });
          console.log('[storage] saved gallery obj photo ' + key);
        } catch (e) {
          console.warn('[storage] failed to save gallery obj photo ' + key + ':', e.message);
        }
      }
    }
  }

  async function loadGalleryObjPhotos(db, gallery) {
    if (!gallery || typeof gallery !== 'object') return gallery;
    var result = Object.assign({}, gallery);
    var keys = Object.keys(result);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        var snap = await db.collection(DB_COLLECTION).doc('gallery_photo_' + key).get();
        if (snap.exists && snap.data().d && snap.data().d.length > 10) {
          result[key] = snap.data().d;
          console.log('[storage] loaded gallery obj photo ' + key);
        }
      } catch (e) {
        console.warn('[storage] failed to load gallery obj photo ' + key + ':', e.message);
      }
    }
    return result;
  }
  async function saveRecipePhotos(db, recipes) {
    if (!Array.isArray(recipes)) return;
    for (var i = 0; i < recipes.length; i++) {
      var item = recipes[i];
      if (item && typeof item.photo === 'string' && item.photo.startsWith('data:')) {
        try {
          await db.collection(DB_COLLECTION).doc('recipe_photo_' + (item.id || i)).set({ d: item.photo });
          console.log('[storage] saved recipe photo ' + (item.id || i));
        } catch (e) { console.warn('[storage] failed to save recipe photo ' + (item.id || i) + ':', e.message); }
      }
    }
  }

  async function loadRecipePhotos(db, recipes) {
    if (!Array.isArray(recipes) || recipes.length === 0) return recipes;
    var result = recipes.slice();
    for (var i = 0; i < result.length; i++) {
      var item = result[i];
      var docId = 'recipe_photo_' + (item.id || i);
      try {
        var snap = await db.collection(DB_COLLECTION).doc(docId).get();
        if (snap.exists && snap.data().d && snap.data().d.length > 10) {
          result[i] = Object.assign({}, result[i], { photo: snap.data().d });
          console.log('[storage] loaded recipe photo ' + (item.id || i));
        }
      } catch (e) { console.warn('[storage] failed to load recipe photo ' + (item.id || i) + ':', e.message); }
    }
    return result;
  }
  window.storage = {
    get: async function (key, parse) {
      try {
        await ensureAuth();
        var db = getDb();
        var snap = await db.collection(DB_COLLECTION).doc(DB_DOC).get();
        if (!snap.exists) return null;
        var val = snap.data().value;
        if (parse && typeof val === 'string') {
          var data = JSON.parse(val);
          if (Array.isArray(data.gallery) && data.gallery.length > 0) {
            data.gallery = await loadGalleryPhotos(db, data.gallery);
          }
          if (data.gallery && typeof data.gallery === 'object' && !Array.isArray(data.gallery) && Object.keys(data.gallery).length > 0) {
            data.gallery = await loadGalleryObjPhotos(db, data.gallery);
          }
          if (Array.isArray(data.recipes) && data.recipes.length > 0) {
            data.recipes = await loadRecipePhotos(db, data.recipes);
          }
          return data;
        }
        return val;
      } catch (e) { console.warn('[storage] get failed:', e.message); return null; }
    },
    set: async function (key, value, stringify) {
      try {
        await ensureAuth();
        var db = getDb();
        var toSave = stringify ? (typeof value === 'string' ? value : JSON.stringify(value)) : value;
        if (typeof toSave === 'string') {
          var data = JSON.parse(toSave);
          if (Array.isArray(data.gallery)) { await saveGalleryPhotos(db, data.gallery); }
          if (data.gallery && typeof data.gallery === 'object' && !Array.isArray(data.gallery)) { await saveGalleryObjPhotos(db, data.gallery); }
          if (Array.isArray(data.recipes)) { await saveRecipePhotos(db, data.recipes); }
          var stripB64 = function (item) {
            if (!item) return item;
            if (typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:')) return Object.assign({}, item, { dataUrl: '' });
            if (typeof item.photo === 'string' && item.photo.startsWith('data:')) return Object.assign({}, item, { photo: '' });
            return item;
          };
          if (Array.isArray(data.photos)) data.photos = data.photos.map(stripB64);
          if (Array.isArray(data.gallery)) data.gallery = data.gallery.map(stripB64);
          if (Array.isArray(data.memories)) data.memories = data.memories.map(stripB64);
          if (Array.isArray(data.recipes)) data.recipes = data.recipes.map(stripB64);
          if (data.gallery && typeof data.gallery === 'object' && !Array.isArray(data.gallery)) { var gK = Object.keys(data.gallery); for (var gi = 0; gi < gK.length; gi++) { if (typeof data.gallery[gK[gi]] === 'string' && data.gallery[gK[gi]].startsWith('data:')) { data.gallery[gK[gi]] = ''; } } }
          toSave = JSON.stringify(data);
        }
        await db.collection(DB_COLLECTION).doc(DB_DOC).set({ value: toSave });
        console.log('[storage] saved to Firestore');
      } catch (e) { console.warn('[storage] set failed:', e.message); }
    }
  };
  console.log('[storage] window.storage ready (Firebase Firestore)');
})();
