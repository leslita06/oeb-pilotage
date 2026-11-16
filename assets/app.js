(function(){
'use strict';
var D, PER = '12', PROG = 'all', CLI = 'all', IMM = 'Immeuble A';
var MN = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
var MC = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
var DATA_START = '2024-11-01';
var charts = {};
var $ = function(id){ return document.getElementById(id); };
var R = '#E01020', O = '#F0A838', INK = '#1E1E24', G = '#86838C', G3 = '#F1EEE9';

function nb(x, d){ return Number(x).toLocaleString('fr-FR', {minimumFractionDigits:d||0, maximumFractionDigits:d||0}).replace(/\u202f|\u00a0/g, '\u00a0'); }
function fcfa(x, unit){
  var a = Math.abs(x), s;
  if (a >= 1e9) s = nb(x/1e9, 2) + '\u00a0Md';
  else if (a >= 1e6) s = nb(x/1e6, a >= 1e8 ? 0 : 1) + '\u00a0M';
  else if (a >= 1e3) s = nb(x/1e3, 0) + '\u00a0k';
  else s = nb(x, 0);
  return unit === false ? s : s + '\u00a0FCFA';
}
function big(x){ var s = fcfa(x, false).split('\u00a0'); return s[0] + (s[1] ? '<small>' + s[1] + ' FCFA</small>' : '<small>FCFA</small>'); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function dlong(s){ var d = s.split('-'); return (+d[2]) + (d[2] === '01' ? 'er' : '') + ' ' + MN[+d[1]-1] + ' ' + d[0]; }
function mcourt(m){ return MC[+m.slice(5,7)-1] + ' ' + m.slice(2,4); }
function days(a, b){ return Math.round((new Date(b) - new Date(a)) / 864e5); }
function addM(m, n){ var y = +m.slice(0,4), k = +m.slice(5,7) - 1 + n; y += Math.floor(k/12); k = ((k%12)+12)%12; return y + '-' + (k < 9 ? '0' : '') + (k+1); }
function pct(x, d){ return nb(x*100, d||0) + '\u00a0%'; }

/* ---------- périodes ---------- */
function period(shift){
  var A = D.arrete, m = A.slice(0,7), n;
  if (PER === 'm') n = 1; else if (PER === '3') n = 3; else if (PER === '12') n = 12;
  else n = +m.slice(5,7);
  var startM = addM(m, -(n-1)), end = A;
  if (shift) {
    if (PER === 'ytd') { startM = addM(startM, -12); end = (+A.slice(0,4)-1) + A.slice(4); }
    else { startM = addM(startM, -n); end = addM(m, -n) + A.slice(7); }
  }
  return {a: startM + '-01', b: end, n: n};
}
function perLabel(){ return {m:'ce mois-ci', '3':'sur 3 mois', '12':'sur 12 mois', ytd:'depuis janvier'}[PER]; }
function inP(d, p){ return d && d >= p.a && d <= p.b; }

/* ---------- filtres ---------- */
function keep(x){ return (PROG === 'all' || x.p === PROG) && (CLI === 'all' || String(x.d) === CLI); }
function dos(){ return D.dossiers.filter(keep); }

function overdue(x){
  var out = [];
  x.e.forEach(function(e){
    if (e[0] <= D.arrete && e[3] < e[1]) out.push({due:e[0], m:e[1]-e[3], j:days(e[0], D.arrete)});
  });
  return out;
}
function relance(j){ return j >= 30 ? 'J+30' : j >= 15 ? 'J+15' : j >= 3 ? 'J+3' : 'À échoir'; }

/* ---------- graphiques ---------- */
var baseOpts = function(){ return {
  responsive:true, maintainAspectRatio:false, animation:false,
  interaction:{mode:'index', intersect:false},
  plugins:{legend:{display:false}, tooltip:{backgroundColor:INK, titleFont:{family:'Inter', weight:'600'}, bodyFont:{family:'Inter'}, padding:10, cornerRadius:6,
    callbacks:{label:function(c){ return ' ' + c.dataset.label + ' : ' + (c.dataset.money ? fcfa(c.raw) : nb(c.raw)); }}}},
  scales:{
    x:{stacked:false, grid:{display:false}, ticks:{font:{family:'Inter', size:11}, color:G, maxRotation:0, autoSkip:true, autoSkipPadding:8}, border:{color:'#E8E4DE'}},
    y:{grid:{color:G3}, border:{display:false}, ticks:{font:{family:'Inter', size:11}, color:G, maxTicksLimit:5}}
  }
}; };
function draw(id, cfg){ if (charts[id]) charts[id].destroy(); charts[id] = new Chart($(id), cfg); }
function months12(){ var m = D.arrete.slice(0,7), out = []; for (var i = 11; i >= 0; i--) out.push(addM(m, -i)); return out; }

/* ---------- rendu ---------- */
function render(){
  var P = period(false), Q = period(true), L = dos();
  var sold = L.filter(function(x){ return x.s === 'Vendu' && inP(x.v, P); });
  var soldQ = L.filter(function(x){ return x.s === 'Vendu' && inP(x.v, Q); });
  var caV = sold.reduce(function(a,x){ return a + x.px; }, 0);
  var caQ = soldQ.reduce(function(a,x){ return a + x.px; }, 0);
  var hasQ = Q.a >= DATA_START;
  var enc = 0, att = 0, encQ = 0;
  L.forEach(function(x){ x.e.forEach(function(e){
    if (inP(e[2], P)) enc += e[3];
    if (inP(e[2], Q)) encQ += e[3];
    if (inP(e[0], P)) att += e[1];
  }); });
  var ret = [], retM = 0;
  L.forEach(function(x){ var o = overdue(x); if (!o.length) return; var m = o.reduce(function(a,y){ return a+y.m; },0), j = Math.max.apply(null, o.map(function(y){ return y.j; }));
    ret.push({x:x, m:m, j:j, n:o.length}); retM += m; });
  ret = ret.filter(function(r){ return r.j >= 3; }).concat(ret.filter(function(r){ return r.j < 3; }));
  var retDue = ret.filter(function(r){ return r.j >= 3; });
  var progs = D.progs.filter(function(p){ return PROG === 'all' || p.n === PROG; });
  var stock = progs.reduce(function(a,p){ return a + p.stock; }, 0);
  var all = D.dossiers.filter(function(x){ return PROG === 'all' || x.p === PROG; });
  var nV = all.filter(function(x){ return x.s === 'Vendu'; }).length, nR = all.filter(function(x){ return x.s === 'Réservé'; }).length;
  var resa = L.filter(function(x){ return x.s === 'Réservé'; });

  function dl(v, q){ if (!hasQ || !q) return '<span class="note">pas de période comparable</span>'; var d = (v/q - 1)*100; return '<span class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '\u2212') + nb(Math.abs(d), 0) + '\u00a0%</span> sur la période précédente'; }
  $('kpis').innerHTML =
    '<div class="kpi"><p class="l">Ventes signées ' + perLabel() + '</p><p class="v">' + big(caV) + '</p><p class="d">' + nb(sold.length) + ' lots et logements · ' + dl(caV, caQ) + '</p></div>' +
    '<div class="kpi"><p class="l">Encaissé auprès des acquéreurs</p><p class="v">' + big(enc) + '</p><p class="d">' + (att ? pct(Math.min(enc/att, 9.99)) + ' des échéances de la période · ' : '') + dl(enc, encQ) + '</p></div>' +
    '<div class="kpi"><p class="l">Échéances en retard, au jour</p><p class="v">' + big(retM) + '</p><p class="d">' + nb(retDue.length) + ' acquéreurs à relancer, dont ' + nb(retDue.filter(function(r){ return r.j >= 30; }).length) + ' à plus de 30 jours</p></div>' +
    '<div class="kpi gold"><p class="l">Stock écoulé</p><p class="v">' + nb(nV/stock*100, 0) + '<small>%</small></p><p class="d">' + nb(stock - nV - nR) + ' lots et logements disponibles, ' + nb(nR) + ' réservés</p></div>';

  var acd = L.filter(function(x){ return x.acd !== null && x.acd !== undefined; });
  var acdRemis = acd.filter(function(x){ return x.acd === 5; }).length;
  var lead = soldQ.length && hasQ ? (caV >= caQ ? 'en hausse' : 'en baisse') + ' par rapport à la période précédente' : '';
  $('phrase').innerHTML = '<b>' + nb(sold.length) + ' ventes signées ' + perLabel() + '</b> pour ' + fcfa(caV) + (lead ? ', ' + lead : '') + '. ' +
    (resa.length === 0 ? 'Aucune réservation en attente. ' : nb(resa.length) + (resa.length > 1 ? ' réservations attendent' : ' réservation attend') + ' la signature. ') +
    (retDue.length ? '<b>' + nb(retDue.length) + (retDue.length > 1 ? ' acquéreurs</b> sont en retard pour ' : ' acquéreur</b> est en retard pour ') + fcfa(retM) + '. ' : 'Aucun acquéreur en retard. ') +
    (acd.length ? nb(acd.length - acdRemis) + ' dossiers d\u2019ACD sont en cours, ' + nb(acdRemis) + ' ACD remis.' : '');

  /* 01 ventes */
  var ms = months12();
  var res = ms.map(function(m){ return L.filter(function(x){ return x.s === 'Vendu' && x.v.slice(0,7) === m && !x.d; }).length; });
  var dia = ms.map(function(m){ return L.filter(function(x){ return x.s === 'Vendu' && x.v.slice(0,7) === m && x.d; }).length; });
  var o = baseOpts(); o.scales.x.stacked = true; o.scales.y.stacked = true;
  draw('c-ventes', {type:'bar', data:{labels:ms.map(mcourt), datasets:[
    {label:'Résidents', data:res, backgroundColor:R, borderRadius:3, maxBarThickness:30},
    {label:'Diaspora', data:dia, backgroundColor:O, borderRadius:3, maxBarThickness:30}]}, options:o});

  var pays = {};
  sold.filter(function(x){ return x.d; }).forEach(function(x){ pays[x.pays] = (pays[x.pays]||0) + 1; });
  var pk = Object.keys(pays).sort(function(a,b){ return pays[b]-pays[a]; }).slice(0,7);
  var nd = sold.filter(function(x){ return x.d; }).length;
  $('n-pays').textContent = sold.length ? nb(nd/sold.length*100, 0) + '\u00a0% des ventes ' + perLabel() : '';
  $('pays').innerHTML = pk.length ? pk.map(function(k){ return '<div class="row"><span class="nm">' + esc(k) + '</span><span class="tr"><i class="o" style="width:' + (pays[k]/pays[pk[0]]*100) + '%"></i></span><span class="vv">' + nb(pays[k]) + '</span></div>'; }).join('')
    : '<p class="note">Aucune vente à la diaspora sur la période et les filtres choisis.</p>';

  var h = '<thead><tr><th>Programme</th><th>Localité</th><th class="n">Ventes</th><th class="n">Montant</th><th class="n">Prix moyen</th><th class="n">Diaspora</th><th class="n">Réservations en cours</th></tr></thead><tbody>';
  var tot = {n:0, m:0, d:0, r:0};
  progs.forEach(function(p){
    var s = sold.filter(function(x){ return x.p === p.n; }), m = s.reduce(function(a,x){ return a+x.px; },0), d = s.filter(function(x){ return x.d; }).length;
    var r = resa.filter(function(x){ return x.p === p.n; }).length;
    tot.n += s.length; tot.m += m; tot.d += d; tot.r += r;
    h += '<tr><td>' + esc(p.n) + '</td><td>' + esc(p.loc || 'À préciser') + '</td><td class="n">' + nb(s.length) + '</td><td class="n">' + (m ? fcfa(m) : '\u2014') + '</td><td class="n">' + (s.length ? fcfa(m/s.length) : '\u2014') + '</td><td class="n">' + (s.length ? nb(d/s.length*100,0) + '\u00a0%' : '\u2014') + '</td><td class="n">' + nb(r) + '</td></tr>';
  });
  h += '</tbody>';
  if (progs.length > 1) h += '<tfoot><tr><td>Total</td><td></td><td class="n">' + nb(tot.n) + '</td><td class="n">' + fcfa(tot.m) + '</td><td class="n">' + (tot.n ? fcfa(tot.m/tot.n) : '\u2014') + '</td><td class="n">' + (tot.n ? nb(tot.d/tot.n*100,0) + '\u00a0%' : '\u2014') + '</td><td class="n">' + nb(tot.r) + '</td></tr></tfoot>';
  $('t-prog').innerHTML = h;

  /* 02 stock */
  $('stock').innerHTML = progs.map(function(p){
    var a = D.dossiers.filter(function(x){ return x.p === p.n; });
    var v = a.filter(function(x){ return x.s === 'Vendu'; }).length, r = a.filter(function(x){ return x.s === 'Réservé'; }).length, dsp = p.stock - v - r;
    var sub = [p.loc, p.t === 'Appartement' ? 'appartements' : 'terrains', p.sup].filter(Boolean).join(' · ');
    return '<div class="row"><div class="nm"><b>' + esc(p.n) + '</b><span>' + esc(sub) + '</span></div>' +
      '<div class="st" title="' + v + ' vendus, ' + r + ' réservés, ' + dsp + ' disponibles"><i class="v" style="width:' + (v/p.stock*100) + '%"></i><i class="rs" style="width:' + (r/p.stock*100) + '%"></i></div>' +
      '<div class="pc"><b>' + nb(dsp) + '</b> dispo. sur ' + nb(p.stock) + '</div></div>';
  }).join('');

  /* 03 encaissements */
  var tauxRet = att ? enc/att : 0;
  var rest = 0; L.forEach(function(x){ if (x.s === 'Annulé') return; x.e.forEach(function(e){ rest += e[1] - e[3]; }); });
  $('enc-k').innerHTML =
    '<div class="mini"><p class="l">Échéances de la période</p><p class="v">' + fcfa(att, false) + '<small>FCFA</small></p><p class="d">apports et mensualités appelés ' + perLabel() + '</p></div>' +
    '<div class="mini"><p class="l">Encaissé sur ces échéances et les retards</p><p class="v">' + fcfa(enc, false) + '<small>FCFA</small></p><p class="d">' + pct(Math.min(tauxRet, 9.99)) + ' des échéances de la période</p></div>' +
    '<div class="mini"><p class="l">Restant dû par les acquéreurs</p><p class="v">' + fcfa(rest, false) + '<small>FCFA</small></p><p class="d">sur le prix des lots vendus et réservés, échu ou à échoir</p></div>';
  var ea = ms.map(function(m){ var s = 0; L.forEach(function(x){ x.e.forEach(function(e){ if (e[2] && e[2].slice(0,7) === m) s += e[3]; }); }); return s; });
  var aa = ms.map(function(m){ var s = 0; L.forEach(function(x){ x.e.forEach(function(e){ if (e[0].slice(0,7) === m) s += e[1]; }); }); return s; });
  var o2 = baseOpts(); o2.scales.y.ticks.callback = function(v){ return v ? fcfa(v, false) : '0'; };
  draw('c-enc', {type:'bar', data:{labels:ms.map(mcourt), datasets:[
    {label:'Encaissé', data:ea, money:true, backgroundColor:R, borderRadius:3, maxBarThickness:26, order:2},
    {label:'Attendu', data:aa, money:true, type:'line', borderColor:INK, borderDash:[5,4], borderWidth:2, pointRadius:0, tension:.25, order:1}]}, options:o2});
  var B = [[1,15,'1 à 15 jours'],[16,30,'16 à 30 jours'],[31,60,'31 à 60 jours'],[61,1e9,'Plus de 60 jours']];
  $('aged').innerHTML = B.map(function(b, i){
    var m = 0, n = 0;
    L.forEach(function(x){ overdue(x).forEach(function(y){ if (y.j >= b[0] && y.j <= b[1]) { m += y.m; n++; } }); });
    return '<div' + (i >= 2 ? ' class="h"' : '') + '><span>' + b[2] + '</span><b>' + fcfa(m, false) + '</b><em>' + nb(n) + ' échéance' + (n > 1 ? 's' : '') + '</em></div>';
  }).join('');
  var top = retDue.slice().sort(function(a,b){ return b.j - a.j || b.m - a.m; }).slice(0,8);
  $('t-ret').innerHTML = top.length ? '<thead><tr><th>Acquéreur</th><th class="n">En retard</th><th class="n">Jours</th><th>Relance</th></tr></thead><tbody>' +
    top.map(function(r){ var rl = relance(r.j); return '<tr><td><span class="who">' + esc(r.x.c) + (r.x.d ? ' <span class="pill o">' + esc(r.x.pays) + '</span>' : '') + '</span><span class="sub">' + esc(r.x.p) + ' · ' + esc(r.x.lot) + '</span></td><td class="n">' + fcfa(r.m) + '</td><td class="n">' + nb(r.j) + '</td><td><span class="pill' + (rl === 'J+30' ? ' r' : rl === 'J+15' ? ' o' : '') + '">' + rl + '</span></td></tr>'; }).join('') + '</tbody>'
    : '<tbody><tr><td>Aucune relance due pour ces filtres.</td></tr></tbody>';

  /* 04 dossiers fonciers */
  var et = D.etapes_acd, cnt = et.map(function(_, i){ return acd.filter(function(x){ return x.acd === i; }).length; }), mx = Math.max.apply(null, cnt.concat([1]));
  $('funnel').innerHTML = acd.length ? et.map(function(e, i){
    return '<div class="st' + (i >= 4 ? ' done' : '') + '"><span class="k">' + (i+1) + '</span><div class="bx"><p>' + esc(e) + '</p><div class="tr"><i style="width:' + (cnt[i]/mx*100) + '%"></i></div></div><span class="vv">' + nb(cnt[i]) + '</span></div>';
  }).join('') : '<p class="note">Pas de dossier d\u2019ACD pour ces filtres : les logements des Résidences Salomon suivent la vente en l\u2019état futur d\u2019achèvement.</p>';
  var pc = {};
  acd.forEach(function(x){ (x.pm||[]).forEach(function(p){ pc[p] = (pc[p]||0) + 1; }); });
  var pks = Object.keys(pc).sort(function(a,b){ return pc[b]-pc[a]; });
  $('pieces').innerHTML = pks.length ? pks.map(function(k){ return '<div class="row"><span class="nm">' + esc(k) + '</span><span class="tr"><i style="width:' + (pc[k]/pc[pks[0]]*100) + '%"></i></span><span class="vv">' + nb(pc[k]) + '</span></div>'; }).join('') : '<p class="note">Aucune pièce manquante.</p>';
  var guf = acd.filter(function(x){ return x.g && x.g > 90; }).sort(function(a,b){ return b.g - a.g; }).slice(0,6);
  $('t-guf').innerHTML = guf.length ? '<thead><tr><th>Lot</th><th>Acquéreur</th><th>Étape</th><th class="n">Jours</th></tr></thead><tbody>' +
    guf.map(function(x){ return '<tr><td>' + esc(x.lot) + '</td><td>' + esc(x.c) + '</td><td>' + esc(et[x.acd]) + '</td><td class="n">' + nb(x.g) + '</td></tr>'; }).join('') + '</tbody>'
    : '<tbody><tr><td>Aucun dossier au-delà de 90 jours.</td></tr></tbody>';

  /* 05 chantier */
  $('b-chantier').style.display = (PROG === 'all' || PROG === 'Les Résidences Salomon') ? '' : 'none';
  renderChantier();

  /* 06 gestion locative (indépendant des filtres) */
  renderLoyers();
}

function renderChantier(){
  function glob(i){ var r = 0, a = 0; D.chantier.forEach(function(c){ if (!i || c.i === i) { r += c.w*c.r; a += c.w*c.a; } }); var w = D.chantier.filter(function(c){ return !i || c.i === i; }).reduce(function(s,c){ return s+c.w; },0); return {r:r/w, a:a/w}; }
  var late = D.chantier.filter(function(c){ return c.a - c.r > 0.10; });
  var A = glob('Immeuble A'), Bb = glob('Immeuble B');
  function card(t, g){ var e = (g.r - g.a)*100; return '<div class="mini"><p class="l">' + t + '</p><p class="v">' + nb(g.r*100,0) + '<small>%</small></p><p class="d">attendu à date ' + nb(g.a*100,0) + '\u00a0% · <span class="' + (e >= -0.5 ? 'up' : 'down') + '">' + (e >= 0 ? '+' : '\u2212') + nb(Math.abs(e),0) + ' points</span></p></div>'; }
  $('ch-k').innerHTML = card('Immeuble A, avancement réel', A) + card('Immeuble B, avancement réel', Bb) +
    '<div class="mini"><p class="l">Lots de travaux en retard</p><p class="v">' + nb(late.length) + '</p><p class="d">écart de plus de 10 points avec le planning</p></div>';
  $('works').innerHTML = D.chantier.filter(function(c){ return c.i === IMM; }).map(function(c){
    return '<div class="row"><span class="nm">' + esc(c.l) + '</span><span class="tr"><i style="width:' + (c.r*100) + '%"></i><u style="left:' + (c.a*100) + '%"></u></span><span class="vv">' + nb(c.r*100,0) + '\u00a0%</span></div>';
  }).join('');
  $('late').innerHTML = late.length ? late.map(function(c){
    var dur = days(c.d0, c.d1), rj = Math.round((c.a - c.r) * dur);
    return '<li><div><b>' + esc(c.i) + ' · ' + esc(c.l) + '</b><span>réel ' + nb(c.r*100,0) + '\u00a0%, attendu ' + nb(c.a*100,0) + '\u00a0% · fin prévue le ' + dlong(c.d1) + '</span></div><em>' + nb(rj) + '\u00a0j de retard</em></li>';
  }).join('') : '<li>Aucun lot de travaux en retard.</li>';
}

function renderLoyers(){
  var M = D.mois_loyers, n = M.length - 1;
  var du = M.map(function(_, i){ return D.loyers.reduce(function(a,l){ return a + l.du[i]; }, 0); });
  var pa = M.map(function(_, i){ return D.loyers.reduce(function(a,l){ return a + l.pay[i]; }, 0); });
  var imp = D.loyers.map(function(l){ var d = 0, p = 0, k = 0; l.du.forEach(function(x, i){ d += x; p += l.pay[i]; if (l.pay[i] < x) k++; }); return {l:l, m:d-p, k:k}; }).filter(function(x){ return x.m > 0; });
  var impT = imp.reduce(function(a,x){ return a + x.m; }, 0);
  var open = D.interventions.filter(function(x){ return !x[4]; }).length;
  $('loc-k').innerHTML =
    '<div class="mini"><p class="l">Loyers et charges encaissés en ' + MN[+M[n].slice(5)-1] + '</p><p class="v">' + fcfa(pa[n], false) + '<small>FCFA</small></p><p class="d">' + pct(pa[n]/du[n]) + ' du quittancé · ' + nb(D.loyers.length) + ' baux gérés</p></div>' +
    '<div class="mini"><p class="l">Loyers impayés, au jour</p><p class="v">' + fcfa(impT, false) + '<small>FCFA</small></p><p class="d">' + nb(imp.length) + ' locataires en retard</p></div>' +
    '<div class="mini"><p class="l">Demandes d\u2019intervention ouvertes</p><p class="v">' + nb(open) + '</p><p class="d">sur ' + nb(D.interventions.length) + ' reçues depuis fin octobre</p></div>';
  var o = baseOpts(); o.scales.y.ticks.callback = function(v){ return v ? fcfa(v, false) : '0'; };
  draw('c-loy', {type:'bar', data:{labels:M.map(mcourt), datasets:[
    {label:'Encaissé', data:pa, money:true, backgroundColor:R, borderRadius:3, maxBarThickness:34, order:2},
    {label:'Dû', data:du, money:true, type:'line', borderColor:INK, borderDash:[5,4], borderWidth:2, pointRadius:0, order:1}]}, options:o});
  $('t-loy').innerHTML = '<thead><tr><th>Bail</th><th>Bien</th><th class="n">Impayé</th><th class="n">Mois</th></tr></thead><tbody>' +
    imp.sort(function(a,b){ return b.m - a.m; }).map(function(x){ return '<tr><td>' + esc(x.l.b) + '</td><td>' + esc(x.l.bien) + ', ' + esc(x.l.loc) + '</td><td class="n">' + fcfa(x.m) + '</td><td class="n">' + nb(x.k) + '</td></tr>'; }).join('') + '</tbody>';
}

function init(d){
  D = d;
  $('arrete').textContent = dlong(D.arrete);
  $('f-prog').innerHTML += D.progs.map(function(p){ return '<option>' + esc(p.n) + '</option>'; }).join('');
  $('f-per').addEventListener('change', function(){ PER = this.value; render(); });
  $('f-prog').addEventListener('change', function(){ PROG = this.value; render(); });
  $('f-cli').addEventListener('change', function(){ CLI = this.value; render(); });
  Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function(b){
    b.addEventListener('click', function(){
      IMM = b.getAttribute('data-i');
      Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function(x){ x.classList.toggle('on', x === b); });
      renderChantier();
    });
  });
  render();
}
fetch('data/donnees.json?v=20261117a').then(function(r){ return r.json(); }).then(init);
})();
