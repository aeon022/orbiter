// Orbiter Analytics — <1KB, no cookies, no fingerprinting
(function(){
  if (navigator.doNotTrack === '1') return;
  var d = document, l = location;
  var r = d.referrer && new URL(d.referrer).host !== l.host ? d.referrer : '';
  var q = '?p=' + encodeURIComponent(l.pathname) + '&r=' + encodeURIComponent(r) + '&w=' + screen.width;
  var u = (d.currentScript && d.currentScript.dataset.api) || '/api/hit';
  if (navigator.sendBeacon) {
    navigator.sendBeacon(u + q);
  } else {
    new Image().src = u + q;
  }
})();
