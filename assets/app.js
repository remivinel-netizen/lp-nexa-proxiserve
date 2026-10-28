/* Moteur commun des landings MonChauffagistePrivé.
   Un seul script pour les quatre pages : le questionnaire est décrit dans le
   HTML (une étape par <fieldset class="step" data-step="…">), le script ne
   fait que l'animer, le valider et envoyer le lead. */
(function(){
  'use strict';
  var CFG = window.MCP_CONFIG || {};
  var dl = window.dataLayer = window.dataLayer || [];
  var form = document.getElementById('q-form');
  var THEME = form ? (form.getAttribute('data-thematique') || '') : '';
  function track(ev, data){ var o = {event: ev, thematique: THEME}; for (var k in data) o[k] = data[k]; dl.push(o); }
  try { var y = document.getElementById('annee'); if (y) y.textContent = new Date().getFullYear(); } catch(e){}

  /* ---------- numéro d'appel ---------- */
  /* Les boutons d'appel sont écrits dans le HTML avec data-tel. Tant que le
     numéro n'est pas réglé, ils renvoient vers le formulaire et affichent
     « Être rappelé » : pas de numéro bidon sur une page diffusée. */
  var TEL = (CFG.tel || '').trim();
  var telDigits = TEL.replace(/\D/g, '');
  var telHref = telDigits ? 'tel:+33' + telDigits.replace(/^0/, '') : '';
  Array.prototype.forEach.call(document.querySelectorAll('[data-tel]'), function(a){
    var num = a.querySelector('[data-tel-num]');
    if (telHref){
      a.setAttribute('href', telHref);
      if (num) num.textContent = TEL;
      a.addEventListener('click', function(){ track('call_click', {position: a.getAttribute('data-tel') || 'page'}); });
    } else {
      /* Pas de numéro : le bouton disparaît, rien de provisoire à l'écran. */
      a.hidden = true;
      var st = a.closest('.sticky'); if (st) st.classList.remove('sticky--2');
    }
  });

  /* ---------- paramètres de campagne ---------- */
  var PKEYS = ['gclid','gbraid','wbraid','gclsrc','gad_source','gad_campaignid',
               'fbclid','msclkid','ttclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'];
  var FENETRE = 90 * 24 * 3600 * 1000;
  var params = {}, premiereVisite = '';
  function gardes(store){
    try {
      var b = JSON.parse(store.getItem('mcp_params') || 'null');
      if (!b || !b.vu || Date.now() - new Date(b.vu).getTime() > FENETRE) return null;
      return b;
    } catch(e){ return null; }
  }
  function pubAcceptee(){
    try {
      if (window.IwlCmp && window.IwlCmp.getConsent) return !!window.IwlCmp.getConsent().ads;
      var m = document.cookie.match(/iwl_consent=([^;]*)/);
      return m ? !!JSON.parse(decodeURIComponent(m[1])).cat.ads : false;
    } catch(e){ return false; }
  }
  function quandPubAcceptee(cb){
    if (pubAcceptee()) { cb(); return; }
    var essais = 0, fait = false;
    var t = setInterval(function(){
      if (window.IwlCmp && window.IwlCmp.on){
        clearInterval(t);
        window.IwlCmp.on('consent', function(){ if (!fait && pubAcceptee()) { fait = true; cb(); } });
        if (!fait && pubAcceptee()) { fait = true; cb(); }
      } else if (++essais > 40) clearInterval(t);
    }, 250);
  }
  var memo = gardes(sessionStorage) || gardes(localStorage);
  if (memo) { params = memo.p || {}; premiereVisite = memo.vu; }
  var qs = new URLSearchParams(location.search);
  PKEYS.forEach(function(k){ var v = qs.get(k); if (v) params[k] = v; });
  if (Object.keys(params).length){
    if (!premiereVisite) premiereVisite = new Date().toISOString();
    quandPubAcceptee(function(){
      var paquet = JSON.stringify({p: params, vu: premiereVisite});
      try { sessionStorage.setItem('mcp_params', paquet); } catch(e){}
      try { localStorage.setItem('mcp_params', paquet); } catch(e){}
    });
  }

  /* ---------- liens vers le questionnaire + bouton collant ---------- */
  var quiz = document.getElementById('devis');
  var sticky = document.getElementById('sticky');
  function versQuiz(e){
    if (e) e.preventDefault();
    if (!quiz) return;
    track('cta_click', {position: (e && e.currentTarget && e.currentTarget.getAttribute('data-go')) || 'page'});
    quiz.scrollIntoView({behavior: 'smooth', block: 'start'});
    setTimeout(function(){ try { var q = quiz.querySelector('.step.is-active .step__q'); if (q) q.focus({preventScroll: true}); } catch(e){} }, 500);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function(a){ a.addEventListener('click', versQuiz); });
  if (quiz && sticky && 'IntersectionObserver' in window){
    new IntersectionObserver(function(en){ sticky.classList.toggle('is-on', !en[0].isIntersecting && !sent); }, {threshold: 0.1}).observe(quiz);
  }

  if (!form) return;

  /* ---------- questionnaire ---------- */
  var view = document.getElementById('q-view');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var segs = document.querySelectorAll('#q-segs i');
  var count = document.getElementById('q-count');
  var progres = document.getElementById('q-progres');
  var back = document.getElementById('q-back');
  var cur = 0, started = false, sent = false, cpCtrl = null;
  var state = {commune: '', departement: '', cpStatus: 'idle', consentAt: ''};
  function $(sel, root){ return (root || document).querySelector(sel); }
  function val(name){ var el = form.elements[name]; return el ? (el.value || '').trim() : ''; }
  function checked(name){ var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function setHeight(){ view.style.height = steps[cur].offsetHeight + 'px'; }
  function paint(){
    for (var i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i <= cur);
    back.hidden = cur === 0;
    var restant = steps.length - cur;
    count.textContent = cur === 0 ? '≈ 1 min' : (restant === 1 ? 'Dernière étape' : restant + ' étapes restantes');
    progres.textContent = 'Étape ' + (cur + 1) + ' sur ' + steps.length;
  }
  function go(i){
    if (i < 0 || i >= steps.length || i === cur) return;
    var old = steps[cur];
    old.classList.remove('is-active');
    cur = i;
    var st = steps[cur];
    st.classList.add('is-active');
    paint(); setHeight();
    try { st.querySelector('.step__q').focus({preventScroll: true}); } catch(e){}
    var r = quiz.getBoundingClientRect();
    if (r.top < 0) quiz.scrollIntoView({behavior: 'smooth', block: 'start'});
    track('quiz_step', {step_index: cur + 1, step_name: st.getAttribute('data-step')});
  }
  function note(id, msg, isErr){
    var n = document.getElementById(id); if (!n) return;
    n.textContent = msg || ''; n.classList.toggle('is-err', !!isErr); setHeight();
  }
  function bad(el, on){ if (!el) return; var f = el.closest('.field'); if (f) f.classList.toggle('is-bad', !!on); }
  var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{1,}$/;
  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function phoneDigits(v){
    var d = (v || '').replace(/[^\d+]/g, '');
    if (d.indexOf('+33') === 0) d = '0' + d.slice(3);
    else if (d.indexOf('0033') === 0) d = '0' + d.slice(4);
    d = d.replace(/\D/g, '');
    if (d.length === 9 && d[0] !== '0') d = '0' + d;
    return d;
  }
  function phoneOk(d){
    if (!/^0[1-9]\d{8}$/.test(d)) return false;
    if (/^0\d(\d)\1{7}$/.test(d)) return false;
    if (d === '0612345678' || d === '0123456789' || d === '0102030405') return false;
    return true;
  }
  function validate(){
    var st = steps[cur], key = st.getAttribute('data-step'), kind = st.getAttribute('data-kind') || 'radio';
    if (kind === 'radio') return !!checked(key);
    if (kind === 'cp'){
      var cp = val('code_postal');
      if (!/^\d{5}$/.test(cp)) { bad(form.elements.code_postal, true); note('q-cp-note', 'Indiquez les 5 chiffres de votre code postal.', true); return false; }
      if (state.cpStatus === 'none') { bad(form.elements.code_postal, true); note('q-cp-note', 'Ce code postal ne correspond à aucune commune. Vérifiez-le.', true); return false; }
      if (state.cpStatus === 'many' && !state.commune) { note('q-cp-note', 'Touchez votre commune dans la liste.', true); return false; }
      return true;
    }
    if (kind === 'identite'){
      var ok = true, msg = '';
      ['prenom', 'nom'].forEach(function(n){
        var good = NAME_RE.test(val(n)); bad(form.elements[n], !good);
        if (!good && ok) { msg = n === 'prenom' ? 'Indiquez votre prénom.' : 'Indiquez votre nom.'; ok = false; }
      });
      if (form.elements.email){
        var mailGood = MAIL_RE.test(val('email')); bad(form.elements.email, !mailGood);
        if (!mailGood && ok) { msg = 'Cette adresse email semble incomplète.'; ok = false; }
      }
      var telGood = phoneOk(phoneDigits(val('telephone'))); bad(form.elements.telephone, !telGood);
      if (!telGood && ok) { msg = 'Ce numéro ne semble pas valide. Il doit compter 10 chiffres.'; ok = false; }
      if (ok && !form.elements.consentement.checked) { $('#q-consent-box').classList.add('is-bad'); msg = 'Autorisez le contact pour qu’un conseiller puisse vous rappeler.'; ok = false; }
      if (!ok) note('q-id-note', msg, true);
      return ok;
    }
    return true;
  }
  /* Une réponse marquée data-bloque ferme le parcours : locataire pour une
     installation, logement récent pour les aides. Rien n'a encore été saisi
     comme coordonnée, donc rien n'est envoyé. */
  function bloquant(){
    var st = steps[cur];
    var inp = st.querySelector('input:checked');
    return inp ? (inp.getAttribute('data-bloque') || '') : '';
  }
  function quitte(raison){
    sent = true;
    track('quiz_non_eligible', {raison: raison});
    try { sessionStorage.setItem('mcp_non_eligible', JSON.stringify({raison: raison, thematique: THEME})); } catch(e){}
    setTimeout(function(){ location.href = CFG.merciNonEligible || '../merci-non-eligible/'; }, 300);
  }
  function next(){
    if (sent) return;
    if (!validate()) return;
    var b = bloquant();
    if (b) { quitte(b); return; }
    if (cur === steps.length - 1) { submit(); return; }
    go(cur + 1);
  }
  form.addEventListener('change', function(e){
    var t = e.target;
    if (t.type === 'radio'){
      if (!started) { started = true; track('quiz_start', {first_answer: t.value}); }
      var st = t.closest('.step');
      if (st === steps[cur] && (st.getAttribute('data-kind') || 'radio') === 'radio') setTimeout(next, 180);
    }
  });
  form.addEventListener('click', function(e){
    var b = e.target.closest('[data-next]'); if (b) { e.preventDefault(); next(); }
  });
  form.addEventListener('submit', function(e){ e.preventDefault(); next(); });
  form.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio'){ e.preventDefault(); next(); }
  });
  back.addEventListener('click', function(){ go(cur - 1); });

  /* ---------- saisie ---------- */
  form.addEventListener('input', function(e){
    var t = e.target;
    if (t.name === 'code_postal'){
      t.value = t.value.replace(/\D/g, '').slice(0, 5);
      bad(t, false); resetCP();
      if (t.value.length === 5) lookupCP(t.value);
    }
    if (t.name === 'telephone'){
      var d = phoneDigits(t.value).slice(0, 10);
      t.value = d.replace(/(\d{2})(?=\d)/g, '$1 ');
      bad(t, false); note('q-id-note', '');
    }
    if (t.name === 'prenom' || t.name === 'nom' || t.name === 'email'){ bad(t, false); note('q-id-note', ''); }
    if (t.name === 'email') suggestMail(t.value);
  });
  if (form.elements.consentement) form.elements.consentement.addEventListener('change', function(){
    $('#q-consent-box').classList.remove('is-bad'); note('q-id-note', '');
    if (this.checked && !state.consentAt) state.consentAt = new Date().toISOString();
  });
  var FIX = {'gmial.com':'gmail.com','gmal.com':'gmail.com','gmail.fr':'gmail.com','gmai.com':'gmail.com','gnail.com':'gmail.com','gmail.co':'gmail.com','hotmial.com':'hotmail.com','hotmal.fr':'hotmail.fr','yahou.fr':'yahoo.fr','yaho.fr':'yahoo.fr','orange.f':'orange.fr','ornage.fr':'orange.fr','wanado.fr':'wanadoo.fr','free.f':'free.fr','sfr.f':'sfr.fr','laposte.fr':'laposte.net','outlok.fr':'outlook.fr'};
  function suggestMail(v){
    var m = v.toLowerCase().match(/^([^@]+)@([^@]+)$/); if (!m) return;
    var fix = FIX[m[2]]; if (fix) note('q-id-note', 'Vouliez-vous dire ' + m[1] + '@' + fix + ' ?');
  }

  /* ---------- code postal → commune ---------- */
  function resetCP(){ state.cpStatus = 'idle'; state.commune = ''; state.departement = ''; var c = $('#q-communes'); if (c) c.innerHTML = ''; note('q-cp-note', ''); }
  function depFromCP(cp){ if (cp.indexOf('97') === 0) return cp.slice(0, 3); if (cp.indexOf('20') === 0) return parseInt(cp, 10) < 20200 ? '2A' : '2B'; return cp.slice(0, 2); }
  function lookupCP(cp){
    state.cpStatus = 'loading'; state.departement = depFromCP(cp);
    if (cpCtrl) cpCtrl.abort();
    cpCtrl = 'AbortController' in window ? new AbortController() : null;
    fetch('https://geo.api.gouv.fr/communes?codePostal=' + cp + '&fields=nom,codeDepartement,population&format=json', cpCtrl ? {signal: cpCtrl.signal} : {})
      .then(function(r){ return r.json(); })
      .then(function(list){
        if (val('code_postal') !== cp) return;
        var box = $('#q-communes'); box.innerHTML = '';
        if (!list.length) { state.cpStatus = 'none'; bad(form.elements.code_postal, true); note('q-cp-note', 'Ce code postal ne correspond à aucune commune. Vérifiez-le.', true); return; }
        list.sort(function(a, b){ return (b.population || 0) - (a.population || 0); });
        state.departement = list[0].codeDepartement || state.departement;
        if (list.length === 1) { state.cpStatus = 'one'; state.commune = list[0].nom; note('q-cp-note', list[0].nom + ' (' + state.departement + ')'); return; }
        state.cpStatus = 'many';
        list.forEach(function(c){
          var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c.nom; b.setAttribute('data-nom', c.nom);
          box.appendChild(b);
        });
        note('q-cp-note', 'Quelle commune ?');
        setHeight();
      })
      .catch(function(e){ if (e && e.name === 'AbortError') return; state.cpStatus = 'one'; state.commune = ''; note('q-cp-note', ''); });
  }
  var communes = $('#q-communes');
  if (communes) communes.addEventListener('click', function(e){
    var chip = e.target.closest('.chip'); if (!chip) return;
    Array.prototype.forEach.call(communes.querySelectorAll('.chip'), function(c){ c.classList.toggle('on', c === chip); });
    state.commune = chip.getAttribute('data-nom'); note('q-cp-note', '');
  });

  /* ---------- envoi ---------- */
  function reponses(){
    var r = {};
    steps.forEach(function(st){
      var key = st.getAttribute('data-step');
      if ((st.getAttribute('data-kind') || 'radio') === 'radio') r[key] = checked(key);
    });
    return r;
  }
  function priorite(r){
    if (typeof window.MCP_PRIORITE === 'function') { try { return window.MCP_PRIORITE(r); } catch(e){} }
    return 'tiède';
  }
  function submit(){
    var btn = document.getElementById('q-send');
    var label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Envoi en cours';
    var tel = phoneDigits(val('telephone'));
    var now = new Date().toISOString();
    var r = reponses();
    var data = {
      source: form.getAttribute('data-source') || 'LP MonChauffagistePrivé',
      thematique: THEME,
      priorite: priorite(r)
    };
    for (var k in r) data[k] = r[k];
    data.code_postal = val('code_postal');
    data.commune = state.commune;
    data.departement = state.departement;
    data.zone = (CFG.zone || []).indexOf(String(state.departement)) > -1 ? 'couverte' : 'hors zone';
    data.adresse = val('adresse');
    data.prenom = val('prenom');
    data.nom = val('nom');
    data.email = val('email').toLowerCase();
    data.telephone = tel;
    data.telephone_e164 = '+33' + tel.slice(1);
    data.consentement_contact = 'oui';
    data.consentement_texte = ($('#q-consent-text') ? $('#q-consent-text').textContent : '').replace(/\s+/g, ' ').trim();
    data.consentement_horodatage = state.consentAt || now;
    data.date_envoi = now;
    data.page_url = location.href;
    data.referrer = document.referrer;
    data.user_agent = navigator.userAgent;
    PKEYS.forEach(function(k){ data[k] = params[k] || ''; });
    data.premiere_visite = premiereVisite;
    var endpoint = form.getAttribute('data-endpoint') || CFG.endpoint || '';
    var spam = !!document.getElementById('f-hp').value;
    var demo = spam || !endpoint || endpoint.indexOf('REMPLACER') > -1;
    var req = demo
      ? new Promise(function(res){ setTimeout(function(){ res({ok: true}); }, 700); })
      : fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    req.then(function(resp){
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      if (demo && !spam) console.info('[MonChauffagistePrivé] webhook non configuré, envoi simulé :', data);
      if (!spam) track('generate_lead', {form_name: THEME, priorite: data.priorite, departement: data.departement, zone: data.zone, user_data: {email: data.email, phone_number: data.telephone_e164}});
      finish(data);
    }).catch(function(){
      btn.disabled = false; btn.innerHTML = label;
      note('q-id-note', 'L’envoi n’a pas abouti. Vérifiez votre connexion puis réessayez.', true);
    });
  }
  function finish(data){
    sent = true;
    if (sticky) sticky.classList.remove('is-on');
    var dansZone = data.zone === 'couverte';
    var leadId = 'MCP-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    try {
      sessionStorage.setItem('mcp_lead', JSON.stringify({
        id: leadId, thematique: THEME, prenom: data.prenom, email: data.email,
        telephone: data.telephone.replace(/(\d{2})(?=\d)/g, '$1 '), telephone_e164: data.telephone_e164,
        departement: data.departement, zone: data.zone, priorite: data.priorite, reponses: reponses()
      }));
    } catch(e){}
    setTimeout(function(){ location.href = dansZone ? (CFG.merci || '../merci/') : (CFG.merciHorsZone || '../merci-hors-zone/'); }, 350);
  }
  paint(); setHeight();
  window.addEventListener('resize', setHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeight);
})();
