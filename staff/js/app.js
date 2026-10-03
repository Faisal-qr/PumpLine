import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const auth = window.auth;
const db = window.db;


(function(){

  /* ---------------- Reference data ---------------- */
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

  /* ---------------- Firebase Staff Login / Signup ---------------- */
  var isSignup = false;

  function authError(message){
    var box = el('login-error');
    if(box){
      box.textContent = message;
      box.classList.add('show');
    }
  }

  function clearAuthError(){
    var box = el('login-error');
    if(box){
      box.textContent = '';
      box.classList.remove('show');
    }
  }

  function setAuthMode(signup){
    isSignup = signup;
    clearAuthError();

    el('auth-title').textContent = signup ? 'Create Staff Account' : 'Staff Login';
    el('auth-subtitle').textContent = signup
      ? 'Create your PumpLine staff account.'
      : 'Login to manage your station queue.';

    el('btn-login').textContent = signup ? 'Create Staff Account' : 'Login';
    el('btn-toggle-auth').textContent = signup
      ? 'Already have an account? Login'
      : 'Create new staff account';

    var nameWrap = el('staff-name-wrap');
    var idWrap = el('staff-id-wrap');
    var stationWrap = el('staff-station-wrap');
    if(nameWrap) nameWrap.style.display = signup ? 'block' : 'none';
    if(idWrap) idWrap.style.display = signup ? 'block' : 'none';
    if(stationWrap) stationWrap.style.display = signup ? 'block' : 'none';
  }

  async function handleAuth(){
    clearAuthError();

    var email = el('login-id').value.trim();
    var password = el('login-pass').value;

    if(!email || !password){
      authError('Please enter email and password.');
      return;
    }

    if(password.length < 6){
      authError('Password must be at least 6 characters.');
      return;
    }

    var button = el('btn-login');
    button.disabled = true;

    try{ 

      await setPersistence(
  auth,
  browserSessionPersistence
);



      if(isSignup){
        var name = el('staff-name').value.trim();
        var staffId = el('staff-id').value.trim();
        var stationId = el('staff-station-select').value;

        if(!name || !staffId || !stationId){
          authError('Please fill name, staff ID and station.');
          return;
        }

        var result = await createUserWithEmailAndPassword(auth, email, password);
        var user = result.user;

        await setDoc(doc(db, 'staff', user.uid), {
          uid: user.uid,
          name: name,
          staffId: staffId,
          email: user.email,
          stationId: stationId,
          role: 'staff',
          createdAt: serverTimestamp()
        });

        await loadStaffProfile(user);
      }else{
        await signInWithEmailAndPassword(auth, email, password);
      }
    }catch(error){
      console.error('Staff authentication error:', error);
      var message = 'Something went wrong.';

      if(error.code === 'auth/invalid-credential' ||
         error.code === 'auth/user-not-found' ||
         error.code === 'auth/wrong-password'){
        message = 'Invalid email or password.';
      }else if(error.code === 'auth/email-already-in-use'){
        message = 'This email is already registered.';
      }else if(error.code === 'auth/weak-password'){
        message = 'Password must be at least 6 characters.';
      }else if(error.code === 'auth/invalid-email'){
        message = 'Please enter a valid email.';
      }else if(error.code === 'permission-denied'){
        message = 'Account created, but staff profile could not be saved. Check Firestore rules.';
      }else if(error.message === 'STAFF_PROFILE_MISSING'){
        message = 'Staff profile could not be loaded.';
      }else if(error.message === 'NOT_STAFF_ACCOUNT'){
        message = 'This account is not a staff account.';
      }

      authError(message);
    }finally{
      button.disabled = false;
    }
  }

  async function loadStaffProfile(user){
    var snap = await getDoc(doc(db, 'staff', user.uid));

    if(!snap.exists()){
      await signOut(auth);
      throw new Error('STAFF_PROFILE_MISSING');
    }

    var profile = snap.data();

    if(profile.role !== 'staff'){
      await signOut(auth);
      throw new Error('NOT_STAFF_ACCOUNT');
    }

    var station = STATIONS[profile.stationId];
    if(!station){
      await signOut(auth);
      throw new Error('INVALID_STATION');
    }

    state.staff = {
      uid: user.uid,
      id: profile.staffId || user.uid.slice(0,8),
      staffId: profile.staffId || user.uid.slice(0,8),
      name: profile.name || user.email,
      email: user.email,
      stationId: profile.stationId
    };
    state.station = station;

    el('staff-name-display').textContent = state.staff.name;
    el('staff-station').textContent = station.name;
    el('dash-station-name').textContent = station.name + ' — Queue';

    el('screen-login').style.display = 'none';
    el('app-shell').classList.add('active');

    renderDashboard();

    if(state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(function(){
      if(state.station && el('view-dashboard').classList.contains('active')){
        renderDashboard();
      }
    }, 3000);
  }

  el('btn-login').addEventListener('click', handleAuth);
  el('login-pass').addEventListener('keydown', function(e){
    if(e.key === 'Enter') handleAuth();
  });

  el('btn-toggle-auth').addEventListener('click', function(){
    setAuthMode(!isSignup);
  });

  el('staff-btn-logout').addEventListener('click', async function(){
    if(state.refreshTimer) clearInterval(state.refreshTimer);
    stopCamera();
    state.refreshTimer = null;
    state.staff = null;
    state.station = null;
    state.activeToken = null;
    await signOut(auth);
    el('app-shell').classList.remove('active');
    el('screen-login').style.display = 'flex';
    el('login-id').value = '';
    el('login-pass').value = '';
    if(el('staff-name')) el('staff-name').value = '';
    if(el('staff-id')) el('staff-id').value = '';
    setAuthMode(false);
  });

  onAuthStateChanged(auth, async function(user){
    if(!user){
      el('app-shell').classList.remove('active');
      el('screen-login').style.display = 'flex';
      setAuthMode(false);
      return;
    }

    try{
      await loadStaffProfile(user);
    }catch(error){
      console.error('Staff profile error:', error);
      if(error.message === 'STAFF_PROFILE_MISSING'){
        authError('This account is not registered as staff.');
      }else if(error.message === 'NOT_STAFF_ACCOUNT'){
        authError('This account is not a staff account.');
      }else{
        authError('Unable to load staff profile.');
      }
    }
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


  async function listStationTokens(stationId){
    if(!state.station) return [];
    try{
      var q = query(
        collection(db, 'bookings'),
        where('stationId', '==', stationId)
      );
      var snap = await getDocs(q);
      var out = [];
      snap.forEach(function(docSnap){
        var b = docSnap.data();
        b.firestoreId = docSnap.id;
        b.tokenNumber = b.tokenNumber || b.tokenId || docSnap.id;
        b.fuelType = b.fuelType || b.fuel || 'Petrol';
        b.requestedAmount = Number(b.requestedAmount != null ? b.requestedAmount : (b.amount || 0));
        b.requestedLitres = Number(b.requestedLitres || 0);
        b.paymentStatus = b.paymentStatus || 'pending';
        b.mode = b.mode || 'amount';
        b.createdAt = b.createdAt && b.createdAt.toDate
          ? b.createdAt.toDate().toISOString()
          : (b.createdAt || new Date().toISOString());
        out.push(b);
      });
      return out;
    }catch(e){
      console.error('BOOKINGS LOAD ERROR:', e);
      return [];
    }
  }

  async function getBookingByToken(tokenNumber){
    var tokens = await listStationTokens(state.station.id);
    return tokens.find(function(t){
      return String(t.tokenNumber).toLowerCase() === String(tokenNumber).toLowerCase();
    }) || null;
  }

  async function updateBooking(t){
    if(!t || !t.firestoreId) throw new Error('Booking document ID missing.');
    var copy = Object.assign({}, t);
    delete copy.firestoreId;
    delete copy.createdAt;

    copy.updatedAt = serverTimestamp();

    await updateDoc(doc(db, 'bookings', t.firestoreId), copy);
  }
     
  // ye old code tha jo ki abhi comment kiya gaya hai

  // async function getPumpStatus(stationId, total){
  //   var tokens = await listStationTokens(stationId);
  //   var arr = new Array(total).fill('free');

  //   tokens.forEach(function(t){
  //     if(t.status === 'at-pump' && typeof t.pumpIndex === 'number' &&
  //        t.pumpIndex >= 0 && t.pumpIndex < total){
  //       arr[t.pumpIndex] = 'busy';
  //     }
  //   });

  //   return arr;
  // }

    //  ye new code hai jo ki abhi add kiya gaya hai upar wale se replace karne ke liye


   async function getPumpStatus(stationId, total){
  var tokens = await listStationTokens(stationId);

  var arr = new Array(total).fill('free');

  tokens.forEach(function(t){
    if(
      t.status === 'at-pump' &&
      typeof t.pumpIndex === 'number' &&
      t.pumpIndex >= 0 &&
      t.pumpIndex < total
    ){
      arr[t.pumpIndex] = 'busy';
    }
  });

  return arr;
}








  /* ---------------- Dashboard ---------------- */
  async function renderDashboard(){
    if(!state.station) return;
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
    await updateBooking(next);
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
    var t = await getBookingByToken(tokenNumber);
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
    // await setPumpStatus(state.station.id, pumps);

    t.status = 'at-pump';
    t.pump = 'Pump ' + (freeIndex + 1);
    t.pumpIndex = freeIndex;
    t.atPumpAt = new Date().toISOString();
    await updateBooking(t);
    state.activeToken = t;

    el('fuel-pump-num').textContent = t.pump;
    el('fuel-token-line').textContent = 'Token ' + t.tokenNumber + ' · ' + t.fuelType;
    var price = state.station.fuels[t.fuelType] || 0;
    var defaultLitres = t.mode === 'litres' ? t.requestedLitres : t.mode === 'full' ? 38 : +(t.requestedAmount / price).toFixed(1);
    el('fuel-litres').value = defaultLitres;
    el('fuel-rate').value = '₹' + price.toFixed(2) + ' / L';
    el('fuel-amount').value = fmtINR(defaultLitres * price);

    // ye old code tha jo ki abhi comment kiya gaya hai
    // el('payment-confirm-block').style.display = t.paymentStatus === 'paid' ? 'none' : 'block';
   
    // ye new code hai jo ki abhi add kiya gaya hai upar wale se replace karne ke liye
    var paymentBlock = el('payment-confirm-block');

if(paymentBlock){
  paymentBlock.style.display =
    t.paymentStatus === 'paid' ? 'none' : 'block';
}

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

    // var pumps = await getPumpStatus(state.station.id, state.station.pumps);
    // if(typeof t.pumpIndex === 'number') pumps[t.pumpIndex] = 'free';
    // await setPumpStatus(state.station.id, pumps);

    t.status = 'completed';
    t.actualLitres = litres;
    t.actualAmount = +(litres * price).toFixed(2);
    t.paymentStatus = 'paid';
    t.paymentMode = t.payMode === 'prepay' ? 'Online (prepaid)' : el('fuel-pay-mode').value.toUpperCase();
    t.completedAt = new Date().toISOString();
    await updateBooking(t);

    showToast('Transaction complete — ' + t.tokenNumber + ' moved to history.');
    renderHistory();
    showView('history');
  });

  /* ---------------- History ---------------- */
  async function renderHistory(){
    if(!state.station) return;
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