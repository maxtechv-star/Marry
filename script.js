// script.js - shared for index.html and wish.html
// Behaviors:
// - index page: create path-style link and fallback query link to wish.html
// - wish page: parse location.pathname (path-style) or search params (fallback), show personalized greeting, try autoplay audio

(function(){
  const page = document.body.getAttribute('data-page') || '';
  const DEFAULT = {
    groupName: "Electrical Elites",
    greeting: "Merry X‑mas and a very Happy New Year!",
    groupPhoto: "https://vero-upload.zone.id/files/1766608386819_tzmuom13j.png",
    audioUrl: "https://vero-upload.zone.id/files/1766607770700_9zr4ricgr1t.mp3",
    members: 35,
    defaultSender: "Uthuman"
  };

  // Utilities
  const id = (n)=>document.getElementById(n);
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function tryClipboardWrite(text){ return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(); }

  // Parse path-style: /.../wish.html/SENDER/RECIPIENT
  function parsePathStyle(){
    const p = location.pathname || '';
    // Find '/wish.html' in path
    const idx = p.indexOf('/wish.html');
    if(idx === -1) return null;
    const after = p.slice(idx + '/wish.html'.length); // may be like '/Sender/Recipient' or ''
    if(!after || after === '/') return null;
    const parts = after.split('/').filter(Boolean).map(decodeURIComponent);
    if(parts.length >= 2){
      return { sender: parts[0], recipient: parts[1] };
    }
    return null;
  }

  // Parse query-style: ?sender=...&recipient=...
  function parseQueryStyle(){
    const sp = new URLSearchParams(location.search);
    const s = sp.get('sender');
    const r = sp.get('recipient');
    if(r) return { sender: s, recipient: r };
    return null;
  }

  // Fallback: parse hash if base64 encoded JSON or simple 'sender/recipient'
  function parseHashFallback(){
    const h = location.hash ? location.hash.slice(1) : '';
    if(!h) return null;
    // try to detect btoa(encoded JSON)
    try{
      const decoded = decodeURIComponent(atob(h));
      const obj = JSON.parse(decoded);
      return { sender: obj.sender, recipient: obj.recipient };
    }catch(e){}
    // try slash pattern in hash
    const parts = h.split('/').filter(Boolean);
    if(parts.length >= 2) return { sender: decodeURIComponent(parts[0]), recipient: decodeURIComponent(parts[1]) };
    return null;
  }

  // Build links helper
  function buildLinks(sender, recipient){
    const orig = location.origin;
    // base path directory where index.html lives (preserve if in subfolder)
    const basePath = location.pathname.replace(/\/?index\.html$|\/?$/, '/').replace(/\/$/, '/');
    // Path-style link: wish.html/SENDER/RECIPIENT
    const pathLink = `${orig}${basePath}wish.html/${encodeURIComponent(sender)}/${encodeURIComponent(recipient)}`;
    // Fallback query link
    const queryLink = `${orig}${basePath}wish.html?sender=${encodeURIComponent(sender)}&recipient=${encodeURIComponent(recipient)}`;
    // Hash (base64) link
    const json = JSON.stringify({ sender, recipient, groupName: DEFAULT.groupName, greeting: DEFAULT.greeting });
    const hashLink = `${orig}${basePath}wish.html#${btoa(encodeURIComponent(json))}`;
    return { pathLink, queryLink, hashLink };
  }

  // Confetti (short)
  function launchConfettiShort(){
    const canvas = id('confetti-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const pieces = [];
    const colors = ['#ff4757','#ff922b','#ffd43b','#2ed573','#3b82f6','#7c3aed'];
    for(let i=0;i<80;i++){
      pieces.push({
        x: Math.random()*W,
        y: Math.random()*H - H,
        r: (Math.random()*8)+4,
        d: (Math.random()*40)+10,
        color: colors[Math.floor(Math.random()*colors.length)],
        tiltAngleIncrement: (Math.random()*0.07)+0.05,
        tiltAngle: 0
      });
    }
    let run = true;
    function update(){
      ctx.clearRect(0,0,W,H);
      for(let i=0;i<pieces.length;i++){
        const p = pieces[i];
        p.tiltAngle += p.tiltAngleIncrement;
        p.y += (Math.cos(p.d) + 3 + p.r/2)/2;
        p.x += Math.sin(0.01 * p.d);
        const tilt = Math.sin(p.tiltAngle - (i/3)) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + tilt + p.r/2, p.y);
        ctx.lineTo(p.x + tilt, p.y + tilt + p.r/2);
        ctx.stroke();

        if(p.y > H + 20) {
          p.y = -10;
          p.x = Math.random()*W;
        }
      }
    }
    function loop(){ if(!run) return; update(); requestAnimationFrame(loop); }
    loop();
    setTimeout(()=>{ run = false; ctx.clearRect(0,0,W,H); }, 5500);
    window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
  }

  // PAGE: index.html
  function initIndex(){
    const recipientInput = id('recipient-name');
    const senderInput = id('sender-name');
    const createBtn = id('create-wish-btn');
    const copyBtn = id('copy-link-btn');
    const copyFallbackBtn = id('copy-fallback-btn');
    const openBtn = id('open-link-btn');
    const linkOutput = id('link-output');
    const previewBox = id('preview-box');
    const previewTitle = id('preview-title');
    const previewGreeting = id('preview-greeting');
    const greetingTextEl = id('greeting-text');
    const groupNameEl = id('group-name');
    const memberCountEl = id('member-count');

    // Init defaults
    groupNameEl.value = DEFAULT.groupName;
    memberCountEl.value = `${DEFAULT.members} members`;
    greetingTextEl.value = DEFAULT.greeting;
    senderInput.value = DEFAULT.defaultSender;

    function updatePreview(){
      const rec = recipientInput.value.trim() || 'Recipient';
      const send = senderInput.value.trim() || DEFAULT.groupName;
      previewTitle.textContent = groupNameEl.value || DEFAULT.groupName;
      // append sender unless greeting already contains "from"
      const greetingRaw = greetingTextEl.value || DEFAULT.greeting;
      const containsFrom = /(^|\s)from\s+/i.test(greetingRaw);
      const displayGreeting = containsFrom ? greetingRaw : (greetingRaw + ' — From ' + (senderInput.value.trim() || DEFAULT.groupName));
      previewGreeting.textContent = `Dear ${rec}\n${displayGreeting}`;
      previewBox.classList.remove('hidden');
    }

    // handle Enter key to create link
    [recipientInput, senderInput].forEach(inp=>{
      inp.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          createBtn.click();
        }
      });
    });

    createBtn.addEventListener('click', ()=>{
      const recipient = (recipientInput.value || '').trim();
      const sender = (senderInput.value || '').trim() || DEFAULT.defaultSender;
      if(!recipient){
        alert('Please enter the recipient name.');
        recipientInput.focus();
        return;
      }
      const links = buildLinks(sender, recipient);
      // show links
      linkOutput.classList.remove('hidden');
      linkOutput.innerHTML = `<strong>Path link:</strong><br><a href="${links.pathLink}" target="_blank">${links.pathLink}</a><br><strong>Fallback (query) link:</strong><br><a href="${links.queryLink}" target="_blank">${links.queryLink}</a>`;
      // copy default (path) to clipboard if possible
      tryClipboardWrite(links.pathLink).then(()=>{
        alert('Path-style link copied to clipboard!');
      }).catch(()=>{
        // fallback: copy query
        tryClipboardWrite(links.queryLink).then(()=> alert('Fallback link copied to clipboard!')).catch(()=> { /* ignore */ });
      });
      // update preview with current values
      updatePreview();
    });

    copyBtn.addEventListener('click', ()=>{
      const recipient = (recipientInput.value || '').trim();
      const sender = (senderInput.value || '').trim() || DEFAULT.defaultSender;
      if(!recipient){ alert('Enter recipient first'); return; }
      const links = buildLinks(sender, recipient);
      tryClipboardWrite(links.pathLink).then(()=> alert('Path-style link copied to clipboard!')).catch(()=> alert('Unable to copy automatically — use the fallback link shown below or copy manually: ' + links.pathLink));
    });

    copyFallbackBtn.addEventListener('click', ()=>{
      const recipient = (recipientInput.value || '').trim();
      const sender = (senderInput.value || '').trim() || DEFAULT.defaultSender;
      if(!recipient){ alert('Enter recipient first'); return; }
      const links = buildLinks(sender, recipient);
      tryClipboardWrite(links.queryLink).then(()=> alert('Fallback link copied to clipboard!')).catch(()=> alert('Unable to copy automatically — copy manually: ' + links.queryLink));
    });

    openBtn.addEventListener('click', ()=>{
      const recipient = (recipientInput.value || '').trim();
      const sender = (senderInput.value || '').trim() || DEFAULT.defaultSender;
      if(!recipient){ alert('Enter recipient first'); return; }
      const links = buildLinks(sender, recipient);
      window.open(links.pathLink, '_blank');
    });

    id('celebrate-btn').addEventListener('click', ()=>{
      // Use audio element to play a short sound and show confetti (if allowed)
      const audio = id('audio');
      audio.src = DEFAULT.audioUrl;
      audio.play().then(()=> launchConfettiShort()).catch(()=> alert('Autoplay blocked — interact (tap) to allow audio.'));
    });

    // live preview update
    [recipientInput, senderInput, greetingTextEl, groupNameEl].forEach(inp=>{
      inp.addEventListener('input', updatePreview);
    });

    // initial preview
    updatePreview();
  }

  // PAGE: wish.html
  function initWish(){
    const groupPhotoEl = id('group-photo');
    const wishTitle = id('wish-title');
    const wishGreeting = id('wish-greeting');
    const playBtn = id('play-btn');
    const audio = id('audio');

    // Determine sender/recipient from path, query, or hash
    let parsed = parsePathStyle() || parseQueryStyle() || parseHashFallback();
    // Ensure defaults
    const sender = (parsed && parsed.sender) ? parsed.sender : DEFAULT.defaultSender;
    const recipient = (parsed && parsed.recipient) ? parsed.recipient : null;

    // If no recipient provided, show friendly message
    if(!recipient){
      wishTitle.textContent = DEFAULT.groupName;
      wishGreeting.textContent = DEFAULT.greeting + ' — From ' + DEFAULT.defaultSender;
      playBtn.style.display = 'inline-block';
      playBtn.addEventListener('click', ()=> {
        audio.src = DEFAULT.audioUrl;
        audio.play().then(()=> launchConfettiShort()).catch(()=> alert('Tap the page to play audio.'));
      });
      return;
    }

    // Render content
    wishTitle.textContent = DEFAULT.groupName;
    // Greeting logic: if greeting contains "from" don't append sender
    const greetingRaw = DEFAULT.greeting;
    const containsFrom = /(^|\s)from\s+/i.test(greetingRaw);
    let displayGreeting = greetingRaw;
    if(!containsFrom){
      displayGreeting = greetingRaw + ' — From ' + (sender || DEFAULT.defaultSender);
    }

    wishGreeting.innerHTML = `<strong>Dear ${escapeHtml(recipient)}</strong><br>${escapeHtml(displayGreeting)}`;
    groupPhotoEl.src = DEFAULT.groupPhoto;

    // Set audio src (already set in HTML), try autoplay
    tryPlayAudio();

    function tryPlayAudio(){
      playBtn.style.display = 'none';
      audio.src = DEFAULT.audioUrl;
      audio.play().then(()=> {
        launchConfettiShort();
      }).catch(()=> {
        // autoplay blocked
        playBtn.style.display = 'inline-block';
      });
    }

    playBtn.addEventListener('click', ()=>{
      audio.play().then(()=> { playBtn.style.display = 'none'; launchConfettiShort(); }).catch(()=> {
        alert('Playback failed — please tap to allow audio.');
      });
    });
  }

  // Entrypoint
  if(page === 'index') initIndex();
  if(page === 'wish') initWish();

})();