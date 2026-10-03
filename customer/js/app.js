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

      id:'s1',

      brand:'Indian Oil',

      brandColor:'#E4572E',

      name:
        'Indian Oil — Linking Road',

      addr:
        'Linking Road, Bandra West',

      dist:0.6,

      x:38,

      y:44,

      queue:8,

      avgService:4,

      pumps:{
        active:3,
        total:4
      },

      fuels:{

        Petrol:{
          price:104.50,
          stock:'ok'
        },

        Diesel:{
          price:92.10,
          stock:'ok'
        },

        CNG:{
          price:76.00,
          stock:'low'
        }

      }

    },


    {

      id:'s2',

      brand:'HP',

      brandColor:'#F7941D',

      name:
        'HP Petrol Pump — Turner Road',

      addr:
        'Turner Road, Bandra West',

      dist:1.1,

      x:60,

      y:30,

      queue:3,

      avgService:3,

      pumps:{
        active:4,
        total:4
      },

      fuels:{

        Petrol:{
          price:104.62,
          stock:'ok'
        },

        Diesel:{
          price:92.30,
          stock:'ok'
        }

      }

    },


    {

      id:'s3',

      brand:'Bharat Petroleum',

      brandColor:'#0072BC',

      name:
        'Bharat Petroleum — SV Road',

      addr:
        'S.V. Road, Khar West',

      dist:1.8,

      x:20,

      y:70,

      queue:14,

      avgService:5,

      pumps:{
        active:2,
        total:4
      },

      fuels:{

        Petrol:{
          price:104.45,
          stock:'low'
        },

        Diesel:{
          price:91.95,
          stock:'ok'
        },

        CNG:{
          price:75.80,
          stock:'ok'
        }

      }

    },


    {

      id:'s4',

      brand:'Shell',

      brandColor:'#FBCE07',

      name:
        'Shell — Hill Road',

      addr:
        'Hill Road, Bandra West',

      dist:2.3,

      x:75,

      y:60,

      queue:0,

      avgService:4,

      pumps:{
        active:3,
        total:3
      },

      fuels:{

        Petrol:{
          price:106.10,
          stock:'ok'
        },

        Diesel:{
          price:93.40,
          stock:'ok'
        },

        EV:{
          price:18.5,
          stock:'ok'
        }

      }

    },


    {

      id:'s5',

      brand:'Reliance',

      brandColor:'#3B5FE0',

      name:
        'Reliance — Waterfield Road',

      addr:
        'Waterfield Road, Bandra West',

      dist:2.9,

      x:15,

      y:20,

      queue:6,

      avgService:3,

      pumps:{
        active:2,
        total:2
      },

      fuels:{

        Petrol:{
          price:105.20,
          stock:'ok'
        },

        Diesel:{
          price:92.75,
          stock:'out'
        }

      }

    },


    {

      id:'s6',

      brand:'Indian Oil',

      brandColor:'#E4572E',

      name:
        'Indian Oil — Carter Road',

      addr:
        'Carter Road, Bandra West',

      dist:3.4,

      x:85,

      y:82,

      queue:11,

      avgService:4,

      pumps:{
        active:3,
        total:5
      },

      fuels:{

        Petrol:{
          price:104.50,
          stock:'ok'
        },

        Diesel:{
          price:92.10,
          stock:'ok'
        },

        CNG:{
          price:76.00,
          stock:'ok'
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
    function(user){

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

            showScreen(
              'screen-profile'
            );

          }

        }
      );

    });


  el('btn-go-profile').addEventListener(
    'click',
    function(){

      showScreen(
        'screen-profile'
      );

    }
  );


  /* =========================
     STATION DETAIL
     ========================= */

  function openDetail(id){

    var st=
      STATIONS.find(function(s){

        return s.id===id;

      });


    state.currentStation=st;


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