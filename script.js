async function getPairCode() {
  const res = await fetch('/generate');
  const data = await res.json();
  const codeElem = document.getElementById('code');
  if (data.success) {
    codeElem.innerText = data.pairingCode;
  } else {
    codeElem.innerText = "Waiting for code...";
  }
}

getPairCode();
setInterval(getPairCode, 5000); // auto-refresh every 5 sec
