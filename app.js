/* The Kartaal Challenge – Main JS */
(function () {
  "use strict";

  /* ================================================================
   * Utility Helpers
   * ==============================================================*/
  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (
      c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16));
  }
  const todayISO = () => new Date().toISOString().split("T")[0];
  const yesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };
  const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  async function sha256(msg) {
    const data = new TextEncoder().encode(msg);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ================================================================
   * In-Memory Store (no persistence per strict instructions)
   * ==============================================================*/
  const store = {
    users: [],
    challenges: [],
    currentUser: null,
  };
  let lastChallengeId = null; // for back navigation from calendar

  /* ================================================================
   * Routing
   * ==============================================================*/
  const navigate = (hash) => {
    if (!hash.startsWith("#")) hash = `#${hash}`;
    window.location.hash = hash;
  };

  function handleRoute() {
    const hash = window.location.hash || "#login";
    $all(".page").forEach((p) => p.classList.remove("active"));

    const protectedRoutes = ["#home", "#challenge", "#calendar"];
    const isProtected = protectedRoutes.some((r) => hash.startsWith(r));
    if (isProtected && !store.currentUser) {
      navigate("#login");
      return;
    }

    if (hash === "#login") {
      showLogin();
    } else if (hash === "#signup") {
      showSignup();
    } else if (hash === "#home") {
      showHome();
    } else if (hash.startsWith("#challenge/")) {
      const id = hash.split("/")[1];
      showChallenge(id);
    } else if (hash.startsWith("#calendar/")) {
      const [, cid, user] = hash.split("/");
      showCalendar(cid, user);
    } else {
      navigate("#login");
    }
  }
  window.addEventListener("hashchange", handleRoute);

  /* ================================================================
   * AUTHENTICATION
   * ==============================================================*/
  function showLogin() {
    $("#auth-page").classList.add("active");
    $("#login-section").classList.remove("hidden");
    $("#signup-section").classList.add("hidden");
  }
  function showSignup() {
    $("#auth-page").classList.add("active");
    $("#signup-section").classList.remove("hidden");
    $("#login-section").classList.add("hidden");
  }

  async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.classList.add("loading");
    const username = $("#signup-username").value.trim();
    const password = $("#signup-password").value;
    if (store.users.some((u) => u.username === username)) {
      alert("Username already exists");
      btn.classList.remove("loading");
      return;
    }
    const hash = await sha256(password);
    store.users.push({ username, passwordHash: hash });
    store.currentUser = username;
    btn.classList.remove("loading");
    navigate("#home");
  }

  async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.classList.add("loading");
    const username = $("#login-username").value.trim();
    const password = $("#login-password").value;
    const user = store.users.find((u) => u.username === username);
    if (!user) {
      alert("User not found");
      btn.classList.remove("loading");
      return;
    }
    const hash = await sha256(password);
    if (hash !== user.passwordHash) {
      alert("Incorrect password");
      btn.classList.remove("loading");
      return;
    }
    store.currentUser = username;
    btn.classList.remove("loading");
    navigate("#home");
  }
  const logout = () => {
    store.currentUser = null;
    navigate("#login");
  };

  /* ================================================================
   * HOME
   * ==============================================================*/
  function showHome() {
    $("#home-page").classList.add("active");
    renderChallenges();
  }
  function renderChallenges() {
    const cont = $("#challenges-container");
    cont.innerHTML = "";
    if (store.challenges.length === 0) {
      $("#no-challenges").classList.remove("hidden");
      return;
    }
    $("#no-challenges").classList.add("hidden");
    store.challenges.forEach((c) => {
      const card = document.createElement("div");
      card.className = "challenge-card fade-in";
      card.innerHTML = `
        <h3>${c.name}</h3>
        <div class="challenge-meta">
          <span>${formatDate(c.createdDate)}</span>
          <span>${c.participants.length} participant${c.participants.length!==1?"s":""}</span>
        </div>`;
      card.addEventListener("click", () => navigate(`#challenge/${c.id}`));
      cont.appendChild(card);
    });
  }
  function handleCreateChallenge(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.classList.add("loading");
    const name = $("#habit-name").value.trim();
    if (!name) {
      alert("Habit name required");
      btn.classList.remove("loading");
      return;
    }
    store.challenges.push({ id: uuidv4(), name, createdDate: todayISO(), participants: [] });
    e.target.reset();
    btn.classList.remove("loading");
    renderChallenges();
  }

  /* ================================================================
   * CHALLENGE DETAIL
   * ==============================================================*/
  function showChallenge(id) {
    const ch = store.challenges.find((c) => c.id === id);
    if (!ch) { navigate("#home"); return; }
    lastChallengeId = id;
    $("#challenge-page").classList.add("active");
    renderChallengeDetail(ch);
  }
  function renderChallengeDetail(ch) {
    const cont = $("#challenge-detail");
    cont.innerHTML = "";
    const info = document.createElement("section");
    info.className = "challenge-info";
    info.innerHTML = `<h2>${ch.name}</h2><p>Created: ${formatDate(ch.createdDate)}</p><p>${ch.participants.length} participant${ch.participants.length!==1?"s":""}</p>`;
    cont.appendChild(info);

    const me = ch.participants.find((p) => p.username === store.currentUser);
    if (!me) {
      const join = document.createElement("section");
      join.className = "join-section";
      join.innerHTML = `<h3>Join this challenge</h3><button class="btn btn--primary" id="join-btn">Join Now</button>`;
      cont.appendChild(join);
      $("#join-btn").addEventListener("click", () => {
        ch.participants.push({ username: store.currentUser, checkIns: [], currentStreak: 0, totalCheckIns: 0 });
        renderChallengeDetail(ch);
      });
      return;
    }

    // Actions
    const actions = document.createElement("section");
    actions.className = "challenge-actions";
    actions.innerHTML = `
      <h3>Daily Check-in</h3>
      <div class="checkin-section">
        <div class="form-group">
          <label class="form-label" for="checkin-date">Select date</label>
          <input type="date" id="checkin-date" class="form-control" max="${todayISO()}" min="${yesterdayISO()}" value="${todayISO()}">
        </div>
        <button class="btn checkin-btn mt-8" id="check-btn">Check-in</button>
        <button class="btn undo-btn hidden" id="undo-btn">Undo Check-in</button>
      </div>`;
    cont.appendChild(actions);

    const dateEl = $("#checkin-date");
    const checkBtn = $("#check-btn");
    const undoBtn = $("#undo-btn");
    const updateButtons = () => {
      const sel = dateEl.value;
      const has = me.checkIns.includes(sel);
      if (has) { checkBtn.classList.add("hidden"); undoBtn.classList.remove("hidden"); }
      else { undoBtn.classList.add("hidden"); checkBtn.classList.remove("hidden"); }
    };
    dateEl.addEventListener("change", updateButtons);
    checkBtn.addEventListener("click", () => { addCheck(me, ch, dateEl.value); updateButtons(); renderLeaderboard(ch); });
    undoBtn.addEventListener("click", () => { removeCheck(me, ch, dateEl.value); updateButtons(); renderLeaderboard(ch); });
    updateButtons();
    renderLeaderboard(ch);
  }
  function addCheck(p, ch, date) { if (!p.checkIns.includes(date)) { p.checkIns.push(date); p.checkIns.sort(); calcStats(p, ch); } }
  function removeCheck(p, ch, date) { p.checkIns = p.checkIns.filter((d) => d !== date); calcStats(p, ch); }
  function calcStats(p, ch) {
    p.totalCheckIns = p.checkIns.length;
    // streak calc (consecutive up to last check possible today/yesterday)
    let streak = 0;
    const sorted = p.checkIns.slice().sort();
    if (sorted.length) {
      let pointer = new Date(sorted[sorted.length - 1]);
      const todayOrYesterday = [todayISO(), yesterdayISO()];
      if (todayOrYesterday.includes(sorted[sorted.length - 1])) {
        streak = 1;
        for (let i = sorted.length - 2; i >= 0; i--) {
          pointer.setDate(pointer.getDate() - 1);
          const expect = pointer.toISOString().split("T")[0];
          if (sorted[i] === expect) streak++;
          else break;
        }
      }
    }
    p.currentStreak = streak;
  }
  function renderLeaderboard(ch) {
    let lb = $("#leaderboard-section");
    if (!lb) {
      lb = document.createElement("section");
      lb.id = "leaderboard-section";
      lb.className = "leaderboard";
      $("#challenge-detail").appendChild(lb);
    }
    lb.innerHTML = `<h3>Leaderboard</h3><ul class="leaderboard-list"></ul>`;
    const ul = lb.querySelector(".leaderboard-list");
    const ranked = ch.participants.slice().sort((a,b)=>{
      if (b.totalCheckIns!==a.totalCheckIns) return b.totalCheckIns-a.totalCheckIns;
      if (b.currentStreak!==a.currentStreak) return b.currentStreak-a.currentStreak;
      return a.username.localeCompare(b.username);
    });
    ranked.forEach((p,i)=>{
      const li=document.createElement("li");
      li.className="leaderboard-item";
      li.innerHTML=`<span class="leaderboard-rank">${i+1}</span>
        <span class="leaderboard-name" data-user="${p.username}">${p.username}</span>
        <span class="leaderboard-stats"><span>✅ ${p.totalCheckIns}</span><span>🔥 ${p.currentStreak}</span></span>`;
      li.querySelector(".leaderboard-name").addEventListener("click",()=> navigate(`#calendar/${ch.id}/${p.username}`));
      ul.appendChild(li);
    });
  }

  /* ================================================================
   * CALENDAR
   * ==============================================================*/
  function showCalendar(cid, user) {
    const ch = store.challenges.find((c) => c.id === cid);
    if (!ch) { navigate("#home"); return; }
    const participant = ch.participants.find((p) => p.username === user);
    if (!participant) { navigate(`#challenge/${cid}`); return; }
    $("#calendar-page").classList.add("active");
    renderCalendar(ch, participant);
  }
  function renderCalendar(ch, participant) {
    const cont = $("#calendar-content");
    cont.innerHTML="";
    let currentDate = new Date();

    const build = () => {
      cont.innerHTML="";
      const header=document.createElement("div");
      header.className="calendar-header";
      header.innerHTML=`<button class="calendar-nav-btn" id="prev">◀</button><span class="calendar-title">${currentDate.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</span><button class="calendar-nav-btn" id="next">▶</button>`;
      cont.appendChild(header);
      header.querySelector("#prev").addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()-1);build();});
      header.querySelector("#next").addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()+1);build();});

      const grid=document.createElement("div");
      grid.className="calendar-grid";
      ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(dn=>{
        const dh=document.createElement("div");dh.className="calendar-day-header";dh.textContent=dn;grid.appendChild(dh);
      });
      const year=currentDate.getFullYear();
      const month=currentDate.getMonth();
      const first=new Date(year,month,1);
      const startDay=first.getDay();
      const daysInMonth=new Date(year,month+1,0).getDate();
      const prevDays=new Date(year,month,0).getDate();
      for(let i=startDay-1;i>=0;i--){const d=prevDays-i;const cell=document.createElement("div");cell.className="calendar-day other-month";cell.textContent=d;grid.appendChild(cell);} 
      for(let d=1;d<=daysInMonth;d++){
        const dateStr=new Date(year,month,d).toISOString().split("T")[0];
        const cell=document.createElement("div");cell.className="calendar-day";cell.textContent=d;
        if(dateStr===todayISO()) cell.classList.add("today");
        if(participant.checkIns.includes(dateStr)) cell.classList.add("checked-in");
        else if(dateStr<todayISO() && dateStr>=ch.createdDate) cell.classList.add("missed");
        grid.appendChild(cell);
      }
      while(grid.children.length%7!==0){const cell=document.createElement("div");cell.className="calendar-day other-month";grid.appendChild(cell);} 
      cont.appendChild(grid);
      const legend=document.createElement("div");legend.className="calendar-legend";legend.innerHTML=`<div class="legend-item"><span class="legend-color checked-in"></span> Checked-in</div><div class="legend-item"><span class="legend-color missed"></span> Missed</div><div class="legend-item"><span class="legend-color no-data"></span> No data</div>`;cont.appendChild(legend);
    };
    build();
  }

  /* ================================================================
   * EVENT LISTENERS
   * ==============================================================*/
  document.addEventListener("DOMContentLoaded", () => {
    $("#to-signup-link").addEventListener("click", (e) => { e.preventDefault(); navigate("#signup"); });
    $("#to-login-link").addEventListener("click", (e) => { e.preventDefault(); navigate("#login"); });
    $("#signup-form").addEventListener("submit", handleSignup);
    $("#login-form").addEventListener("submit", handleLogin);
    $("#create-challenge-form").addEventListener("submit", handleCreateChallenge);
    $("#logout-btn").addEventListener("click", logout);
    $("#back-to-home").addEventListener("click", () => navigate("#home"));
    $("#back-to-challenge").addEventListener("click", () => { if(lastChallengeId) navigate(`#challenge/${lastChallengeId}`); else navigate("#home"); });
    handleRoute();
  });
})();
