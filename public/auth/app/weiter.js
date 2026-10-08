// Sprache wählen und die Antwort des Servers (ticket, serverId oder error) an taleward://auth weiterreichen
(function () {
  var en = !/^de\b/i.test(navigator.language || 'de');
  if (en) {
    document.documentElement.lang = 'en';
    document.querySelectorAll('[data-en]').forEach(function (el) { el.textContent = el.getAttribute('data-en'); });
    document.title = 'Taleward – Sign in';
  }
  var params = new URLSearchParams(location.search);
  var keep = new URLSearchParams();
  ['ticket', 'serverId', 'error'].forEach(function (k) { var v = params.get(k); if (v) keep.set(k, v); });
  document.getElementById('weiter').setAttribute('href', 'taleward://auth?' + keep.toString());
  // Ticket nicht in der Adresszeile oder im Verlauf stehen lassen
  history.replaceState(null, '', location.pathname);
})();
