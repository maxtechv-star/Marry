// Personalized wish page with optional Sender name.
// Recipient + optional Sender are encoded into the URL hash so the recipient sees a personalized wish.
// Logic:
// - If greeting contains a "from" phrase (case-insensitive), use greeting as-is.
// - Else, append " — From {Sender}" if sender provided, otherwise " — From {GroupName}".
(function(){
  const id = n => document.getElementById(n);

  const DEFAULT = {
    groupName: "Electrical Elites",
    greeting: "Merry X‑mas and a very Happy New Year!",
    groupPhoto: "https://vero-upload.zone.id/files/1766608386819_tzmuom13j.png",
    audioUrl: "https://vero-upload.zone.id/files/1766607770700_9zr4ricgr1t.mp3"
  };

  // Hash encode/decode helper (base64 of encodeURIComponent(JSON))
  function stateFromHash(){
    try{
      const h = location.hash.slice(1);
      if(!h) return null;
      return JSON.parse(decodeURIComponent(atob(h)));
    }catch(e){
      return null;
    }
  }
  function setStateToHash(state){
    const s = btoa(encodeURIComponent(JSON.stringify(state)));
    location.hash = s;
  }

  // Elements
  const groupNameEl = id('group-name');
  const memberCountEl = id('member-count');
  const greetingTextEl = id('greeting-text');
  const recipientInput = id('recipient-name');
  const senderInput = id('sender-name');
  const createBtn = id('create-wish-btn');
  const copyBtn = id('copy-link-btn');
  const openBtn = id('open-link-btn');
  const wishView = id('wish-view');
  const wishTitle = id('wish-title');
  const wishGreeting = id('wish-greeting');
  const playBtn = id('play-btn');
  const audio = id('audio');
  const confettiCanvas = id('confetti-canvas');

  // Start with defaults, then merge hash or localStorage
  let state = Object.assign({}, DEFAULT,
    JSON.parse(localStorage.getItem('holiday-state') || '{}')
  );
  const hashState = stateFromHash();
  if(hashState) {
    state = Object.assign({}, state, hashState);
  }

  // Apply into inputs
  function applyToInputs(){
    groupNameEl.value = state.groupName || DEFAULT.groupName;
    greetingTextEl.value = state.greeting || DEFAULT.greeting;
    senderInput.value = state.sender || "";
    memberCountEl.value = state.members ? (state.members.length + " members") : "0 members";
    audio.src = state.audioUrl || DEFAULT.audioUrl;
    id('group-photo').src = state.groupPhoto || DEFAULT.groupPhoto;
  }
  applyToInputs();

  // Save local settings (group defaults)
  function saveLocal(){
    localStorage.setItem('holiday-state', JSON.stringify({
      groupName: groupNameEl.value,
      greeting: greetingTextEl.value,
      groupPhoto: id('group-photo').src,
      audioUrl: audio.src,
      sender: senderInput.value || ""
    }));
  }

  // Create personalized link (recipient + optional sender)
  createBtn.addEventListener('click', async ()=>{
    const recipient = recipientInput.value.trim();
    const sender = senderInput.value.trim();
    if(!recipient){
      alert('Please enter a recipient name.');
      return;
    }
    const s = {
      groupName: groupNameEl.value || DEFAULT.groupName,
      greeting: greetingTextEl.value || DEFAULT.greeting,
      groupPhoto: id('group-photo').src || DEFAULT.groupPhoto,
      audioUrl: audio.src || DEFAULT.audioUrl,
      recipient: recipient,
      sender: sender || undefined
    };
    setStateToHash(s);
    try{
      await navigator.clipboard.writeText(location.href);
      alert('Personalized link copied to clipboard! Share it with ' + recipient + '.');
    }catch(e){
      prompt('Copy this link:', location.href);
    }
    saveLocal();
  });

  // Copy current link (no recipient included)
  copyBtn.addEventListener('click', async ()=>{
    const s = {
      groupName: groupNameEl.value,
      greeting: greetingTextEl.value,
      groupPhoto: id('group-photo').src,
      audioUrl: audio.src
    };
    setStateToHash(s);
    try{
      await navigator.clipboard.writeText(location.href);
      alert('Link copied to clipboard!');
    }catch(e){
      prompt('Copy this link:', location.href);
    }
    saveLocal();
  });

  // Open wish (preview) in new tab with current recipient/sender if any
  openBtn.addEventListener('click', ()=>{
    const recipient = recipientInput.value.trim();
    const sender = senderInput.value.trim();
    const s = {
      groupName: groupNameEl.value,
      greeting: greetingTextEl.value,
      groupPhoto: id('group-photo').src,
      audioUrl: audio.src,
      recipient: recipient || undefined,
      sender: sender || undefined
    };
    const h = btoa(encodeURIComponent(JSON.stringify(s)));
    const url = location.origin + location.pathname + '#' + h;
    window.open(url, '_blank');
  });

  // When page loads with a state that includes recipient, show wish and attempt to play audio
  function renderWishIfRecipient(){
    const hs = stateFromHash();
    if(hs && hs.recipient){
      applyToInputs();
      wishView.classList.remove('hidden');
      wishTitle.textContent = hs.groupName || DEFAULT.groupName;

      // Determine final displayed greeting:
      const greetingRaw = hs.greeting || DEFAULT.greeting;
      const containsFrom = /(^|\s)from\s+/i.test(greetingRaw);
      let displayGreeting = greetingRaw;

      if(!containsFrom){
        if(hs.sender && String(hs.sender).trim().length){
          displayGreeting = greetingRaw + ' — From ' + hs.sender.trim();
        } else {
          displayGreeting = greetingRaw + ' — From ' + (hs.groupName || DEFAULT.groupName);
        }
      }

      wishGreeting.innerHTML = `<strong>Dear ${escapeHtml(hs.recipient)}</strong><br>${escapeHtml(displayGreeting)}`;

      if(hs.audioUrl) audio.src = hs.audioUrl;
      tryPlayAudio();
    } else {
      wishView.classList.add('hidden');
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
  }

  // Attempt to play, if blocked show play button
  async function tryPlayAudio(){
    playBtn.style.display = 'none';
    try{
      await audio.play();
      launchConfettiShort();
    }catch(err){
      playBtn.style.display = 'inline-block';
    }
  }

  playBtn.addEventListener('click', async ()=>{
    try{
      await audio.play();
      playBtn.style.display = 'none';
      launchConfettiShort();
    }catch(e){
      alert('Playback failed — please check your browser or tap to allow audio.');
    }
  });

  // Celebrate button triggers confetti and audio attempt
  id('celebrate-btn').addEventListener('click', ()=>{
    tryPlayAudio();
  });

  // Save edits on blur
  [groupNameEl, greetingTextEl, senderInput].forEach(inp=>{
    inp.addEventListener('blur', saveLocal);
  });

  // On hash change update state and render
  window.addEventListener('hashchange', ()=>{
    const hs = stateFromHash();
    if(hs) state = Object.assign({}, state, hs);
    applyToInputs();
    renderWishIfRecipient();
  });

  // Initial render
  renderWishIfRecipient();

  // Small confetti implementation (short burst)
  function launchConfettiShort(){
    const canvas = confettiCanvas;
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
        tilt: Math.floor(Math.random()*10)-10,
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
        p.tilt = Math.sin(p.tiltAngle - (i/3)) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r/2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r/2);
        ctx.stroke();

        if(p.y > H + 20) {
          p.y = -10;
          p.x = Math.random()*W;
        }
      }
    }
    function loop(){
      if(!run) return;
      update();
      requestAnimationFrame(loop);
    }
    loop();
    setTimeout(()=>{ run = false; ctx.clearRect(0,0,W,H); }, 5500);
    window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
  }

})();