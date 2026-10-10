import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"; 

import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

(function(){

  var memoryStore = window.SharedFuelStore;

  var storage =
    (typeof window.storage !== 'undefined')
      ? window.storage
      : {

          get: function(k){

            return new Promise(
              function(res, rej){

                if(
                  Object.prototype
                    .hasOwnProperty
                    .call(memoryStore,k)
                ){

                  res({
                    key:k,
                    value:memoryStore[k],
                    shared:true
                  });

                }else{

                  rej(
                    new Error('not found')
                  );

                }

              }
            );

          },


          set: function(k,v){

            return new Promise(
              function(res){

                memoryStore[k]=v;

                res({
                  key:k,
                  value:v,
                  shared:true
                });

              }
            );

          },


          delete: function(k){

            return new Promise(
              function(res){

                delete memoryStore[k];

                res({
                  key:k,
                  deleted:true,
                  shared:true
                });

              }
            );

          },


          list: function(prefix){

            return new Promise(
              function(res){

                var keys =
                  Object.keys(
                    memoryStore
                  ).filter(
                    function(k){

                      return !prefix ||
                        k.indexOf(prefix)===0;

                    }
                  );


                res({
                  keys:keys
                });

              }
            );

          }

        };


  async function getRecord(key){

    try{

      var r =
        await storage.get(
          key,
          true
        );


      return r
        ? JSON.parse(r.value)
        : null;

    }
    catch(e){

      return null;

    }

  }


  async function setRecord(
    key,
    obj
  ){

    try{

      await storage.set(
        key,
        JSON.stringify(obj),
        true
      );


      return true;

    }
    catch(e){

      return false;

    }

  }


  /* =========================
     STATION DATA
     ========================= */

  var FUEL_COLORS = {

    Petrol:'#FFB020',

    Diesel:'#8891A3',

    CNG:'#35D07F',

    EV:'#5AA9FF'

  };


 var STATIONS = [

  {
    id: 's1',
    brand: 'Indian Oil',
    brandColor: '#E4572E',

    name: 'Indian Oil — Linking Road',
    addr: '241 Linking Road, Bandra West, Mumbai, Maharashtra 400050',

    latitude: 19.0625,
    longitude: 72.8297,

    dist: 0.6,
    x: 38,
    y: 44,

    queue: 8,
    avgService: 4,

    pumps: {
      active: 3,
      total: 4
    },

    fuels: {
      Petrol: {
        price: 104.50,
        stock: 'ok'
      },
      Diesel: {
        price: 92.10,
        stock: 'ok'
      },
      CNG: {
        price: 76.00,
        stock: 'low'
      }
    }
  },


  {
    id: 's2',
    brand: 'HP',
    brandColor: '#F7941D',

    name: 'HP Petrol Pump — Turner Road',
    addr: '3/4, Junction of S.V. Road & Turner Road, Bandra West, Mumbai, Maharashtra 400050',

    latitude: 19.0608,
    longitude: 72.8358,

    dist: 1.1,
    x: 60,
    y: 30,

    queue: 3,
    avgService: 3,

    pumps: {
      active: 4,
      total: 4
    },

    fuels: {
      Petrol: {
        price: 104.62,
        stock: 'ok'
      },
      Diesel: {
        price: 92.30,
        stock: 'ok'
      }
    }
  },


  {
    id: 's3',
    brand: 'Bharat Petroleum',
    brandColor: '#0072BC',

    name: 'Bharat Petroleum — SV Road',
    addr: 'S.V. Road, Khar West, Mumbai, Maharashtra 400052',

    latitude: 19.0680,
    longitude: 72.8375,

    dist: 1.8,
    x: 20,
    y: 70,

    queue: 14,
    avgService: 5,

    pumps: {
      active: 2,
      total: 4
    },

    fuels: {
      Petrol: {
        price: 104.45,
        stock: 'low'
      },
      Diesel: {
        price: 91.95,
        stock: 'ok'
      },
      CNG: {
        price: 75.80,
        stock: 'ok'
      }
    }
  },


  {
    id: 's4',
    brand: 'Shell',
    brandColor: '#FBCE07',

    name: 'Shell — Hill Road',
    addr: 'Junction of S.V. Road & Hill Road, Bandra West, Mumbai, Maharashtra 400050',

    latitude: 19.0558,
    longitude: 72.8309,

    dist: 2.3,
    x: 75,
    y: 60,

    queue: 0,
    avgService: 4,

    pumps: {
      active: 3,
      total: 3
    },

    fuels: {
      Petrol: {
        price: 106.10,
        stock: 'ok'
      },
      Diesel: {
        price: 93.40,
        stock: 'ok'
      },
      EV: {
        price: 18.50,
        stock: 'ok'
      }
    }
  },


  {
    id: 's5',
    brand: 'Reliance',
    brandColor: '#3B5FE0',

    name: 'Reliance — Waterfield Road',
    addr: 'Waterfield Road, Bandra West, Mumbai, Maharashtra 400050',

    latitude: 19.0590,
    longitude: 72.8315,

    dist: 2.9,
    x: 15,
    y: 20,

    queue: 6,
    avgService: 3,

    pumps: {
      active: 2,
      total: 2
    },

    fuels: {
      Petrol: {
        price: 105.20,
        stock: 'ok'
      },
      Diesel: {
        price: 92.75,
        stock: 'out'
      }
    }
  },


  {
    id: 's6',
    brand: 'Indian Oil',
    brandColor: '#E4572E',

    name: 'Indian Oil — Carter Road',
    addr: 'Carter Road, Bandra West, Mumbai, Maharashtra 400050',

    latitude: 19.0605,
    longitude: 72.8195,

    dist: 3.4,
    x: 85,
    y: 82,

    queue: 11,
    avgService: 4,

    pumps: {
      active: 3,
      total: 5
    },

    fuels: {
      Petrol: {
        price: 104.50,
        stock: 'ok'
      },
      Diesel: {
        price: 92.10,
        stock: 'ok'
      },
      CNG: {
        price: 76.00,
        stock: 'ok'
      }
    }
  }

];


  var FUEL_MODE_PRICE_REF = {

    Petrol:104.50,

    Diesel:92.10,

    CNG:76.00,

    EV:18.5

  };


  /* =========================
     STATE
     ========================= */

  var state = {

    activeFuelFilter:'All',

    view:'list',

    currentStation:null,

    booking:{

      fuel:'Petrol',

      mode:'amount',

      amountValue:500,

      litresValue:5,

      payMode:'prepay',

      /* UPDATED TIME SLOT */

      slotType:'quick',

      slotTime:null

    },

    activeToken:null,

    history:[],

    intervalId:null

  };


  /* =========================
     HELPERS
     ========================= */

  function el(id){

    return document.getElementById(id);

  }


  /*
    UPDATED showScreen()

    Ye black-screen issue fix karta hai.
    Pehle sirf class remove ho rahi thi.
    Ab display bhi properly reset hota hai.
  */

   function showScreen(id){

  document
    .querySelectorAll('.screen')
    .forEach(function(s){

      s.classList.remove('active');
      s.style.display = 'none';

    });

  var screen =
    document.getElementById(id);

  if(screen){

    screen.classList.add('active');
    screen.style.display = 'flex';

  }

}


  function fmtINR(n){

    return '₹' +
      Number(n)
        .toFixed(2)
        .replace(
          /\.00$/,
          ''
        );

  }


  function stockLabel(s){

    return s === 'ok'
      ? 'In stock'
      : s === 'low'
        ? 'Low stock'
        : 'Out of stock';

  }


  function estWait(station){

    var activePumps =
      Math.max(
        station.pumps.active,
        1
      );


    return Math.round(

      (
        station.queue *
        station.avgService
      ) /
      activePumps

    );

  }


  /* =========================
     FIREBASE
     ========================= */

  const auth =
    window.auth;

  const db =
    window.db;


  let isSignup =
    false;


  const authEmail =
    document.getElementById(
      "auth-email"
    );


  const authPassword =
    document.getElementById(
      "auth-password"
    );


  const authButton =
    document.getElementById(
      "btn-auth"
    );


  const toggleAuthButton =
    document.getElementById(
      "btn-toggle-auth"
    );


  const authError =
    document.getElementById(
      "auth-error"
    );


  function showAuthError(
    message
  ){

    if(!authError)
      return;


    authError.textContent =
      message;


    authError.style.display =
      "block";

  }


  function clearAuthError(){

    if(!authError)
      return;


    authError.textContent =
      "";


    authError.style.display =
      "none";

  }
    
/* =========================
   SAVED STATIONS
   ========================= */

async function loadSavedStations(){

  try{

    var user = auth.currentUser;

    if(!user){
      return;
    }

    var userRef = doc(
      db,
      'users',
      user.uid
    );

    var snap = await getDoc(userRef);

    var data =
      snap.exists()
        ? snap.data()
        : {};

    var savedStations =
      Array.isArray(data.savedStations)
        ? data.savedStations
        : [];


    /* =========================
       COUNT
       ========================= */

    var countEl =
      el('saved-stations-count');

    if(countEl){

      if(savedStations.length === 0){

        countEl.textContent =
          'No stations saved';

      }
      else if(savedStations.length === 1){

        countEl.textContent =
          '1 station pinned';

      }
      else{

        countEl.textContent =
          savedStations.length +
          ' stations pinned';

      }

    }


    /* =========================
       LIST CONTAINER
       ========================= */

    var listEl =
      el('saved-stations-list');

    if(!listEl){
      return;
    }

    listEl.innerHTML = '';


    /* =========================
       NO SAVED STATIONS
       ========================= */

    if(savedStations.length === 0){

      listEl.innerHTML =
        '<div class="saved-empty">' +

          '<div class="saved-empty-icon">☆</div>' +

          '<div class="saved-empty-title">' +
            'No saved stations' +
          '</div>' +

          '<div class="saved-empty-text">' +
            'Save your favourite fuel stations ' +
            'to find them quickly.' +
          '</div>' +

        '</div>';

      return;

    }


    /* =========================
       RENDER SAVED STATIONS
       ========================= */

    savedStations.forEach(
      function(stationId){

        var station =
          STATIONS.find(
            function(st){
              return st.id === stationId;
            }
          );

        if(!station){
          return;
        }


        var card =
          document.createElement('div');

        card.className =
          'saved-station-card';


        var wait =
          estWait(station);


        card.innerHTML =

          '<div class="saved-station-top">' +

            '<div>' +

              '<div class="saved-station-brand">' +
                station.brand +
              '</div>' +

              '<div class="saved-station-name">' +
                station.name.replace(
                  station.brand + ' — ',
                  ''
                ) +
              '</div>' +

            '</div>' +

            '<div class="saved-star">★</div>' +

          '</div>' +


          '<div class="saved-station-address">' +
            station.addr +
          '</div>' +


          '<div class="saved-station-info">' +

            '<span>' +
              station.dist.toFixed(1) +
              ' km' +
            '</span>' +

            '<span>•</span>' +

            '<span>' +
              station.queue +
              ' in queue' +
            '</span>' +

            '<span>•</span>' +

            '<span>' +
              wait +
              ' min wait' +
            '</span>' +

          '</div>' +


          '<button class="saved-open-btn">' +
            'Open station' +
          '</button>';


        var openButton =
          card.querySelector(
            '.saved-open-btn'
          );


        openButton.addEventListener(
          'click',
          function(){

            openDetail(
              station.id
            );

          }
        );


        listEl.appendChild(
          card
        );

      }
    );


    console.log(
      'Saved station cards rendered:',
      savedStations
    );

  }
  catch(error){

    console.error(
      'Saved stations loading error:',
      error
    );

  }

}

      /* =========================
   SAVED STATIONS TOGGLE
   ========================= */

var savedStationsButton =
  el('btn-saved-stations');

if(savedStationsButton){

  savedStationsButton.addEventListener(
    'click',
    async function(){

      var listEl =
        el('saved-stations-list');

      if(!listEl){
        return;
      }

      /* Refresh latest saved stations */
      await loadSavedStations();

      /* Toggle */
      listEl.classList.toggle('show');

    }
  );

}

  /* =========================
     LOGIN / SIGNUP TOGGLE
     ========================= */

  if(toggleAuthButton){

    toggleAuthButton.addEventListener(
      "click",
      function(){

        isSignup =
          !isSignup;


        clearAuthError();


        if(isSignup){

          document.getElementById(
            "auth-title"
          ).textContent =
            "Create your PumpLine account";


          document.getElementById(
            "auth-subtitle"
          ).textContent =
            "Create an account to book fuel slots.";


          authButton.textContent =
            "Create Account";


          toggleAuthButton.textContent =
            "Already have an account? Login";

        }
        else{

          document.getElementById(
            "auth-title"
          ).textContent =
            "Welcome to PumpLine";


          document.getElementById(
            "auth-subtitle"
          ).textContent =
            "Login to book your fuel slot.";


          authButton.textContent =
            "Login";


          toggleAuthButton.textContent =
            "Create new account";

        }

      }
    );

  }


  /* =========================
     LOGIN / SIGNUP
     ========================= */

  if(authButton){

    authButton.addEventListener(
      "click",
      async function(){

        const email =
          authEmail.value.trim();


        const password =
          authPassword.value;


        clearAuthError();


        if(
          !email ||
          !password
        ){

          showAuthError(
            "Please enter email and password."
          );

          return;

        }


        if(
          password.length < 6
        ){

          showAuthError(
            "Password must be at least 6 characters."
          );

          return;

        }


        authButton.disabled =
          true;


        try{

            await setPersistence(
  auth,
  browserSessionPersistence
);

          if(isSignup){

            const result =
              await createUserWithEmailAndPassword(
                auth,
                email,
                password
              );


            const user =
              result.user;


            await setDoc(

              doc(
                db,
                "users",
                user.uid
              ),

              {

                uid:
                  user.uid,

                email:
                  user.email,

                role:
                  "customer",

                createdAt:
                  serverTimestamp()

              }

            );

          }
          else{

            await signInWithEmailAndPassword(

              auth,

              email,

              password

            );

          }

        }
        catch(error){

          console.error(
            "Authentication error:",
            error
          );


          let message =
            "Something went wrong.";


          if(
            error.code ===
            "auth/invalid-credential"
          ){

            message =
              "Invalid email or password.";

          }


          if(
            error.code ===
            "auth/email-already-in-use"
          ){

            message =
              "This email is already registered.";

          }


          if(
            error.code ===
            "auth/weak-password"
          ){

            message =
              "Password must be at least 6 characters.";

          }


          if(
            error.code ===
            "auth/invalid-email"
          ){

            message =
              "Please enter a valid email.";

          }


          showAuthError(
            message
          );

        }
        finally{

          authButton.disabled =
            false;

        }

      }
    );

  }


  /* =========================
     FIREBASE AUTH STATE
     ========================= */

  onAuthStateChanged(
    auth, 
     async function(user){

    if(user){

  console.log(
    "Logged-in customer:",
    user.email
  );

  // Reset location screen
  // Login ke baad location automatically start nahi hogi

  if(el('locating-state')){

    el('locating-state')
      .classList.remove('active');

  }

  if(el('btn-locate')){

    el('btn-locate')
      .style.display = 'flex';

  }
    await loadCustomerProfile();
    await loadSavedStations();

 
  showScreen(
    "screen-location"
  );

}
      else{

        console.log(
          "No user logged in"
        );


        showScreen(
          "screen-auth"
        );

      }

    }
  );
   /* =========================
   SAVE / UNSAVE STATION
   ========================= */

async function toggleSavedStation(){

  try{

    var user =
      auth.currentUser;

    var station =
      state.currentStation;

    if(!user){

      alert(
        'Please login first.'
      );

      return;

    }

    if(!station){

      return;

    }


    var userRef =
      doc(
        db,
        'users',
        user.uid
      );


    var snap =
      await getDoc(userRef);


    var data =
      snap.exists()
        ? snap.data()
        : {};


    var savedStations =
      Array.isArray(data.savedStations)
        ? data.savedStations.slice()
        : [];


    var index =
      savedStations.indexOf(
        station.id
      );


    if(index === -1){

      /* SAVE */

      savedStations.push(
        station.id
      );

    }
    else{

      /* UNSAVE */

      savedStations.splice(
        index,
        1
      );

    }


    await setDoc(

      userRef,

      {
        savedStations:
          savedStations,

        updatedAt:
          serverTimestamp()
      },

      {
        merge:true
      }

    );


    updateSaveStationButton();


    console.log(
      'Saved stations:',
      savedStations
    );

  }
  catch(error){

    console.error(
      'Save station error:',
      error
    );

    alert(
      'Could not update saved station.'
    );

  }

}
/* =========================
   UPDATE SAVE BUTTON
   ========================= */

async function updateSaveStationButton(){

  var button =
    el('btn-save-station');

  var user =
    auth.currentUser;

  var station =
    state.currentStation;


  if(!button || !user || !station){

    return;

  }


  try{

    var snap =
      await getDoc(
        doc(
          db,
          'users',
          user.uid
        )
      );


    var data =
      snap.exists()
        ? snap.data()
        : {};


    var savedStations =
      Array.isArray(data.savedStations)
        ? data.savedStations
        : [];


    var isSaved =
      savedStations.includes(
        station.id
      );


    if(isSaved){

      button.textContent =
        '★';

      button.classList.add(
        'saved'
      );

      button.title =
        'Remove saved station';

    }
    else{

      button.textContent =
        '☆';

      button.classList.remove(
        'saved'
      );

      button.title =
        'Save station';

    }

  }
  catch(error){

    console.error(
      'Save button update error:',
      error
    );

  }

}
   /* =========================
   LOCATION SCREEN
   ========================= */

el('btn-locate').addEventListener(
  'click',
  function(){

    console.log("Find fuel stations clicked");

    var locateBtn = el('btn-locate');
    var locatingState = el('locating-state');

    if(locateBtn){
      locateBtn.style.display = 'none';
    }

    if(locatingState){
      locatingState.classList.add('active');
    }

    function proceed(label){

      setTimeout(
        function(){

          el('home-addr').textContent = label;

          renderStationList();

          showScreen('screen-home');

        },
        900
      );

    }

    /* Try browser location */

    if(navigator.geolocation){

      navigator.geolocation.getCurrentPosition(

        function(position){

          console.log(
            "Location found:",
            position.coords.latitude,
            position.coords.longitude
          );

          proceed('Bandra West, Mumbai');

        },

        function(error){

          console.log(
            "Location permission/error:",
            error.message
          );

          /* Still continue even if location denied */

          proceed(
            'Bandra West, Mumbai (approx.)'
          );

        },

        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 60000
        }

      );

    }
    else{

      proceed(
        'Bandra West, Mumbai'
      );

    }

  }
);

    /* =========================
   STATION LIST
   ========================= */

function renderStationList(){

  var container = el('station-list');

  if(!container){
    console.error('station-list element not found');
    return;
  }

  container.innerHTML = '';

  var list = STATIONS.slice();

  /* Fuel filter */
  if(state.activeFuelFilter !== 'All'){

    list = list.filter(function(st){

      return (
        st.fuels[state.activeFuelFilter] &&
        st.fuels[state.activeFuelFilter].stock !== 'out'
      );

    });

  }

  /* Sort by distance */
  list.sort(function(a,b){
    return a.dist - b.dist;
  });

  if(list.length === 0){

    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="title">No stations match that</div>' +
        '<div class="body-text">' +
          'Try another fuel type.' +
        '</div>' +
      '</div>';

    return;
  }

  list.forEach(function(st){

    var refFuel =
      state.activeFuelFilter !== 'All'
        ? state.activeFuelFilter
        : 'Petrol';

    var fuelInfo = st.fuels[refFuel];

    var wait = Math.max(
      0,
      Math.round(
        (st.queue * st.avgService) /
        Math.max(st.pumps.active, 1)
      )
    );

    var card = document.createElement('button');

    card.className = 'station-card';

    card.setAttribute(
      'data-id',
      st.id
    );

    card.innerHTML =

      '<div class="brand-stripe" style="background:' +
        st.brandColor +
      '"></div>' +

      '<div class="body">' +

        '<div class="sc-top">' +

          '<div class="sc-name-wrap">' +

            '<div class="sc-brand">' +
              st.brand +
            '</div>' +

            '<div class="sc-name">' +
              st.name.replace(
                st.brand + ' — ',
                ''
              ) +
            '</div>' +

            '<div class="sc-addr">' +
              st.addr +
            '</div>' +

          '</div>' +

          '<div class="sc-dist">' +
            st.dist.toFixed(1) +
            ' km' +
          '</div>' +

        '</div>' +

        '<div class="sc-bottom">' +

          '<div>' +
            '<span class="stock-tag ' +
              (fuelInfo && fuelInfo.stock
                ? fuelInfo.stock
                : 'ok') +
            '">' +
              (fuelInfo
                ? stockLabel(fuelInfo.stock)
                : 'Available') +
            '</span>' +
          '</div>' +

          '<div class="wait-info">' +
            '⏱ ' +
            wait +
            ' min wait' +
          '</div>' +

        '</div>' +

      '</div>';

    card.addEventListener(
      'click',
      function(){

        openDetail(st.id);

      }
    );

    container.appendChild(card);

  });

}



/* =========================
   CHANGE LOCATION
   ========================= */

el('btn-change-loc').addEventListener(
  'click',
  function(){

    showScreen('screen-location');

    el('locating-state')
      .classList.remove('active');

    el('btn-locate')
      .style.display = 'flex';

  }
);

     /* =========================
   FUEL FILTER
   ========================= */

el('filter-row').addEventListener(
  'click',
  function(e){

    var btn =
      e.target.closest('.chip');

    if(!btn)return;

    document
      .querySelectorAll(
        '#filter-row .chip'
      )
      .forEach(function(c){

        c.classList.remove(
          'is-active'
        );

      });

    btn.classList.add(
      'is-active'
    );

    state.activeFuelFilter =
      btn.getAttribute(
        'data-fuel'
      );

    renderStationList();

    if(state.view==='map'){
      renderMapPins();
    }

  }
);


/* =========================
   VIEW TOGGLE
   ========================= */

el('view-segmented').addEventListener(
  'click',
  function(e){

    var btn =
      e.target.closest('button');

    if(!btn)return;

    document
      .querySelectorAll(
        '#view-segmented button'
      )
      .forEach(function(b){

        b.classList.remove(
          'is-active'
        );

      });

    btn.classList.add(
      'is-active'
    );

    state.view =
      btn.getAttribute(
        'data-view'
      );

    if(state.view==='map'){

      el('map-wrap')
        .style.display='block';

      el('sort-note')
        .textContent =
        'Tap a pin to view a station';

      renderMapPins();

    }
    else{

      el('map-wrap')
        .style.display='none';

      el('sort-note')
        .textContent =
        'Sorted by distance';

    }

  }
);


  el('view-segmented').addEventListener(
    'click',
    function(e){

      var btn=
        e.target.closest('button');

      if(!btn)return;

      document
        .querySelectorAll(
          '#view-segmented button'
        )
        .forEach(function(b){

          b.classList.remove(
            'is-active'
          );

        });

      btn.classList.add(
        'is-active'
      );

      state.view=
        btn.getAttribute(
          'data-view'
        );


      if(state.view==='map'){

        el('map-wrap')
          .style.display='block';

        el('sort-note')
          .textContent=
          'Tap a pin to view a station';

        renderMapPins();

      }else{

        el('map-wrap')
          .style.display='none';

        el('sort-note')
          .textContent=
          'Sorted by distance';

      }

    } 
  );


  function renderMapPins(){

    var wrap=
      el('map-pins');

    wrap.innerHTML='';


    filteredStations()
      .forEach(function(st){

        var pin=
          document.createElement('button');

        pin.className=
          'map-pin';

        pin.style.left=
          st.x+'%';

        pin.style.top=
          st.y+'%';

        pin.innerHTML=
          '<div class="dot" style="background:'+st.brandColor+'">'+
            '<span>'+
              st.queue+
            '</span>'+
          '</div>';

        pin.addEventListener(
          'click',
          function(){
            openDetail(st.id);
          }
        );

        wrap.appendChild(pin);

      });

  }


  /* =========================
     BOTTOM NAV
     ========================= */

  document
    .querySelectorAll('.bottom-nav')
    .forEach(function(nav){

      nav.addEventListener(
        'click',
        async function(e){

          var btn=
            e.target.closest(
              '.nav-item'
            );

          if(!btn)return;

          var tab=
            btn.getAttribute(
              'data-tab'
            );


          if(tab==='home'){
            showScreen(
              'screen-home'
            );
          }


          if(tab==='history'){

  await loadUserBookings();

  renderHistory();

  showScreen(
    'screen-history'
  );

}


          if(tab==='profile'){

            await loadSavedStations();

            showScreen(
              'screen-profile'
            );

          }

        }
      );

    });


  el('btn-go-profile').addEventListener(
    'click',
     async function(){
 
       await loadSavedStations();

      showScreen(
        'screen-profile'
      );

    }
  );


    /* =========================
   UPDATE SAVE STATION BUTTON
   ========================= */

async function updateSaveStationButton(){

  var button =
    el('btn-save-station');

  var user =
    auth.currentUser;

  var station =
    state.currentStation;

  if(!button || !user || !station){
    return;
  }

  try{

    var snap =
      await getDoc(
        doc(
          db,
          'users',
          user.uid
        )
      );

    var data =
      snap.exists()
        ? snap.data()
        : {};

    var savedStations =
      Array.isArray(data.savedStations)
        ? data.savedStations
        : [];

    var isSaved =
      savedStations.includes(
        station.id
      );

    if(isSaved){

      button.textContent = '★';

      button.classList.add(
        'saved'
      );

      button.title =
        'Remove saved station';

    }
    else{

      button.textContent = '☆';

      button.classList.remove(
        'saved'
      );

      button.title =
        'Save station';

    }

  }
  catch(error){

    console.error(
      'Save button update error:',
      error
    );

  }

}

  /* =========================
     STATION DETAIL
     ========================= */
function openGoogleMaps(station){
  if(!station){
    alert('Station location not available.');
    return;
  }

  if(
    typeof station.latitude !== 'number' ||
    typeof station.longitude !== 'number'
  ){
    alert('Station coordinates are not available.');
    return;
  }

  var url =
    'https://www.google.com/maps/dir/?api=1' +
    '&destination=' +
    encodeURIComponent(
      station.latitude + ',' + station.longitude
    );

  window.open(url, '_blank');
}
  function openDetail(id){

    var st=
      STATIONS.find(function(s){

        return s.id===id;

      });


    state.currentStation=st;

    updateSaveStationButton();


    el('d-brand').textContent=
      st.brand;


    el('d-badge-text').textContent=
      st.queue>0

      ?

      'Live · '+st.queue+
      ' in queue'

      :

      'Live · no queue right now';


    el('d-name').textContent=
      st.name;


    el('d-addr').textContent=
      st.addr+
      ' · '+
      st.dist.toFixed(1)+
      ' km away';


    el('d-queue-num').textContent=
      st.queue;


    var wait=
      estWait(st);


    el('d-wait-text').textContent=
      '~'+st.avgService+
      ' min per vehicle · est. '+
      wait+
      ' min wait';


    el('d-pumps-active').textContent=
      st.pumps.active+
      ' / '+
      st.pumps.total;


    var strip=
      el('d-pump-strip');

    strip.innerHTML='';


    for(
      var i=0;
      i<st.pumps.total;
      i++
    ){

      var d=
        document.createElement('div');

      d.className=
        'pump-dot '+
        (
          i<st.pumps.active
            ? 'busy'
            : 'down'
        );

      strip.appendChild(d);

    }


    var table=
      el('d-fuel-table');

    table.innerHTML='';


    Object.keys(st.fuels)
      .forEach(function(fname){

        var f=
          st.fuels[fname];

        var row=
          document.createElement(
            'div'
          );

        row.className=
          'fuel-row';


        row.innerHTML=

          '<div class="fuel-name">'+

            '<div class="fuel-swatch" style="background:'+
              FUEL_COLORS[fname]+
            '"></div>'+

            '<div>'+

              '<div style="font-weight:600;font-size:14px;">'+
                fname+
              '</div>'+

              '<span class="stock-tag '+
                f.stock+
              '" style="margin-left:0;">'+
                stockLabel(f.stock)+
              '</span>'+

            '</div>'+

          '</div>'+

          '<div class="fuel-price">'+

            (
              fname==='EV'

              ?

              '₹'+f.price+
              '<small> / kWh</small>'

              :

              '₹'+f.price.toFixed(2)+
              '<small> / litre</small>'
            )+

          '</div>';


        table.appendChild(row);

      });


    showScreen(
      'screen-detail'
    );

  }   


  // phir add kr skte hai 

  /* =========================
   SAVE STATION BUTTON
   ========================= */

var saveStationButton =
  el('btn-save-station');

if(saveStationButton){

  saveStationButton.addEventListener(
    'click',
    function(){

      toggleSavedStation();

    }
  );

}
var directionsButton = el('btn-directions');

if(directionsButton){
  directionsButton.addEventListener('click', function(){
    openGoogleMaps(state.currentStation);
  });
}


  el('btn-back-detail').addEventListener(
    'click',
    function(){

      showScreen(
        'screen-home'
      );

    }
  );


  el('btn-book-slot').addEventListener(
    'click',
    function(){

      var st=
        state.currentStation;


      var availableFuels=
        Object.keys(st.fuels)
        .filter(function(f){

          return st.fuels[f].stock!=='out';

        });


      state.booking.fuel=
        availableFuels[0];

      state.booking.mode=
        'amount';

      state.booking.amountValue=
        500;

      state.booking.payMode=
        'prepay';


      /* UPDATED:
         Booking open hote hi Quick select */

      state.booking.slotType=
        'quick';

      state.booking.slotTime=
        null;


      var slotRange=
        el('slot-time-range');

      if(slotRange){
        slotRange.value='0';
      }


      renderBookingScreen();


      showScreen(
        'screen-booking'
      );

    }
  );
    /* =========================
     BOOKING
     ========================= */

  function renderBookingScreen(){

    var st=
      state.currentStation;


    var availableFuels=
      Object.keys(st.fuels)
      .filter(function(f){

        return st.fuels[f].stock!=='out';

      });


    var fuelRow=
      el('booking-fuel-row');

    fuelRow.innerHTML='';


    availableFuels.forEach(
      function(f){

        var btn=
          document.createElement(
            'button'
          );

        btn.className=
          'fuel-pick'+
          (
            f===state.booking.fuel
              ? ' is-active'
              : ''
          );


        btn.setAttribute(
          'data-fuel',
          f
        );


        var priceLabel=
          f==='EV'

          ?

          '₹'+
          st.fuels[f].price+
          '/kWh'

          :

          '₹'+
          st.fuels[f].price.toFixed(2)+
          '/L';


        btn.innerHTML=
          '<div class="fp-name">'+
            f+
          '</div>'+
          '<div class="fp-price">'+
            priceLabel+
          '</div>';


        btn.addEventListener(
          'click',
          function(){

            state.booking.fuel=f;

            renderBookingScreen();

          }
        );


        fuelRow.appendChild(btn);

      }
    );


    document
      .querySelectorAll(
        '#booking-mode-row .mode-pick'
      )
      .forEach(function(b){

        b.classList.toggle(
          'is-active',
          b.getAttribute('data-mode')===
          state.booking.mode
        );

      });


    updateQtyDisplay();

    initSlotControls();

    updateBookingSummary();

  }


  /* =========================
     FUEL QUANTITY
     ========================= */

  el('booking-mode-row')
    .addEventListener(
      'click',
      function(e){

        var btn=
          e.target.closest(
            '.mode-pick'
          );

        if(!btn)return;


        state.booking.mode=
          btn.getAttribute(
            'data-mode'
          );


        document
          .querySelectorAll(
            '#booking-mode-row .mode-pick'
          )
          .forEach(function(b){

            b.classList.remove(
              'is-active'
            );

          });


        btn.classList.add(
          'is-active'
        );


        el('qty-block')
          .style.display=
          state.booking.mode==='full'
            ? 'none'
            : 'block';


        updateQtyDisplay();

        updateBookingSummary();

      }
    );


  function updateQtyDisplay(){

    var price=
      FUEL_MODE_PRICE_REF[
        state.booking.fuel
      ] || 100;


    var disp=
      el('qty-display');

    var sub=
      el('qty-sub');


    if(state.booking.mode==='amount'){

      disp.childNodes[0].nodeValue=
        '₹'+state.booking.amountValue;

      sub.textContent=
        'Approx. '+
        (
          state.booking.amountValue/
          price
        ).toFixed(1)+
        ' L';

    }

    else if(
      state.booking.mode==='litres'
    ){

      disp.childNodes[0].nodeValue=
        state.booking.litresValue+
        ' L';

      sub.textContent=
        'Approx. '+
        fmtINR(
          state.booking.litresValue*
          price
        );

    }

    else{

      disp.childNodes[0].nodeValue=
        'Full tank';

      sub.textContent=
        'Approx. 38 L · '+
        fmtINR(38*price);

    }

  }


  el('qty-minus').addEventListener(
    'click',
    function(){

      if(
        state.booking.mode===
        'amount'
      ){

        state.booking.amountValue=
          Math.max(
            100,
            state.booking.amountValue-100
          );

      }

      else if(
        state.booking.mode===
        'litres'
      ){

        state.booking.litresValue=
          Math.max(
            1,
            state.booking.litresValue-1
          );

      }


      updateQtyDisplay();

      updateBookingSummary();

    }
  );


  el('qty-plus').addEventListener(
    'click',
    function(){

      if(
        state.booking.mode===
        'amount'
      ){

        state.booking.amountValue=
          Math.min(
            5000,
            state.booking.amountValue+100
          );

      }

      else if(
        state.booking.mode===
        'litres'
      ){

        state.booking.litresValue=
          Math.min(
            50,
            state.booking.litresValue+1
          );

      }


      updateQtyDisplay();

      updateBookingSummary();

    }
  );


  /* =========================
     TIME SLOT
     ========================= */

  function formatSlotTime(
    totalMinutes
  ){

    var hours=
      Math.floor(
        totalMinutes/60
      );

    var minutes=
      totalMinutes%60;

    var suffix=
      hours>=12
        ? 'PM'
        : 'AM';


    var displayHour=
      hours%12;


    if(displayHour===0){
      displayHour=12;
    }


    return(
      displayHour+
      ':'+
      String(minutes)
        .padStart(2,'0')+
      ' '+
      suffix
    );

  }


  /*
    QUICK SLOT

    Earliest available time =
    current time + estimated wait.

    Rounded to nearest 10 minutes.
  */

  function getQuickSlotTime(){

    var st=
      state.currentStation;


    var now=
      new Date();


    var currentMinutes=
      now.getHours()*60+
      now.getMinutes();


    var wait=
      estWait(st);


    var target=
      currentMinutes+
      Math.max(
        10,
        wait
      );


    return(
      Math.ceil(
        target/10
      )*10
    );

  }


  /*
    UPDATE SLOT DISPLAY
  */

  function updateSlotDisplay(){

    var quickPanel=
      el('quick-slot-panel');

    var scheduledPanel=
      el('scheduled-slot-panel');

    var quickTime=
      el('quick-slot-time');

    var range=
      el('slot-time-range');

    var rangeDisplay=
      el('slot-time-display');

    var summarySlot=
      el('sum-slot-time');


    /*
      Safety check:
      agar HTML element missing ho
      toh JS crash nahi karega.
    */

    if(
      !quickPanel ||
      !scheduledPanel ||
      !quickTime ||
      !range ||
      !rangeDisplay ||
      !summarySlot
    ){

      return;

    }


    /* =========================
       QUICK
       ========================= */

    if(
      state.booking.slotType===
      'quick'
    ){

      var quickMinutes=
        getQuickSlotTime();


      var quickFormatted=
        formatSlotTime(
          quickMinutes %
          (24*60)
        );


      state.booking.slotTime=
        quickFormatted;


      quickPanel.style.display=
        'block';


      scheduledPanel.style.display=
        'none';


      quickTime.textContent=
        quickFormatted;


      summarySlot.textContent=
        quickFormatted+
        ' · Quick';


      return;

    }


    /* =========================
       SCHEDULED
       ========================= */

    quickPanel.style.display=
      'none';


    scheduledPanel.style.display=
      'block';


    var offset=
      Number(
        range.value || 0
      );


    /*
      Slider starts from 10:00 AM.
      Every step = 10 minutes.
    */

    var scheduledMinutes=
      10*60+
      offset*10;


    var scheduledFormatted=
      formatSlotTime(
        scheduledMinutes
      );


    state.booking.slotTime=
      scheduledFormatted;


    rangeDisplay.textContent=
      scheduledFormatted;


    summarySlot.textContent=
      scheduledFormatted+
      ' · Scheduled';

  }


  /* =========================
     SLOT MODE BUTTONS
     ========================= */

  var slotModeRow=
    el('slot-mode-row');


  if(slotModeRow){

    slotModeRow.addEventListener(
      'click',
      function(e){

        var btn=
          e.target.closest(
            '.mode-pick'
          );


        if(!btn)return;


        state.booking.slotType=
          btn.getAttribute(
            'data-slot-type'
          ) ||
          'quick';


        document
          .querySelectorAll(
            '#slot-mode-row .mode-pick'
          )
          .forEach(function(b){

            b.classList.toggle(
              'is-active',
              b.getAttribute(
                'data-slot-type'
              )===
              state.booking.slotType
            );

          });


        updateSlotDisplay();

        updateBookingSummary();

      }
    );

  }


  /* =========================
     SLOT SLIDER
     ========================= */

  var slotTimeRange=
    el('slot-time-range');


  if(slotTimeRange){

    slotTimeRange.addEventListener(
      'input',
      function(){

        /*
          Moving slider automatically
          switches to Scheduled.
        */

        state.booking.slotType=
          'scheduled';


        document
          .querySelectorAll(
            '#slot-mode-row .mode-pick'
          )
          .forEach(function(b){

            b.classList.toggle(
              'is-active',

              b.getAttribute(
                'data-slot-type'
              )===
              'scheduled'

            );

          });


        updateSlotDisplay();

        updateBookingSummary();

      }
    );

  }


  function initSlotControls(){

    document
      .querySelectorAll(
        '#slot-mode-row .mode-pick'
      )
      .forEach(function(b){

        b.classList.toggle(
          'is-active',

          b.getAttribute(
            'data-slot-type'
          )===
          state.booking.slotType

        );

      });


    updateSlotDisplay();

  }
    /* =========================
     PAYMENT
     ========================= */

  el('pay-row').addEventListener(
    'click',
    function(e){

      var btn=
        e.target.closest(
          '.pay-pick'
        );

      if(!btn)return;


      state.booking.payMode=
        btn.getAttribute(
          'data-pay'
        );


      document
        .querySelectorAll(
          '#pay-row .pay-pick'
        )
        .forEach(function(b){

          b.classList.remove(
            'is-active'
          );

        });


      btn.classList.add(
        'is-active'
      );

    }
  );


  /* =========================
     AMOUNT
     ========================= */

  function computeAmount(){

    var st=
      state.currentStation;


    var price=
      st.fuels[
        state.booking.fuel
      ]

      ?

      st.fuels[
        state.booking.fuel
      ].price

      :

      FUEL_MODE_PRICE_REF[
        state.booking.fuel
      ];


    if(
      state.booking.mode===
      'amount'
    ){

      return state.booking.amountValue;

    }


    if(
      state.booking.mode===
      'litres'
    ){

      return(
        state.booking.litresValue*
        price
      );

    }


    return 38*price;

  }


  /* =========================
     BOOKING SUMMARY
     ========================= */

  function updateBookingSummary(){

    var st=
      state.currentStation;


    el('sum-station')
      .textContent=
      st.name.split(' — ')[1]||
      st.name;


    el('sum-fuel')
      .textContent=
      state.booking.fuel;


    el('sum-position')
      .textContent=
      (st.queue+1)+
      'th in line';


    el('sum-wait')
      .textContent=
      estWait(st)+
      ' min';


    /*
      UPDATED:
      Selected slot summary
    */

    if(
      state.booking.slotTime
    ){

      el('sum-slot-time')
        .textContent=
        state.booking.slotTime+

        (
          state.booking.slotType===
          'quick'

            ?

            ' · Quick'

            :

            ' · Scheduled'
        );

    }
    else{

      el('sum-slot-time')
        .textContent=
        '—';

    }


    el('sum-amount')
      .textContent=
      fmtINR(
        computeAmount()
      );

  }


  /* =========================
     BACK
     ========================= */

  el('btn-back-booking')
    .addEventListener(
      'click',
      function(){

        showScreen(
          'screen-detail'
        );

      }
    );

var upiPaymentCompleted = false;
  /* =========================
     CONFIRM BOOKING
     ========================= */

  el('btn-confirm-booking')
    .addEventListener(
      'click',
      async function(){
         
        // =========================
// UPI PAYMENT SCREEN
// =========================

if(state.booking.payMode === 'prepay'  &&
  !upiPaymentCompleted
){

  var st = state.currentStation;

  el('upi-pump-name').textContent = st.name;

  el('upi-amount').textContent =
    fmtINR(computeAmount());

  el('pump-upi-id').textContent =
    'UPI ID: pumplinepump@upi';

  showScreen('screen-upi-payment');

  return;
}



        try{

          var st=
            state.currentStation;


          var prefix=
            st.brand==='Indian Oil'
              ? 'IOC'

              :

            st.brand==='HP'
              ? 'HP'

              :

            st.brand==='Bharat Petroleum'
              ? 'BPC'

              :

            st.brand==='Shell'
              ? 'SHL'

              :

            'REL';


          var tokenId=
            prefix+
            '-' +
            (
              100+
              Math.floor(
                Math.random()*900
              )
            );


          var amount=
            computeAmount();


          var price=
            st.fuels[
              state.booking.fuel
            ]

            ?

            st.fuels[
              state.booking.fuel
            ].price

            :

            FUEL_MODE_PRICE_REF[
              state.booking.fuel
            ];


          var record={

            tokenNumber:
              tokenId,

            stationId:
              st.id,

            stationName:
              st.name,

            fuelType:
              state.booking.fuel,

            mode:
              state.booking.mode,

            requestedAmount:
              amount,

            requestedLitres:

              state.booking.mode===
              'litres'

              ?

              state.booking.litresValue

              :

              state.booking.mode===
              'full'

              ?

              38

              :

              +(
                amount/
                price
              ).toFixed(1),


            price:
              price,


            payMode:
              state.booking.payMode,


            paymentStatus:
              state.booking.payMode===
              'prepay'

                ?

                'paid'

                :

                'pending',


            /* =========================
               TIME SLOT SAVED
               ========================= */

            slotType:
              state.booking.slotType,

            slotTime:
              state.booking.slotTime,


            status:
              'booked',

            pump:
              null,

            pumpIndex:
              null,

            vehicleNumber:
              'MH 02 AB 1234',

            position:
              st.queue+1,

            createdAt:
              new Date().toISOString()

          };


          /*
            Local/shared storage
          */

          await setRecord(
            'token:'+tokenId,
            record
          );


          /*
            Firebase Firestore
          */

          if(
            auth &&
            auth.currentUser
          ){

            await setDoc(

              doc(
                db,
                "bookings",
                tokenId
              ),

              {

                tokenId:
                  tokenId,

                userId:
                  auth.currentUser.uid,

                userEmail:
                  auth.currentUser.email,

                stationId:
                  st.id,

                stationName:
                  st.name,

                fuel:
                  state.booking.fuel,

                amount:
                  amount,

                price:
                  price,

                mode:
                  state.booking.mode,

                requestedLitres:
                  record.requestedLitres,

                payMode:
                  state.booking.payMode,

                paymentStatus:
                  record.paymentStatus,


                /*
                  TIME SLOT
                */

                slotType:
                  state.booking.slotType,

                slotTime:
                  state.booking.slotTime,


                status:
                  "booked",

                pump:
                  null,

                pumpIndex:
                  null,

                vehicleNumber:
                  "MH 02 AB 1234",

                position:
                  record.position,

                createdAt:
                  serverTimestamp()

              }

            );


            console.log(
              "Booking saved to Firebase:",
              tokenId
            );

          }


          state.activeToken={

            tokenId:
              tokenId,

            station:
              st,

            fuel:
              state.booking.fuel,

            amount:
              amount,

            payMode:
              state.booking.payMode,

            /*
              Keep selected slot
            */

            slotType:
              state.booking.slotType,

            slotTime:
              state.booking.slotTime,

            position:
              record.position,

            status:
              'booked',

            pump:
              null,

            lastKnownStatus:
              'booked'

          };


          renderTokenScreen();


          showScreen(
            'screen-token'
          );


          startQueueSimulation();


        }
        catch(error){

          console.error(
            "BOOKING ERROR:",
            error
          );


          alert(
            "Booking failed: "+
            (
              error.message||
              "Unknown error"
            )
          );

        }

      }
    );
      /* =========================
     TOKEN SCREEN
     ========================= */

  function renderTokenScreen(){

    var t=
      state.activeToken;


    el('token-status-badge')
      .textContent=
      'Booking confirmed';


    el('token-number')
      .textContent=
      '#'+t.tokenId;


    el('token-station')
      .textContent=
      t.station.name;


    el('position-num')
      .textContent=
      t.position;


    el('position-num')
      .classList.remove(
        'next'
      );


    el('eta-min')
      .textContent=
      Math.max(
        1,
        Math.round(
          t.position*
          t.station.avgService/
          Math.max(
            t.station.pumps.active,
            1
          )
        )
      )+
      ' min';


    el('eta-pump')
      .textContent=
      'Assigned at pump counter';


    el('arrival-panel')
      .classList.remove(
        'active'
      );


    el('staff-action-text')
      .textContent=
      'This screen updates automatically once the station staff scans your QR.';


    setTimeline(
      'booked'
    );


    el('qr-code').innerHTML='';


    try{

      new QRCode(
        el('qr-code'),
        {

          text:
            t.tokenId+
            '|'+
            t.station.id+
            '|'+
            Date.now(),

          width:
            148,

          height:
            148,

          colorDark:
            '#0E1219',

          colorLight:
            '#ffffff'

        }
      );

    }
    catch(e){

      el('qr-code').innerHTML=
        '<div style="width:148px;height:148px;display:flex;align-items:center;justify-content:center;color:#0E1219;font-size:12px;">QR unavailable</div>';

    }

  }


  /* =========================
     TIMELINE
     ========================= */

  function setTimeline(step){

    var order=[
      'booked',
      'called',
      'atpump',
      'done'
    ];


    var idx=
      order.indexOf(step);


    document
      .querySelectorAll(
        '#timeline .tl-step'
      )
      .forEach(
        function(el2,i){

          el2.classList.remove(
            'done',
            'current'
          );


          if(i<idx){

            el2.classList.add(
              'done'
            );

          }

          else if(i===idx){

            el2.classList.add(
              'current'
            );

          }

        }
      );

  }


  /* =========================
     TOAST
     ========================= */

  function showToast(msg){

    el('toast-msg')
      .textContent=
      msg;


    el('toast')
      .classList.add(
        'show'
      );


    setTimeout(
      function(){

        el('toast')
          .classList.remove(
            'show'
          );

      },
      2800
    );

  }


  /* =========================
     QUEUE SIMULATION
     ========================= */

  function startQueueSimulation(){

  if(state.intervalId){
    clearInterval(state.intervalId);
  }

  state.intervalId = setInterval(async function(){

    var t = state.activeToken;

    if(!t){
      return;
    }

    try{

      // ==============================
      // GET LIVE BOOKING FROM FIRESTORE
      // ==============================

      var bookingRef = doc(
        db,
        'bookings',
        t.tokenId
      );

      var snap = await getDoc(bookingRef);

      if(!snap.exists()){
        console.warn('Booking not found in Firestore:', t.tokenId);
        return;
      }

      var record = snap.data();


      // ==============================
      // UPDATE LOCAL POSITION
      // ==============================

      if(
        record.status === 'booked' &&
        t.position > 1
      ){

        t.position -= 1;

        el('position-num').textContent =
          t.position;

        el('eta-min').textContent =
          Math.max(
            1,
            Math.round(
              t.position *
              t.station.avgService /
              Math.max(
                t.station.pumps.active,
                1
              )
            )
          ) + ' min';


        if(t.position === 3){

          showToast(
            'Only 3 vehicles ahead of you now.'
          );

        }


        if(t.position === 1){

          el('position-num')
            .classList.add('next');

          showToast(
            'You are close to the front of the queue.'
          );

        }

      }


      // ==============================
      // STATUS CHANGED
      // ==============================

      if(
        record.status !==
        t.lastKnownStatus
      ){

        t.lastKnownStatus =
          record.status;


        // ==========================
        // CALLED
        // ==========================

        if(
          record.status === 'called'
        ){

          el('token-status-badge')
            .textContent =
            'Called — head to the pump';

          setTimeline('called');

          el('arrival-panel')
            .classList.add('active');

          el('staff-action-text')
            .textContent =
            'Show your QR code to the staff at the pump counter.';

          showToast(
            'It is your turn! Show your QR at the counter.'
          );

        }


        // ==========================
        // AT PUMP
        // ==========================

        if(
          record.status === 'at-pump'
        ){

          el('token-status-badge')
            .textContent =
            'At the pump — fueling now';

          setTimeline('atpump');

          el('arrival-panel')
            .classList.remove('active');

          el('eta-pump')
            .textContent =
            record.pump || 'Assigned';

          el('staff-action-text')
            .textContent =
            'Staff has verified your QR and started fueling at ' +
            (record.pump || 'the pump') +
            '.';

          showToast(
            'Verified — fueling has started at ' +
            (record.pump || 'the pump') +
            '.'
          );

        }


        // ==========================
        // COMPLETED
        // ==========================

        if(
          record.status === 'completed'
        ){

          clearInterval(
            state.intervalId
          );

          setTimeline('done');

          fillReceiptFromRecord(
            record
          );

          showToast(
            'Fueling complete — here is your receipt.'
          );

          showScreen(
            'screen-receipt'
          );

        }

      }

    }catch(error){

      console.error(
        'LIVE BOOKING STATUS ERROR:',
        error
      );

    }

  }, 2200);

}


  /* =========================
     RECEIPT
     ========================= */

  function fillReceiptFromRecord(
    record
  ){

    el('receipt-station')
      .textContent=
      record.stationName;


    el('r-token')
      .textContent=
      '#'+record.tokenNumber;


    el('r-fuel')
      .textContent=
      record.fuelType;


    el('r-litres')
      .textContent=
      record.actualLitres+
      (
        record.fuelType==='EV'
          ? ' kWh'
          : ' L'
      );


    el('r-rate')
      .textContent=
      '₹'+
      record.price.toFixed(2)+
      (
        record.fuelType==='EV'
          ? ' / kWh'
          : ' / litre'
      );


    el('r-mode')
      .textContent=
      record.payMode==='prepay'

        ?

        'Paid online'

        :

        'Paid at pump ('+
        (
          record.paymentMode||
          'settled'
        )+
        ')';


    el('r-total')
      .textContent=
      fmtINR(
        record.actualAmount
      );


    state.history.unshift({

      station:
        record.stationName,

      fuel:
        record.fuelType,

      amount:
        record.actualAmount,

      token:
        '#'+record.tokenNumber,

      status:
        'done',

      date:
        'Today'

    });


    document
      .querySelectorAll(
        '#star-row .star'
      )
      .forEach(function(s){

        s.classList.remove(
          'on'
        );

      });

  }


  /* =========================
     RATING
     ========================= */

  el('star-row')
    .addEventListener(
      'click',
      function(e){

        var star=
          e.target.closest(
            '.star'
          );


        if(!star)return;


        var val=
          +star.getAttribute(
            'data-star'
          );


        document
          .querySelectorAll(
            '#star-row .star'
          )
          .forEach(function(s){

            s.classList.toggle(
              'on',
              +s.getAttribute(
                'data-star'
              )<=val
            );

          });

      }
    );


  el('btn-receipt-done')
    .addEventListener(
      'click',
      function(){

        renderHistory();


        showScreen(
          'screen-history'
        );

      }
    );

      /* =========================
   LOAD USER BOOKINGS
   ========================= */

async function loadUserBookings(){

  if(
    !auth ||
    !auth.currentUser
  ){
    return;
  }

  try{

    var q =
      query(
        collection(db, 'bookings'),
        where(
          'userId',
          '==',
          auth.currentUser.uid
        )
      );

    var snapshot =
      await getDocs(q);

    state.history = [];

    snapshot.forEach(
      function(docSnap){

        var b =
          docSnap.data();

        // Current active booking ko duplicate
        // hone se bachao
        if(
          state.activeToken &&
          b.tokenId ===
          state.activeToken.tokenId
        ){
          return;
        }

        var date =
          b.createdAt &&
          b.createdAt.toDate
            ? b.createdAt.toDate()
            : new Date();

        state.history.push({

          station:
            b.stationName || 'Pump Station',

          fuel:
            b.fuel || b.fuelType || 'Petrol',

          amount:
            Number(b.amount || 0),

          token:
            '#' +
            (b.tokenId || docSnap.id),

          status:
            b.status || 'booked',

          paymentStatus:
            b.paymentStatus || 'pending',

          date:
            date.toLocaleDateString(
              'en-IN',
              {
                day:'2-digit',
                month:'short',
                year:'numeric'
              }
            )

        });

      }
    );


    // Latest booking first
    state.history.sort(
      function(a,b){

        return 0;
      }
    );


    console.log(
      'Booking history loaded:',
      state.history
    );

  }
  catch(error){

    console.error(
      'HISTORY LOAD ERROR:',
      error
    );

  }

}


      /* =========================
     HISTORY
     ========================= */

  function renderHistory(){

    var wrap=
      el('history-list');

    wrap.innerHTML='';


    /*
      Show active booking
    */

    if(
      state.activeToken &&

      (
        state.activeToken.lastKnownStatus===
        'booked' ||

        state.activeToken.lastKnownStatus===
        'called' ||

        state.activeToken.lastKnownStatus===
        'at-pump'
      )

    ){

      var t=
        state.activeToken;


      var card=
        document.createElement(
          'div'
        );


      card.className=
        'history-card';


      card.innerHTML=

        '<div class="history-left">'+

          '<div class="h-station">'+
            t.station.name+
          '</div>'+

          '<div class="h-meta">'+
            '#'+
            t.tokenId+
            ' · '+
            t.fuel+
          '</div>'+

        '</div>'+

        '<div class="history-right">'+

          '<div class="h-amt">'+
            fmtINR(
              t.amount
            )+
          '</div>'+

          '<div class="h-status active">'+
            'Track live'+
          '</div>'+

        '</div>';


      card.addEventListener(
        'click',
        function(){

          renderTokenScreen();

          showScreen(
            'screen-token'
          );

        }
      );


      wrap.appendChild(
        card
      );

    }


    /*
      Empty history
    */

    if(
      state.history.length===0 &&
      !state.activeToken
    ){

      wrap.innerHTML=
        '<div class="empty-state">'+
          '<div class="title">No bookings yet</div>'+
          '<div class="body-text">Book your first slot and it will show up here.</div>'+
        '</div>';


      return;

    }


    /*
      Completed history
    */

    state.history.forEach(
      function(h){

        var card=
          document.createElement(
            'div'
          );


        card.className=
          'history-card';


        card.innerHTML=

          '<div class="history-left">'+

            '<div class="h-station">'+
              h.station+
            '</div>'+

            '<div class="h-meta">'+
              h.token+
              ' · '+
              h.fuel+
              ' · '+
              h.date+
            '</div>'+

          '</div>'+

          '<div class="history-right">'+

            '<div class="h-amt">'+
              fmtINR(
                h.amount
              )+
            '</div>'+

            '<div class="h-status done">'+
              'Completed'+
            '</div>'+

          '</div>';


        wrap.appendChild(
          card
        );

      }
    );

  }
   
  /* =========================
   PROFILE — FIRESTORE
   ========================= */

async function loadCustomerProfile(){

  try{

    var user = auth.currentUser;

    if(!user){
      return;
    }

    var userRef = doc(
      db,
      'users',
      user.uid
    );

    var snap = await getDoc(userRef);

    var data = {};

    if(snap.exists()){
      data = snap.data();
    }

    /* =========================
       BASIC USER INFORMATION
       ========================= */

    var name =
      data.name ||
      user.displayName ||
      'User';

    var email =
      user.email ||
      data.email ||
      '-';

    var phone =
      data.phone ||
      'Phone not added';


    /* =========================
       SHOW PROFILE
       ========================= */

    var nameEl =
      el('profile-name');

    var emailEl =
      el('profile-email');

    var phoneEl =
      el('profile-phone');

    var avatarEl =
      el('profile-avatar');


    if(nameEl){
      nameEl.textContent =
        name;
    }

    if(emailEl){
      emailEl.textContent =
        email;
    }

    if(phoneEl){
      phoneEl.textContent =
        phone;
    }


    /* =========================
       CREATE INITIALS
       ========================= */

    if(avatarEl){

      var initials =
        name
          .trim()
          .split(/\s+/)
          .map(function(part){
            return part.charAt(0);
          })
          .join('')
          .substring(0,2)
          .toUpperCase();

      avatarEl.textContent =
        initials || 'U';
    }


    /* =========================
       VEHICLE
       ========================= */

    var vehicleNumber =
      data.vehicleNumber ||
      '';

    var vehicleType =
      data.vehicleType ||
      '';

    var vehicleFuel =
      data.vehicleFuel ||
      '';


    var vehicleEl =
      el('profile-vehicle');


    if(vehicleEl){

      if(vehicleNumber){

        var vehicleText =
          vehicleNumber;

        if(vehicleType){
          vehicleText +=
            ' · ' + vehicleType;
        }

        if(vehicleFuel){
          vehicleText +=
            ' · ' + vehicleFuel;
        }

        vehicleEl.textContent =
          vehicleText;

      }
      else{

        vehicleEl.textContent =
          'Vehicle not added';

      }

    }


    /* =========================
       EDIT FORM VALUES
       ========================= */

    if(el('edit-profile-name')){
      el('edit-profile-name').value =
        name === 'User' ? '' : name;
    }

    if(el('edit-profile-phone')){
      el('edit-profile-phone').value =
        data.phone || '';
    }

    if(el('edit-vehicle-number')){
      el('edit-vehicle-number').value =
        data.vehicleNumber || '';
    }

    if(el('edit-vehicle-type')){
      el('edit-vehicle-type').value =
        data.vehicleType || 'Sedan';
    }

    if(el('edit-vehicle-fuel')){
      el('edit-vehicle-fuel').value =
        data.vehicleFuel || 'Petrol';
    }

    /* =========================
   RESTORE PROFILE PHOTO
   ========================= */

var savedPhoto = null;

try{

  savedPhoto =
    localStorage.getItem(
      'pumpline_profile_photo_' + user.uid
    );

}
catch(error){

  console.error(
    'Profile photo load error:',
    error
  );

}


var photoEl =
  el('profile-photo');

var avatarEl =
  el('profile-avatar');


if(savedPhoto){

  if(photoEl){

    photoEl.src =
      savedPhoto;

    photoEl.style.display =
      'block';

  }

  if(avatarEl){

    avatarEl.style.display =
      'none';

  }

}
else{

  if(photoEl){

    photoEl.style.display =
      'none';

  }

  if(avatarEl){

    avatarEl.style.display =
      'flex';

  }

}


    console.log(
      'Customer profile loaded:',
      data
    );

  }
  catch(error){

    console.error(
      'Profile loading error:',
      error
    );

  }

}


/* =========================
   SAVE CUSTOMER PROFILE
   ========================= */

async function saveCustomerProfile(){

  try{

    var user =
      auth.currentUser;

    if(!user){

      alert(
        'Please login first.'
      );

      return;

    }


    var name =
      el('edit-profile-name')
        ? el('edit-profile-name').value.trim()
        : '';

    var phone =
      el('edit-profile-phone')
        ? el('edit-profile-phone').value.trim()
        : '';

    var vehicleNumber =
      el('edit-vehicle-number')
        ? el('edit-vehicle-number').value.trim().toUpperCase()
        : '';

    var vehicleType =
      el('edit-vehicle-type')
        ? el('edit-vehicle-type').value
        : 'Sedan';

    var vehicleFuel =
      el('edit-vehicle-fuel')
        ? el('edit-vehicle-fuel').value
        : 'Petrol';


    /* =========================
       VALIDATION
       ========================= */

    if(!name){

      alert(
        'Please enter your name.'
      );

      return;

    }


    if(
      phone &&
      !/^[+]?[0-9]{10,13}$/.test(
        phone.replace(/\s/g,'')
      )
    ){

      alert(
        'Please enter a valid phone number.'
      );

      return;

    }


    /* =========================
       SAVE TO FIRESTORE
       ========================= */

    await setDoc(

      doc(
        db,
        'users',
        user.uid
      ),

      {

        uid:
          user.uid,

        email:
          user.email || '',

        role:
          'customer',

        name:
          name,

        phone:
          phone,

        vehicleNumber:
          vehicleNumber,

        vehicleType:
          vehicleType,

        vehicleFuel:
          vehicleFuel,

        updatedAt:
          serverTimestamp()

      },

      {
        merge:true
      }

    );


    /* =========================
       UPDATE PROFILE UI
       ========================= */

    await loadCustomerProfile();


    /* =========================
       CLOSE EDIT BOX
       ========================= */

    var editBox =
      el('profile-edit-box');

    if(editBox){

      editBox.style.display =
        'none';

    }


    alert(
      'Profile updated successfully!'
    );


    console.log(
      'Profile saved successfully'
    );

  }
  catch(error){

    console.error(
      'Profile save error:',
      error
    );

    alert(
      'Profile save failed. Please try again.'
    );

  }

}

/* =========================
   PROFILE PHOTO
   ========================= */

var changePhotoButton =
  el('btn-change-photo');

var photoInput =
  el('profile-photo-input');


if(changePhotoButton && photoInput){

  changePhotoButton.addEventListener(
    'click',
    function(){

      photoInput.click();

    }
  );


  photoInput.addEventListener(
    'change',
    function(){

      var file =
        photoInput.files &&
        photoInput.files[0];

      if(!file){
        return;
      }


      if(!file.type.startsWith('image/')){

        alert(
          'Please select an image file.'
        );

        photoInput.value = '';

        return;

      }


      if(file.size > 1024 * 1024){

        alert(
          'Please select an image smaller than 1 MB.'
        );

        photoInput.value = '';

        return;

      }


      var reader =
        new FileReader();


      reader.onload =
        function(event){

          var imageData =
            event.target.result;

          var user =
            auth.currentUser;


          if(!user){

            alert(
              'Please login first.'
            );

            return;

          }


          try{

            localStorage.setItem(
              'pumpline_profile_photo_' + user.uid,
              imageData
            );


            var photoEl =
              el('profile-photo');

            var avatarEl =
              el('profile-avatar');


            if(photoEl){

              photoEl.src =
                imageData;

              photoEl.style.display =
                'block';

            }


            if(avatarEl){

              avatarEl.style.display =
                'none';

            }


            console.log(
              'Profile photo saved locally.'
            );

          }
          catch(error){

            console.error(
              'Profile photo error:',
              error
            );

            alert(
              'Photo could not be saved. Try a smaller image.'
            );

          }

        };


      reader.readAsDataURL(file);

    }
  );

}


/* =========================
   PROFILE EVENTS
   ========================= */


/* EDIT BUTTON */

var editProfileButton =
  el('btn-edit-profile');

if(editProfileButton){

  editProfileButton.addEventListener(
    'click',
    async function(){

      await loadCustomerProfile();

      var editBox =
        el('profile-edit-box');

      if(editBox){

        editBox.style.display =
          editBox.style.display === 'none'
            ? 'block'
            : 'none';

      }

    }
  );

}


/* CANCEL */

var cancelProfileButton =
  el('btn-cancel-profile');

if(cancelProfileButton){

  cancelProfileButton.addEventListener(
    'click',
    function(){

      var editBox =
        el('profile-edit-box');

      if(editBox){

        editBox.style.display =
          'none';

      }

    }
  );

}


/* SAVE */

var saveProfileButton =
  el('btn-save-profile');

if(saveProfileButton){

  saveProfileButton.addEventListener(
    'click',
    saveCustomerProfile
  );

}


/* VEHICLE ROW → EDIT PROFILE */

var vehicleRow =
  el('profile-vehicle-row');

if(vehicleRow){

  vehicleRow.addEventListener(
    'click',
    function(){

      var editBox =
        el('profile-edit-box');

      if(editBox){

        editBox.style.display =
          'block';

        editBox.scrollIntoView({
          behavior:'smooth',
          block:'start'
        });

      }

    }
  );

}




  /* =========================
     LOGOUT — FIXED
     ========================= */

  var logoutButton=
    el('btn-logout');


  if(logoutButton){

    logoutButton.addEventListener(
      'click',
      async function(){

        try{

          /*
            Stop queue interval
          */

          if(
            state.intervalId
          ){

            clearInterval(
              state.intervalId
            );

            state.intervalId=
              null;

          }


          /*
            Firebase logout
          */

          await signOut(
            auth
          );


          /*
            Clear customer state
          */

          state.activeToken=
            null;

          state.currentStation=
            null;

          state.history=[];


          /*
            Clear login inputs
          */

          if(authEmail){

            authEmail.value=
              '';

          }


          if(authPassword){

            authPassword.value=
              '';

          }


          clearAuthError();


          /*
            IMPORTANT:
            Immediately show login screen.
          */

          showScreen(
            'screen-auth'
          );


          console.log(
            'Customer logged out'
          );

        }
        catch(error){

          console.error(
            'Logout error:',
            error
          );


          /*
            Even if Firebase throws,
            don't leave user on blank screen.
          */

          showScreen(
            'screen-auth'
          );


          showAuthError(
            'Logout failed. Please refresh and try again.'
          );

        }

      }
    );

  }


  /* =========================
     INITIALIZE
     ========================= */

  el('qty-block')
    .style.display=
    'block';

     

// ===============================
// PUMPLINE UPI BUTTONS
// ===============================

function openUPIPayment(){

  var amount = computeAmount();

  var upiId = 'pumplinepump@upi';

  var pumpName =
    state.currentStation
      ? state.currentStation.name
      : 'PumpLine Fuel Station';

  var upiUrl =
    'upi://pay' +
    '?pa=' + encodeURIComponent(upiId) +
    '&pn=' + encodeURIComponent(pumpName) +
    '&am=' + encodeURIComponent(amount) +
    '&cu=INR';

  console.log('Opening UPI:', upiUrl);

  window.location.href = upiUrl;
}


// Google Pay
if(el('btn-gpay')){
  el('btn-gpay').addEventListener('click', function(){
    console.log('Google Pay clicked');
    openUPIPayment();
  });
}


// PhonePe
if(el('btn-phonepe')){
  el('btn-phonepe').addEventListener('click', function(){
    console.log('PhonePe clicked');
    openUPIPayment();
  });
}


// Paytm
if(el('btn-paytm')){
  el('btn-paytm').addEventListener('click', function(){
    console.log('Paytm clicked');
    openUPIPayment();
  });
}


// Other UPI
if(el('btn-other-upi')){
  el('btn-other-upi').addEventListener('click', function(){
    console.log('Other UPI clicked');
    openUPIPayment();
  });
}

   /* =========================
   PAYMENT COMPLETED
   ========================= */

var paymentDoneButton =
  el('btn-payment-done');

if(paymentDoneButton){

  paymentDoneButton.addEventListener(
    'click',
    function(){

      upiPaymentCompleted = true;

      el('btn-confirm-booking').click();

    }
  );

}

})();