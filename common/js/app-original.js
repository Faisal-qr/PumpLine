// One in-memory store shared by both apps below, so a booking made on the
  // customer side is immediately visible to the staff console and vice versa.
  window.SharedFuelStore = {};

(function(){

  /* ---------------- Storage layer (shared with the staff console when run as an artifact) ---------------- */
  var memoryStore = window.SharedFuelStore;
  var storage = (typeof window.storage !== 'undefined') ? window.storage : {
    get: function(k){ return new Promise(function(res, rej){ if(Object.prototype.hasOwnProperty.call(memoryStore,k)) res({key:k,value:memoryStore[k],shared:true}); else rej(new Error('not found')); }); },
    set: function(k,v){ return new Promise(function(res){ memoryStore[k]=v; res({key:k,value:v,shared:true}); }); },
    delete: function(k){ return new Promise(function(res){ delete memoryStore[k]; res({key:k,deleted:true,shared:true}); }); },
    list: function(prefix){ return new Promise(function(res){ var keys=Object.keys(memoryStore).filter(function(k){ return !prefix || k.indexOf(prefix)===0; }); res({keys:keys}); }); }
  };
  async function getRecord(key){
    try{ var r = await storage.get(key, true); return r ? JSON.parse(r.value) : null; }
    catch(e){ return null; }
  }
  async function setRecord(key, obj){
    try{ await storage.set(key, JSON.stringify(obj), true); return true; }
    catch(e){ return false; }
  }

  /* ---------------- Mock data ---------------- */
  var FUEL_COLORS = { Petrol:'#FFB020', Diesel:'#8891A3', CNG:'#35D07F', EV:'#5AA9FF' };

  var STATIONS = [
    { id:'s1', brand:'Indian Oil', brandColor:'#E4572E', name:'Indian Oil — Linking Road', addr:'Linking Road, Bandra West', dist:0.6, x:38, y:44, queue:8, avgService:4, pumps:{active:3,total:4},
      fuels:{ Petrol:{price:104.50, stock:'ok'}, Diesel:{price:92.10, stock:'ok'}, CNG:{price:76.00, stock:'low'} } },
    { id:'s2', brand:'HP', brandColor:'#F7941D', name:'HP Petrol Pump — Turner Road', addr:'Turner Road, Bandra West', dist:1.1, x:60, y:30, queue:3, avgService:3, pumps:{active:4,total:4},
      fuels:{ Petrol:{price:104.62, stock:'ok'}, Diesel:{price:92.30, stock:'ok'} } },
    { id:'s3', brand:'Bharat Petroleum', brandColor:'#0072BC', name:'Bharat Petroleum — SV Road', addr:'S.V. Road, Khar West', dist:1.8, x:20, y:70, queue:14, avgService:5, pumps:{active:2,total:4},
      fuels:{ Petrol:{price:104.45, stock:'low'}, Diesel:{price:91.95, stock:'ok'}, CNG:{price:75.80, stock:'ok'} } },
    { id:'s4', brand:'Shell', brandColor:'#FBCE07', name:'Shell — Hill Road', addr:'Hill Road, Bandra West', dist:2.3, x:75, y:60, queue:0, avgService:4, pumps:{active:3,total:3},
      fuels:{ Petrol:{price:106.10, stock:'ok'}, Diesel:{price:93.40, stock:'ok'}, EV:{price:18.5, stock:'ok'} } },
    { id:'s5', brand:'Reliance', brandColor:'#3B5FE0', name:'Reliance — Waterfield Road', addr:'Waterfield Road, Bandra West', dist:2.9, x:15, y:20, queue:6, avgService:3, pumps:{active:2,total:2},
      fuels:{ Petrol:{price:105.20, stock:'ok'}, Diesel:{price:92.75, stock:'out'} } },
    { id:'s6', brand:'Indian Oil', brandColor:'#E4572E', name:'Indian Oil — Carter Road', addr:'Carter Road, Bandra West', dist:3.4, x:85, y:82, queue:11, avgService:4, pumps:{active:3,total:5},
      fuels:{ Petrol:{price:104.50, stock:'ok'}, Diesel:{price:92.10, stock:'ok'}, CNG:{price:76.00, stock:'ok'} } },
  ];

  var FUEL_MODE_PRICE_REF = { Petrol:104.50, Diesel:92.10, CNG:76.00, EV:18.5 };

  /* ---------------- State ---------------- */
  var state = {
    activeFuelFilter: 'All',
    view: 'list',
    currentStation: null,
    booking: { fuel:'Petrol', mode:'amount', amountValue:500, litresValue:5, payMode:'prepay' },
    activeToken: null,
    history: [],
    intervalId: null
  };

  /* ---------------- Helpers ---------------- */
  function el(id){ return document.getElementById(id); }
  function showScreen(id){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    el(id).classList.add('active');
  }
  function fmtINR(n){ return '₹' + Number(n).toFixed(2).replace(/\.00$/,''); }
  function stockLabel(s){ return s==='ok' ? 'In stock' : s==='low' ? 'Low stock' : 'Out of stock'; }

  function estWait(station){
    var activePumps = Math.max(station.pumps.active,1);
    return Math.round((station.queue * station.avgService) / activePumps);
  }

  /* ---------------- Screen 1: Location ---------------- */
  el('btn-locate').addEventListener('click', function(){
    el('locating-state').classList.add('active');
    el('btn-locate').style.display = 'none';

    function proceed(label){
      setTimeout(function(){
        el('home-addr').textContent = label;
        renderStationList();
        showScreen('screen-home');
      }, 900);
    }

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        function(pos){ proceed('Bandra West, Mumbai'); },
        function(err){ proceed('Bandra West, Mumbai (approx.)'); },
        { timeout: 4000 }
      );
    } else {
      proceed('Bandra West, Mumbai');
    }
  });

  el('btn-change-loc').addEventListener('click', function(){
    showScreen('screen-location');
    el('locating-state').classList.remove('active');
    el('btn-locate').style.display = 'flex';
  });

  /* ---------------- Screen 2: Home ---------------- */
  function filteredStations(){
    var q = (el('search-input').value || '').toLowerCase().trim();
    return STATIONS.filter(function(st){
      var fuelOk = state.activeFuelFilter === 'All' ||
        (st.fuels[state.activeFuelFilter] && st.fuels[state.activeFuelFilter].stock !== 'out');
      var searchOk = !q || st.name.toLowerCase().indexOf(q) > -1 || st.addr.toLowerCase().indexOf(q) > -1;
      return fuelOk && searchOk;
    }).sort(function(a,b){ return a.dist - b.dist; });
  }

  function renderStationList(){
    var list = filteredStations();
    var container = el('station-list');
    container.innerHTML = '';

    if(list.length === 0){
      container.innerHTML = '<div class="empty-state"><div class="title">No stations match that</div><div class="body-text">Try a different fuel type or search term.</div></div>';
      return;
    }

    list.forEach(function(st){
      var refFuel = state.activeFuelFilter !== 'All' ? state.activeFuelFilter : 'Petrol';
      var fuelInfo = st.fuels[refFuel];
      var wait = estWait(st);

      var card = document.createElement('button');
      card.className = 'station-card';
      card.setAttribute('data-id', st.id);
      card.innerHTML =
        '<div class="brand-stripe" style="background:'+st.brandColor+'"></div>' +
        '<div class="body">' +
          '<div class="sc-top">' +
            '<div class="sc-name-wrap">' +
              '<div class="sc-brand">'+st.brand+'</div>' +
              '<div class="sc-name">'+st.name.replace(st.brand+' — ','')+'</div>' +
              '<div class="sc-addr">'+st.addr+'</div>' +
            '</div>' +
            '<div class="sc-dist">'+st.dist.toFixed(1)+' km<small>away</small></div>' +
          '</div>' +
          '<div class="sc-meta">' +
            (st.queue > 0
              ? '<div class="meta-item"><span class="pulse-dot"></span><span class="val">'+st.queue+'</span><span class="lbl">in queue</span></div>'
              : '<div class="meta-item"><span class="val" style="color:var(--green)">Open</span><span class="lbl">no wait</span></div>') +
            '<div class="meta-item"><span class="val">'+wait+' min</span><span class="lbl">est. wait</span></div>' +
            (fuelInfo ? '<span class="stock-tag '+fuelInfo.stock+'">'+stockLabel(fuelInfo.stock)+'</span>' : '') +
          '</div>' +
        '</div>';
      card.addEventListener('click', function(){ openDetail(st.id); });
      container.appendChild(card);
    });
  }

  el('search-input').addEventListener('input', renderStationList);

  el('filter-row').addEventListener('click', function(e){
    var btn = e.target.closest('.chip');
    if(!btn) return;
    document.querySelectorAll('#filter-row .chip').forEach(function(c){ c.classList.remove('is-active'); });
    btn.classList.add('is-active');
    state.activeFuelFilter = btn.getAttribute('data-fuel');
    renderStationList();
    if(state.view === 'map') renderMapPins();
  });

  el('view-segmented').addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    document.querySelectorAll('#view-segmented button').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    state.view = btn.getAttribute('data-view');
    if(state.view === 'map'){
      el('map-wrap').style.display = 'block';
      el('sort-note').textContent = 'Tap a pin to view a station';
      renderMapPins();
    } else {
      el('map-wrap').style.display = 'none';
      el('sort-note').textContent = 'Sorted by distance';
    }
  });

  function renderMapPins(){
    var wrap = el('map-pins');
    wrap.innerHTML = '';
    filteredStations().forEach(function(st){
      var pin = document.createElement('button');
      pin.className = 'map-pin';
      pin.style.left = st.x + '%';
      pin.style.top = st.y + '%';
      pin.innerHTML = '<div class="dot" style="background:'+st.brandColor+'"><span>'+st.queue+'</span></div>';
      pin.addEventListener('click', function(){ openDetail(st.id); });
      wrap.appendChild(pin);
    });
  }

  /* Bottom nav (home tab bar) */
  document.querySelectorAll('.bottom-nav').forEach(function(nav){
    nav.addEventListener('click', function(e){
      var btn = e.target.closest('.nav-item');
      if(!btn) return;
      var tab = btn.getAttribute('data-tab');
      if(tab === 'home') showScreen('screen-home');
      if(tab === 'history'){ renderHistory(); showScreen('screen-history'); }
      if(tab === 'profile') showScreen('screen-profile');
    });
  });
  el('btn-go-profile').addEventListener('click', function(){ showScreen('screen-profile'); });

  /* ---------------- Screen 3: Detail ---------------- */
  function openDetail(id){
    var st = STATIONS.find(function(s){ return s.id === id; });
    state.currentStation = st;

    el('d-brand').textContent = st.brand;
    el('d-badge-text').textContent = st.queue > 0 ? ('Live · '+st.queue+' in queue') : 'Live · no queue right now';
    el('d-name').textContent = st.name;
    el('d-addr').textContent = st.addr + ' · ' + st.dist.toFixed(1) + ' km away';
    el('d-queue-num').textContent = st.queue;
    var wait = estWait(st);
    el('d-wait-text').textContent = '~'+st.avgService+' min per vehicle · est. '+wait+' min wait';
    el('d-pumps-active').textContent = st.pumps.active + ' / ' + st.pumps.total;

    var strip = el('d-pump-strip');
    strip.innerHTML = '';
    for(var i=0;i<st.pumps.total;i++){
      var d = document.createElement('div');
      d.className = 'pump-dot ' + (i < st.pumps.active ? 'busy' : 'down');
      strip.appendChild(d);
    }

    var table = el('d-fuel-table');
    table.innerHTML = '';
    Object.keys(st.fuels).forEach(function(fname){
      var f = st.fuels[fname];
      var row = document.createElement('div');
      row.className = 'fuel-row';
      row.innerHTML =
        '<div class="fuel-name"><div class="fuel-swatch" style="background:'+FUEL_COLORS[fname]+'"></div><div><div style="font-weight:600;font-size:14px;">'+fname+'</div><span class="stock-tag '+f.stock+'" style="margin-left:0;">'+stockLabel(f.stock)+'</span></div></div>' +
        '<div class="fuel-price">'+ (fname==='EV' ? '₹'+f.price+'<small> / kWh</small>' : '₹'+f.price.toFixed(2)+'<small> / litre</small>') +'</div>';
      table.appendChild(row);
    });

    showScreen('screen-detail');
  }

  el('btn-back-detail').addEventListener('click', function(){ showScreen('screen-home'); });

  el('btn-book-slot').addEventListener('click', function(){
    var st = state.currentStation;
    var availableFuels = Object.keys(st.fuels).filter(function(f){ return st.fuels[f].stock !== 'out'; });
    state.booking.fuel = availableFuels[0];
    state.booking.mode = 'amount';
    state.booking.amountValue = 500;
    state.booking.payMode = 'prepay';
    renderBookingScreen();
    showScreen('screen-booking');
  });

  /* ---------------- Screen 4: Booking ---------------- */
  function renderBookingScreen(){
    var st = state.currentStation;
    var availableFuels = Object.keys(st.fuels).filter(function(f){ return st.fuels[f].stock !== 'out'; });

    var fuelRow = el('booking-fuel-row');
    fuelRow.innerHTML = '';
    availableFuels.forEach(function(f){
      var btn = document.createElement('button');
      btn.className = 'fuel-pick' + (f === state.booking.fuel ? ' is-active' : '');
      btn.setAttribute('data-fuel', f);
      var priceLabel = f==='EV' ? ('₹'+st.fuels[f].price+'/kWh') : ('₹'+st.fuels[f].price.toFixed(2)+'/L');
      btn.innerHTML = '<div class="fp-name">'+f+'</div><div class="fp-price">'+priceLabel+'</div>';
      btn.addEventListener('click', function(){
        state.booking.fuel = f;
        renderBookingScreen();
      });
      fuelRow.appendChild(btn);
    });

    document.querySelectorAll('#booking-mode-row .mode-pick').forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute('data-mode') === state.booking.mode);
    });

    updateQtyDisplay();
    updateBookingSummary();
  }

  el('booking-mode-row').addEventListener('click', function(e){
    var btn = e.target.closest('.mode-pick');
    if(!btn) return;
    state.booking.mode = btn.getAttribute('data-mode');
    document.querySelectorAll('#booking-mode-row .mode-pick').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    el('qty-block').style.display = state.booking.mode === 'full' ? 'none' : 'block';
    updateQtyDisplay();
    updateBookingSummary();
  });

  function updateQtyDisplay(){
    var price = FUEL_MODE_PRICE_REF[state.booking.fuel] || 100;
    var disp = el('qty-display');
    var sub = el('qty-sub');
    if(state.booking.mode === 'amount'){
      disp.childNodes[0].nodeValue = '₹' + state.booking.amountValue;
      sub.textContent = 'Approx. ' + (state.booking.amountValue / price).toFixed(1) + ' L';
    } else if(state.booking.mode === 'litres'){
      disp.childNodes[0].nodeValue = state.booking.litresValue + ' L';
      sub.textContent = 'Approx. ' + fmtINR(state.booking.litresValue * price);
    } else {
      disp.childNodes[0].nodeValue = 'Full tank';
      sub.textContent = 'Approx. 38 L · ' + fmtINR(38 * price);
    }
  }

  el('qty-minus').addEventListener('click', function(){
    if(state.booking.mode === 'amount'){ state.booking.amountValue = Math.max(100, state.booking.amountValue - 100); }
    else if(state.booking.mode === 'litres'){ state.booking.litresValue = Math.max(1, state.booking.litresValue - 1); }
    updateQtyDisplay(); updateBookingSummary();
  });
  el('qty-plus').addEventListener('click', function(){
    if(state.booking.mode === 'amount'){ state.booking.amountValue = Math.min(5000, state.booking.amountValue + 100); }
    else if(state.booking.mode === 'litres'){ state.booking.litresValue = Math.min(50, state.booking.litresValue + 1); }
    updateQtyDisplay(); updateBookingSummary();
  });

  el('pay-row').addEventListener('click', function(e){
    var btn = e.target.closest('.pay-pick');
    if(!btn) return;
    state.booking.payMode = btn.getAttribute('data-pay');
    document.querySelectorAll('#pay-row .pay-pick').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
  });

  function computeAmount(){
    var st = state.currentStation;
    var price = st.fuels[state.booking.fuel] ? st.fuels[state.booking.fuel].price : FUEL_MODE_PRICE_REF[state.booking.fuel];
    if(state.booking.mode === 'amount') return state.booking.amountValue;
    if(state.booking.mode === 'litres') return state.booking.litresValue * price;
    return 38 * price;
  }

  function updateBookingSummary(){
    var st = state.currentStation;
    el('sum-station').textContent = st.name.split(' — ')[1] || st.name;
    el('sum-fuel').textContent = state.booking.fuel;
    el('sum-position').textContent = (st.queue + 1) + 'th in line';
    el('sum-wait').textContent = estWait(st) + ' min';
    el('sum-amount').textContent = fmtINR(computeAmount());
  }

  el('btn-back-booking').addEventListener('click', function(){ showScreen('screen-detail'); });

  /* ---------------- Booking confirm -> Token ---------------- */
  el('btn-confirm-booking').addEventListener('click', async function(){
    var st = state.currentStation;
    var prefix = st.brand === 'Indian Oil' ? 'IOC' : st.brand === 'HP' ? 'HP' : st.brand === 'Bharat Petroleum' ? 'BPC' : st.brand === 'Shell' ? 'SHL' : 'REL';
    var tokenId = prefix + '-' + (100 + Math.floor(Math.random()*900));
    var amount = computeAmount();
    var price = st.fuels[state.booking.fuel] ? st.fuels[state.booking.fuel].price : FUEL_MODE_PRICE_REF[state.booking.fuel];

    var record = {
      tokenNumber: tokenId,
      stationId: st.id,
      stationName: st.name,
      fuelType: state.booking.fuel,
      mode: state.booking.mode,
      requestedAmount: amount,
      requestedLitres: state.booking.mode === 'litres' ? state.booking.litresValue : state.booking.mode === 'full' ? 38 : +(amount/price).toFixed(1),
      price: price,
      payMode: state.booking.payMode,
      paymentStatus: state.booking.payMode === 'prepay' ? 'paid' : 'pending',
      status: 'booked',
      pump: null,
      pumpIndex: null,
      vehicleNumber: 'MH 02 AB 1234',
      position: st.queue + 1,
      createdAt: new Date().toISOString()
    };

    await setRecord('token:'+tokenId, record);

    state.activeToken = { tokenId: tokenId, station: st, fuel: state.booking.fuel, amount: amount,
      payMode: state.booking.payMode, position: record.position, status: 'booked',
      pump: null, lastKnownStatus: 'booked' };

    renderTokenScreen();
    showScreen('screen-token');
    startQueueSimulation();
  });

  /* ---------------- Screen 5: Token / live tracking ---------------- */
  function renderTokenScreen(){
    var t = state.activeToken;
    el('token-status-badge').textContent = 'Booking confirmed';
    el('token-number').textContent = '#' + t.tokenId;
    el('token-station').textContent = t.station.name;
    el('position-num').textContent = t.position;
    el('position-num').classList.remove('next');
    el('eta-min').textContent = Math.max(1, Math.round(t.position * t.station.avgService / Math.max(t.station.pumps.active,1))) + ' min';
    el('eta-pump').textContent = 'Assigned at pump counter';
    el('arrival-panel').classList.remove('active');
    el('staff-action-text').textContent = 'This screen updates automatically once the station staff scans your QR.';
    setTimeline('booked');

    el('qr-code').innerHTML = '';
    try{
      new QRCode(el('qr-code'), {
        text: t.tokenId + '|' + t.station.id + '|' + Date.now(),
        width: 148, height: 148,
        colorDark: '#0E1219', colorLight: '#ffffff'
      });
    }catch(e){
      el('qr-code').innerHTML = '<div style="width:148px;height:148px;display:flex;align-items:center;justify-content:center;color:#0E1219;font-size:12px;">QR unavailable</div>';
    }
  }

  function setTimeline(step){
    var order = ['booked','called','atpump','done'];
    var idx = order.indexOf(step);
    document.querySelectorAll('#timeline .tl-step').forEach(function(el2, i){
      el2.classList.remove('done','current');
      if(i < idx) el2.classList.add('done');
      else if(i === idx) el2.classList.add('current');
    });
  }

  function showToast(msg){
    el('toast-msg').textContent = msg;
    el('toast').classList.add('show');
    setTimeout(function(){ el('toast').classList.remove('show'); }, 2800);
  }

  /* Cosmetic local position countdown + real status polling against shared storage,
     so this screen reflects what the staff console actually does (call next, scan, complete). */
  function startQueueSimulation(){
    if(state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(async function(){
      var t = state.activeToken;
      if(!t) return;

      var record = await getRecord('token:'+t.tokenId);
      if(!record){ return; }

      if(record.status === 'booked' && t.position > 1){
        t.position -= 1;
        el('position-num').textContent = t.position;
        el('eta-min').textContent = Math.max(1, Math.round(t.position * t.station.avgService / Math.max(t.station.pumps.active,1))) + ' min';
        if(t.position === 3){ showToast('Only 3 vehicles ahead of you now.'); }
        if(t.position === 1){
          el('position-num').classList.add('next');
          showToast('You are close to the front of the queue.');
        }
      }

      if(record.status !== t.lastKnownStatus){
        t.lastKnownStatus = record.status;

        if(record.status === 'called'){
          el('token-status-badge').textContent = 'Called — head to the pump';
          setTimeline('called');
          el('arrival-panel').classList.add('active');
          el('staff-action-text').textContent = 'Show your QR code to the staff at the pump counter.';
          showToast('It is your turn! Show your QR at the counter.');
        }

        if(record.status === 'at-pump'){
          el('token-status-badge').textContent = 'At the pump — fueling now';
          setTimeline('atpump');
          el('arrival-panel').classList.remove('active');
          el('eta-pump').textContent = record.pump || 'Assigned';
          el('staff-action-text').textContent = 'Staff has verified your QR and started fueling at ' + (record.pump || 'the pump') + '.';
          showToast('Verified — fueling has started at ' + (record.pump || 'the pump') + '.');
        }

        if(record.status === 'completed'){
          clearInterval(state.intervalId);
          setTimeline('done');
          fillReceiptFromRecord(record);
          showToast('Fueling complete — here is your receipt.');
          showScreen('screen-receipt');
        }
      }
    }, 2200);
  }

  function fillReceiptFromRecord(record){
    el('receipt-station').textContent = record.stationName;
    el('r-token').textContent = '#' + record.tokenNumber;
    el('r-fuel').textContent = record.fuelType;
    el('r-litres').textContent = record.actualLitres + (record.fuelType==='EV' ? ' kWh' : ' L');
    el('r-rate').textContent = '₹' + record.price.toFixed(2) + (record.fuelType==='EV' ? ' / kWh' : ' / litre');
    el('r-mode').textContent = record.payMode === 'prepay' ? 'Paid online' : 'Paid at pump (' + (record.paymentMode || 'settled') + ')';
    el('r-total').textContent = fmtINR(record.actualAmount);

    state.history.unshift({
      station: record.stationName, fuel: record.fuelType, amount: record.actualAmount, token: '#'+record.tokenNumber,
      status: 'done', date: 'Today'
    });

    document.querySelectorAll('#star-row .star').forEach(function(s){ s.classList.remove('on'); });
  }

  el('star-row').addEventListener('click', function(e){
    var star = e.target.closest('.star');
    if(!star) return;
    var val = +star.getAttribute('data-star');
    document.querySelectorAll('#star-row .star').forEach(function(s){
      s.classList.toggle('on', +s.getAttribute('data-star') <= val);
    });
  });

  el('btn-receipt-done').addEventListener('click', function(){
    renderHistory();
    showScreen('screen-history');
  });

  /* ---------------- Screen 7: History ---------------- */
  function renderHistory(){
    var wrap = el('history-list');
    wrap.innerHTML = '';

    if(state.activeToken && (state.activeToken.lastKnownStatus === 'booked' || state.activeToken.lastKnownStatus === 'called' || state.activeToken.lastKnownStatus === 'at-pump')){
      var t = state.activeToken;
      var card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML =
        '<div class="history-left"><div class="h-station">'+t.station.name+'</div><div class="h-meta">#'+t.tokenId+' · '+t.fuel+'</div></div>' +
        '<div class="history-right"><div class="h-amt">'+fmtINR(t.amount)+'</div><div class="h-status active">Track live</div></div>';
      card.addEventListener('click', function(){ renderTokenScreen(); showScreen('screen-token'); });
      wrap.appendChild(card);
    }

    if(state.history.length === 0 && !state.activeToken){
      wrap.innerHTML = '<div class="empty-state"><div class="title">No bookings yet</div><div class="body-text">Book your first slot and it will show up here.</div></div>';
      return;
    }

    state.history.forEach(function(h){
      var card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML =
        '<div class="history-left"><div class="h-station">'+h.station+'</div><div class="h-meta">'+h.token+' · '+h.fuel+' · '+h.date+'</div></div>' +
        '<div class="history-right"><div class="h-amt">'+fmtINR(h.amount)+'</div><div class="h-status done">Completed</div></div>';
      wrap.appendChild(card);
    });
  }

  el('btn-logout').addEventListener('click', function(){
    showToast('This is a prototype — log out is not wired up.');
  });

  /* Init */
  el('qty-block').style.display = 'block';
})();

(function(){

  /* ---------------- Storage layer (shared with customer app when run as an artifact) ---------------- */
  var memoryStore = window.SharedFuelStore;
  var hasRealStorage = (typeof window.storage !== 'undefined');
  var storage = hasRealStorage ? window.storage : {
    get: function(k){ return new Promise(function(res, rej){ if(Object.prototype.hasOwnProperty.call(memoryStore,k)) res({key:k,value:memoryStore[k],shared:true}); else rej(new Error('not found')); }); },
    set: function(k,v){ return new Promise(function(res){ memoryStore[k]=v; res({key:k,value:v,shared:true}); }); },
    delete: function(k){ return new Promise(function(res){ delete memoryStore[k]; res({key:k,deleted:true,shared:true}); }); },
    list: function(prefix){ return new Promise(function(res){ var keys=Object.keys(memoryStore).filter(function(k){ return !prefix || k.indexOf(prefix)===0; }); res({keys:keys}); }); }
  };

  async function getRecord(key){
    try{ var r = await storage.get(key, true); return r ? JSON.parse(r.value) : null; }
    catch(e){ return null; }
  }
  async function setRecord(key, obj){
    try{ await storage.set(key, JSON.stringify(obj), true); return true; }
    catch(e){ return false; }
  }
  async function listStationTokens(stationId){
    try{
      var res = await storage.list('token:', true);
      if(!res || !res.keys) return [];
      var out = [];
      for(var i=0;i<res.keys.length;i++){
        var obj = await getRecord(res.keys[i]);
        if(obj && obj.stationId === stationId) out.push(obj);
      }
      return out;
    }catch(e){ return []; }
  }
  async function getPumpStatus(stationId, total){
    var arr = await getRecord('pump-status:'+stationId);
    if(arr && arr.length === total) return arr;
    var fresh = new Array(total).fill('free');
    await setRecord('pump-status:'+stationId, fresh);
    return fresh;
  }
  async function setPumpStatus(stationId, arr){ await setRecord('pump-status:'+stationId, arr); }

  /* ---------------- Reference data ---------------- */
  var STAFF = [
    { id:'IOC-BW-01', password:'pump1234', name:'Ramesh Iyer', stationId:'s1' },
    { id:'HP-BW-01', password:'pump5678', name:'Sunita Rao', stationId:'s2' }
  ];
  var STATIONS = {
    s1: { id:'s1', name:'Indian Oil — Linking Road', pumps:4, fuels:{ Petrol:104.50, Diesel:92.10, CNG:76.00 } },
    s2: { id:'s2', name:'HP Petrol Pump — Turner Road', pumps:4, fuels:{ Petrol:104.62, Diesel:92.30 } },
    s3: { id:'s3', name:'Bharat Petroleum — SV Road', pumps:4, fuels:{ Petrol:104.45, Diesel:91.95, CNG:75.80 } },
    s4: { id:'s4', name:'Shell — Hill Road', pumps:3, fuels:{ Petrol:106.10, Diesel:93.40, EV:18.5 } },
    s5: { id:'s5', name:'Reliance — Waterfield Road', pumps:2, fuels:{ Petrol:105.20 } },
    s6: { id:'s6', name:'Indian Oil — Carter Road', pumps:5, fuels:{ Petrol:104.50, Diesel:92.10, CNG:76.00 } }
  };

  var state = { staff:null, station:null, refreshTimer:null, cameraStream:null, scanLoopId:null, activeToken:null };

  function el(id){ return document.getElementById(id); }
  function fmtINR(n){ return '₹' + Number(n).toFixed(2).replace(/\.00$/,''); }
  function timeAgo(iso){
    var mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime())/60000));
    return mins < 1 ? 'just now' : mins + ' min ago';
  }
  function showToast(msg){
    el('staff-toast-msg').textContent = msg;
    el('staff-toast').classList.add('show');
    setTimeout(function(){ el('staff-toast').classList.remove('show'); }, 2800);
  }
  function showView(name){
    document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
    el('view-'+name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.toggle('is-active', b.getAttribute('data-view')===name); });
    if(name !== 'scan') stopCamera();
  }

  /* ---------------- Login ---------------- */
  el('btn-login').addEventListener('click', doLogin);
  el('login-pass').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

  function doLogin(){
    var id = el('login-id').value.trim();
    var pass = el('login-pass').value;
    var match = STAFF.find(function(s){ return s.id.toLowerCase() === id.toLowerCase() && s.password === pass; });
    if(!match){
      el('login-error').classList.add('show');
      return;
    }
    el('login-error').classList.remove('show');
    state.staff = match;
    state.station = STATIONS[match.stationId];
    el('staff-name').textContent = match.name;
    el('staff-station').textContent = state.station.name;
    el('dash-station-name').textContent = state.station.name + ' — Queue';

    el('screen-login').style.display = 'none';
    el('app-shell').classList.add('active');

    renderDashboard();
    state.refreshTimer = setInterval(function(){
      if(el('view-dashboard').classList.contains('active')) renderDashboard();
    }, 3000);
  }

  el('staff-btn-logout').addEventListener('click', function(){
    if(state.refreshTimer) clearInterval(state.refreshTimer);
    stopCamera();
    state.staff = null; state.station = null;
    el('app-shell').classList.remove('active');
    el('screen-login').style.display = 'flex';
    el('login-id').value=''; el('login-pass').value='';
  });

  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var v = btn.getAttribute('data-view');
      showView(v);
      if(v==='dashboard') renderDashboard();
      if(v==='scan') renderScan();
      if(v==='history') renderHistory();
    });
  });

  /* ---------------- Dashboard ---------------- */
  async function renderDashboard(){
    var st = state.station;
    var tokens = await listStationTokens(st.id);

    var waiting = tokens.filter(function(t){ return t.status==='booked'; });
    var called = tokens.filter(function(t){ return t.status==='called'; });
    var atPump = tokens.filter(function(t){ return t.status==='at-pump'; });
    var completedToday = tokens.filter(function(t){ return t.status==='completed'; });

    el('stat-waiting').textContent = waiting.length;
    el('stat-called').textContent = called.length;
    el('stat-fueling').textContent = atPump.length;
    el('stat-completed').textContent = completedToday.length;
    el('queue-alert-dot').classList.toggle('show', called.length > 0);

    var pumps = await getPumpStatus(st.id, st.pumps);
    var pumpRow = el('pump-row');
    pumpRow.innerHTML = '';
    pumps.forEach(function(p, i){
      var chip = document.createElement('div');
      chip.className = 'pump-chip';
      chip.innerHTML = '<span class="ps-dot '+p+'"></span><span>Pump '+(i+1)+' · '+(p==='free'?'Free':'Busy')+'</span>';
      pumpRow.appendChild(chip);
    });

    var active = tokens.filter(function(t){ return t.status==='booked' || t.status==='called' || t.status==='at-pump'; })
      .sort(function(a,b){ return new Date(a.createdAt) - new Date(b.createdAt); });

    var list = el('queue-list');
    list.innerHTML = '';
    if(active.length === 0){
      list.innerHTML = '<div class="empty-note"><div class="title" style="font-size:14px;">No one in queue right now</div><div class="small" style="margin-top:4px;">New bookings from the customer app will appear here automatically.</div></div>';
    } else {
      active.forEach(function(t){
        var row = document.createElement('div');
        row.className = 'queue-row';
        row.innerHTML =
          '<div class="qr-token-badge">'+t.tokenNumber+'</div>' +
          '<div class="queue-row-info">' +
            '<div class="qr-fuel">'+t.fuelType+' · '+(t.mode==='litres' ? t.requestedLitres+' L' : t.mode==='full' ? 'Full tank' : fmtINR(t.requestedAmount))+'</div>' +
            '<div class="qr-meta">'+t.vehicleNumber+' · booked '+timeAgo(t.createdAt)+'</div>' +
          '</div>' +
          '<span class="pay-badge '+t.paymentStatus+'">'+(t.paymentStatus==='paid'?'Paid':'Pending')+'</span>' +
          '<span class="status-badge '+t.status+'">'+labelForStatus(t.status)+'</span>' +
          '<button class="row-action" data-token="'+t.tokenNumber+'">Verify</button>';
        list.appendChild(row);
      });
    }

    list.querySelectorAll('[data-token]').forEach(function(btn){
      btn.addEventListener('click', function(){ loadVerify(btn.getAttribute('data-token')); });
    });
  }

  function labelForStatus(s){
    return { booked:'Waiting', called:'Called', 'at-pump':'At pump', completed:'Completed', cancelled:'Cancelled', 'no-show':'No show' }[s] || s;
  }

  el('btn-call-next').addEventListener('click', async function(){
    var tokens = await listStationTokens(state.station.id);
    var waiting = tokens.filter(function(t){ return t.status==='booked'; })
      .sort(function(a,b){ return new Date(a.createdAt) - new Date(b.createdAt); });
    if(waiting.length === 0){ showToast('No one is currently waiting.'); return; }
    var next = waiting[0];
    next.status = 'called';
    next.calledAt = new Date().toISOString();
    await setRecord('token:'+next.tokenNumber, next);
    showToast(next.tokenNumber + ' called — ask them to show their QR.');
    renderDashboard();
  });

  /* ---------------- Scan ---------------- */
  function renderScan(){
    el('camera-placeholder').style.display = 'flex';
    el('scan-video').style.display = 'none';
    el('scan-frame').style.display = 'none';
    el('btn-start-camera').textContent = 'Turn on camera';
    renderQuickList();
  }

  async function renderQuickList(){
    var tokens = await listStationTokens(state.station.id);
    var pending = tokens.filter(function(t){ return t.status==='booked' || t.status==='called'; });
    var wrap = el('quick-list');
    wrap.innerHTML = pending.length ? '<div class="small" style="margin-bottom:8px;">Pending at your station</div>' : '';
    pending.forEach(function(t){
      var item = document.createElement('div');
      item.className = 'quick-item';
      item.innerHTML = '<span class="small" style="color:var(--ink);font-weight:600;">'+t.tokenNumber+'</span><button class="row-action" data-qt="'+t.tokenNumber+'">Verify</button>';
      wrap.appendChild(item);
    });
    wrap.querySelectorAll('[data-qt]').forEach(function(btn){
      btn.addEventListener('click', function(){ loadVerify(btn.getAttribute('data-qt')); });
    });
  }

  el('btn-manual-lookup').addEventListener('click', function(){
    var v = el('manual-token').value.trim();
    if(!v){ showToast('Enter a token number first.'); return; }
    loadVerify(v.replace(/^#/,''));
  });
  el('manual-token').addEventListener('keydown', function(e){ if(e.key==='Enter') el('btn-manual-lookup').click(); });

  el('btn-start-camera').addEventListener('click', async function(){
    if(state.cameraStream){ stopCamera(); renderScan(); return; }
    try{
      var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      state.cameraStream = stream;
      var video = el('scan-video');
      video.srcObject = stream;
      video.play();
      el('camera-placeholder').style.display = 'none';
      video.style.display = 'block';
      el('scan-frame').style.display = 'block';
      el('btn-start-camera').textContent = 'Turn off camera';
      scanLoop();
    }catch(e){
      showToast('Camera unavailable — use manual entry or the pending list below.');
    }
  });

  function stopCamera(){
    if(state.scanLoopId) cancelAnimationFrame(state.scanLoopId);
    state.scanLoopId = null;
    if(state.cameraStream){
      state.cameraStream.getTracks().forEach(function(t){ t.stop(); });
      state.cameraStream = null;
    }
  }

  function scanLoop(){
    var video = el('scan-video');
    var canvas = el('scan-canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    function tick(){
      if(!state.cameraStream) return;
      if(video.readyState === video.HAVE_ENOUGH_DATA && typeof jsQR === 'function'){
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = jsQR(img.data, img.width, img.height);
        if(code && code.data){
          var parts = code.data.split('|');
          if(parts[0]){
            stopCamera();
            showToast('QR scanned — looking up booking.');
            loadVerify(parts[0]);
            return;
          }
        }
      }
      state.scanLoopId = requestAnimationFrame(tick);
    }
    state.scanLoopId = requestAnimationFrame(tick);
  }

  /* ---------------- Verify ---------------- */
  async function loadVerify(tokenNumber){
    var t = await getRecord('token:'+tokenNumber);
    state.activeToken = t;
    var checks = [];
    var valid = true;
    var reason = '';

    if(!t){
      valid = false; reason = 'No booking found for this token.';
    } else {
      if(t.stationId !== state.station.id){ valid = false; checks.push({pass:false, text:'Issued for a different station'}); }
      else checks.push({pass:true, text:'Matches this station'});

      var ageMin = (Date.now() - new Date(t.createdAt).getTime()) / 60000;
      if(ageMin > 90){ valid = false; checks.push({pass:false, text:'Token has expired'}); }
      else checks.push({pass:true, text:'Within validity window'});

      if(t.status === 'completed'){ valid = false; checks.push({pass:false, text:'Already used for a completed transaction'}); }
      else if(t.status === 'cancelled' || t.status === 'no-show'){ valid = false; checks.push({pass:false, text:'Booking was cancelled or marked no-show'}); }
      else checks.push({pass:true, text:'Not yet used'});

      if(valid) reason = 'This booking is valid and ready for fueling.';
    }

    var statusBox = el('verify-status');
    statusBox.className = 'verify-status ' + (valid ? 'valid' : 'invalid');
    el('verify-icon').innerHTML = valid
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0E1219" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#0E1219" stroke-width="2.5" stroke-linecap="round"/></svg>';
    el('verify-title').textContent = valid ? 'Valid booking' : 'Cannot proceed';
    el('verify-sub').textContent = reason || (t ? 'Token ' + tokenNumber + ' could not be verified.' : 'Token ' + tokenNumber + ' was not found.');

    var details = el('verify-details');
    var checkList = el('check-list');
    checkList.innerHTML = '';

    if(t){
      details.innerHTML =
        detailRow('Token', t.tokenNumber) +
        detailRow('Vehicle', t.vehicleNumber || '—') +
        detailRow('Fuel type', t.fuelType) +
        detailRow('Requested', t.mode==='litres' ? t.requestedLitres+' L' : t.mode==='full' ? 'Full tank (~38 L)' : fmtINR(t.requestedAmount)) +
        detailRow('Amount', fmtINR(t.requestedAmount)) +
        detailRow('Payment', (t.paymentStatus==='paid' ? 'Paid ('+(t.payMode==='prepay'?'online':'')+')' : 'Pending — pay at pump')) +
        detailRow('Booked', timeAgo(t.createdAt));

      checks.forEach(function(c){
        var item = document.createElement('div');
        item.className = 'check-item ' + (c.pass?'pass':'fail');
        item.innerHTML = (c.pass
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke-width="2" stroke-linecap="round"/></svg>'
        ) + '<span>'+c.text+'</span>';
        checkList.appendChild(item);
      });
    } else {
      details.innerHTML = '<div class="empty-note"><div class="body-text">Double-check the token number and try again.</div></div>';
    }

    el('btn-assign-pump').disabled = !valid;
    el('btn-assign-pump').style.opacity = valid ? '1' : '0.45';
    showView('verify');
  }

  function detailRow(l, v){
    return '<div class="detail-row"><span class="dl">'+l+'</span><span class="dv">'+v+'</span></div>';
  }

  el('btn-verify-cancel').addEventListener('click', function(){ showView('dashboard'); renderDashboard(); });

  el('btn-assign-pump').addEventListener('click', async function(){
    var t = state.activeToken;
    if(!t) return;
    var pumps = await getPumpStatus(state.station.id, state.station.pumps);
    var freeIndex = pumps.indexOf('free');
    if(freeIndex === -1){ showToast('All pumps are currently busy — please wait.'); return; }
    pumps[freeIndex] = 'busy';
    await setPumpStatus(state.station.id, pumps);

    t.status = 'at-pump';
    t.pump = 'Pump ' + (freeIndex + 1);
    t.pumpIndex = freeIndex;
    t.atPumpAt = new Date().toISOString();
    await setRecord('token:'+t.tokenNumber, t);
    state.activeToken = t;

    el('fuel-pump-num').textContent = t.pump;
    el('fuel-token-line').textContent = 'Token ' + t.tokenNumber + ' · ' + t.fuelType;
    var price = state.station.fuels[t.fuelType] || 0;
    var defaultLitres = t.mode === 'litres' ? t.requestedLitres : t.mode === 'full' ? 38 : +(t.requestedAmount / price).toFixed(1);
    el('fuel-litres').value = defaultLitres;
    el('fuel-rate').value = '₹' + price.toFixed(2) + ' / L';
    el('fuel-amount').value = fmtINR(defaultLitres * price);
    el('payment-confirm-block').style.display = t.paymentStatus === 'paid' ? 'none' : 'block';

    showView('fueling');
    showToast('Pump ' + (freeIndex+1) + ' assigned.');
  });

  el('fuel-litres').addEventListener('input', function(){
    var t = state.activeToken;
    var price = state.station.fuels[t.fuelType] || 0;
    var litres = parseFloat(el('fuel-litres').value) || 0;
    el('fuel-amount').value = fmtINR(litres * price);
  });

  /* ---------------- Complete fueling ---------------- */
  el('btn-complete-fueling').addEventListener('click', async function(){
    var t = state.activeToken;
    if(!t) return;
    var price = state.station.fuels[t.fuelType] || 0;
    var litres = parseFloat(el('fuel-litres').value) || 0;

    var pumps = await getPumpStatus(state.station.id, state.station.pumps);
    if(typeof t.pumpIndex === 'number') pumps[t.pumpIndex] = 'free';
    await setPumpStatus(state.station.id, pumps);

    t.status = 'completed';
    t.actualLitres = litres;
    t.actualAmount = +(litres * price).toFixed(2);
    t.paymentStatus = 'paid';
    t.paymentMode = t.payMode === 'prepay' ? 'Online (prepaid)' : el('fuel-pay-mode').value.toUpperCase();
    t.completedAt = new Date().toISOString();
    await setRecord('token:'+t.tokenNumber, t);

    showToast('Transaction complete — ' + t.tokenNumber + ' moved to history.');
    renderHistory();
    showView('history');
  });

  /* ---------------- History ---------------- */
  async function renderHistory(){
    var tokens = await listStationTokens(state.station.id);
    var done = tokens.filter(function(t){ return t.status==='completed'; })
      .sort(function(a,b){ return new Date(b.completedAt) - new Date(a.completedAt); });

    var list = el('staff-history-list');
    list.innerHTML = '';
    if(done.length === 0){
      list.innerHTML = '<div class="empty-note"><div class="title" style="font-size:14px;">No completed transactions yet</div><div class="small" style="margin-top:4px;">Finished fuelings will show up here.</div></div>';
      return;
    }
    done.forEach(function(t){
      var row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML =
        '<div class="qr-token-badge">'+t.tokenNumber+'</div>' +
        '<div class="queue-row-info">' +
          '<div class="qr-fuel">'+t.fuelType+' · '+t.actualLitres+' L · '+t.pump+'</div>' +
          '<div class="qr-meta">'+t.vehicleNumber+' · '+ (t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '') +'</div>' +
        '</div>' +
        '<span class="pay-badge paid">'+(t.paymentMode||'Paid')+'</span>' +
        '<div class="qr-token-badge" style="min-width:76px;">'+fmtINR(t.actualAmount)+'</div>';
      list.appendChild(row);
    });
  }

})();

(function(){
    var btnC = document.getElementById('ds-customer');
    var btnS = document.getElementById('ds-staff');
    var paneC = document.getElementById('customer-app');
    var paneS = document.getElementById('staff-app');
    function go(which){
      paneC.classList.toggle('active', which === 'customer');
      paneS.classList.toggle('active', which === 'staff');
      btnC.classList.toggle('is-active', which === 'customer');
      btnS.classList.toggle('is-active', which === 'staff');
    }
    btnC.addEventListener('click', function(){ go('customer'); });
    btnS.addEventListener('click', function(){ go('staff'); });
  })();