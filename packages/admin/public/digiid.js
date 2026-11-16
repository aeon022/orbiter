// Digi-ID helper for the login and account pages: draws the QR code and polls until the wallet has signed.
window.orbDigiid = {
  // box: element to draw into. ch: { nonce, poll, uri }. done(status, data) is called once: 'ok' | 'unknown' | 'taken' | 'expired'
  show: function (box, ch, done) {
    var qr = window.qrcode(0, 'M'); qr.addData(ch.uri); qr.make();
    box.innerHTML = '';
    var img = document.createElement('div'); img.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    img.style.cssText = 'width:200px;height:200px;background:#fff;border-radius:8px;padding:6px;margin:0 auto';
    box.appendChild(img);
    var a = document.createElement('a'); a.href = ch.uri; a.textContent = 'Open in wallet'; a.style.cssText = 'display:block;text-align:center;margin-top:8px;font-size:12px';
    box.appendChild(a);
    var stop = false, tries = 0;
    (function poll() {
      if (stop) return;
      if (++tries > 150) { box.textContent = ''; return done('expired'); }
      fetch('/api/digiid/status?nonce=' + encodeURIComponent(ch.nonce) + '&poll=' + encodeURIComponent(ch.poll), { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.status === 'pending') return setTimeout(poll, 2000);
          stop = true; box.textContent = ''; done(j.status, j);
        }).catch(function () { setTimeout(poll, 3000); });
    })();
    return function () { stop = true; };
  }
};
