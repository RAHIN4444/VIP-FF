
const DB_KEY = "vip_ora_database";
const SESSION_KEY = "vip_ora_user";
const ADMIN_PASSWORD = "RRR";

let installPrompt = null;

let db = JSON.parse(localStorage.getItem(DB_KEY) || "null") || {
  users: [
    {name:"Rahim",email:"rahim@gmail.com",wallet:500,blocked:false,joined:[]},
    {name:"Karim",email:"karim@gmail.com",wallet:300,blocked:false,joined:[]},
    {name:"Sakib",email:"sakib@gmail.com",wallet:750,blocked:false,joined:[]},
    {name:"Hasan",email:"hasan@gmail.com",wallet:100,blocked:false,joined:[]}
  ],
  tournaments: [
    {id:1,name:"Friday Night Cup",game:"Free Fire",fee:20,prize:100,active:true,joined:[]},
    {id:2,name:"VIP Champion League",game:"PUBG Mobile",fee:50,prize:300,active:true,joined:[]}
  ],
  notifications: []
};

function saveDB(){
  localStorage.setItem(DB_KEY,JSON.stringify(db));
  refresh();
}

function currentUser(){
  const email=localStorage.getItem(SESSION_KEY);
  return db.users.find(u=>u.email===email);
}

function safe(value){
  return String(value).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
  }[c]));
}

// ADMIN LOGIN

function adminLogin(){
  const password=document.getElementById("adminPassword").value;

  if(password===ADMIN_PASSWORD){
    sessionStorage.setItem("vip_admin","yes");
    document.getElementById("loginBox").hidden=true;
    document.getElementById("dashboard").hidden=false;
    refresh();
  }else{
    document.getElementById("loginMessage").textContent="Wrong Password!";
  }
}

function adminLogout(){
  sessionStorage.removeItem("vip_admin");
  location.reload();
}

// USER REGISTRATION

function registerUser(){
  const name=document.getElementById("userName").value.trim();
  const email=document.getElementById("userEmail").value.trim().toLowerCase();

  if(!name || !/^[^\s@]+@gmail\.com$/.test(email)){
    alert("সঠিক নাম ও Gmail লিখুন");
    return;
  }

  if(db.users.some(u=>u.email===email)){
    alert("এই Gmail দিয়ে অ্যাকাউন্ট আছে");
    return;
  }

  db.users.push({
    name,
    email,
    wallet:100,
    blocked:false,
    joined:[]
  });

  localStorage.setItem(SESSION_KEY,email);
  saveDB();
  alert("Registration Successful! 100 Bonus Points Added.");
}

// USER LOGOUT

function userLogout(){
  localStorage.removeItem(SESSION_KEY);
  refresh();
}

// ADMIN: ADD WALLET POINTS

function addWallet(){
  if(sessionStorage.getItem("vip_admin")!=="yes") return;

  const email=document.getElementById("creditEmail").value.trim().toLowerCase();
  const amount=Number(document.getElementById("creditAmount").value);

  const user=db.users.find(u=>u.email===email);

  if(!user){
    alert("User not found!");
    return;
  }

  if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(amount)){
    alert("একটি বৈধ পূর্ণসংখ্যা দিন");
    return;
  }

  user.wallet+=amount;

  saveDB();

  document.getElementById("creditMessage").textContent=
    amount+" points added to "+user.name;
}

// ADMIN: BLOCK / UNBLOCK

function toggleBlock(email){
  if(sessionStorage.getItem("vip_admin")!=="yes") return;

  const user=db.users.find(u=>u.email===email);
  if(!user)return;

  user.blocked=!user.blocked;
  saveDB();
}

// ADMIN: SEARCH USERS

function showAdminUsers(){
  const q=(document.getElementById("searchUser").value||"").toLowerCase();

  const users=db.users.filter(u=>
    (u.name+" "+u.email).toLowerCase().includes(q)
  );

  document.getElementById("adminUsers").innerHTML=users.map(u=>`
    <div class="user-row">
      <b>${safe(u.name)}</b>
      <p>${safe(u.email)}</p>
      <p>Wallet: ${u.wallet} Points</p>
      <p>${u.blocked?"🔴 Blocked":"🟢 Active"}</p>
      <button onclick="toggleBlock('${safe(u.email)}')">
        ${u.blocked?"UNBLOCK":"BLOCK"}
      </button>
    </div>
  `).join("") || "No users found";
}

// CREATE TOURNAMENT

function createTournament(){
  if(sessionStorage.getItem("vip_admin")!=="yes")return;

  const name=document.getElementById("tName").value.trim();
  const game=document.getElementById("tGame").value.trim();
  const fee=Number(document.getElementById("tFee").value);
  const prize=Number(document.getElementById("tPrize").value);

  if(!name||!game||!Number.isSafeInteger(fee)||fee<0||
     !Number.isSafeInteger(prize)||prize<0){
    alert("সঠিক Tournament তথ্য দিন");
    return;
  }

  const tournament={
    id:Date.now(),
    name,
    game,
    fee,
    prize,
    active:true,
    joined:[]
  };

  db.tournaments.push(tournament);

  db.notifications.unshift({
    id:Date.now(),
    title:"New Tournament!",
    message:name+" is now available. Join now!",
    time:new Date().toLocaleString()
  });

  saveDB();

  alert("Tournament Published!");

  ["tName","tGame","tFee","tPrize"].forEach(id=>{
    document.getElementById(id).value="";
  });
}

// JOIN TOURNAMENT

function joinTournament(id){
  const user=currentUser();

  if(!user){
    alert("আগে Registration করুন");
    return;
  }

  if(user.blocked){
    alert("আপনার Account Blocked");
    return;
  }

  const t=db.tournaments.find(x=>x.id===id);

  if(!t||!t.active)return;

  if(t.joined.includes(user.email)){
    alert("আপনি ইতিমধ্যে Join করেছেন");
    return;
  }

  if(user.wallet<t.fee){
    alert("আপনার Wallet-এ পর্যাপ্ত Points নেই");
    return;
  }

  user.wallet-=t.fee;
  t.joined.push(user.email);
  user.joined.push(t.id);

  saveDB();
  alert("Successfully Joined!");
}

// TOURNAMENT NOTIFICATIONS

function enableNotifications(){
  if(!("Notification" in window)){
    alert("এই ব্রাউজারে Notification Support নেই");
    return;
  }

  Notification.requestPermission().then(permission=>{
    if(permission==="granted"){
      alert("Notifications Enabled!");
      showNewNotifications();
    }
  });
}

function showNewNotifications(){
  const seen=JSON.parse(localStorage.getItem("vip_seen")||"[]");

  db.notifications.forEach(n=>{
    if(!seen.includes(n.id)){
      if(Notification.permission==="granted"){
        new Notification(n.title,{
          body:n.message
        });
      }
      seen.push(n.id);
    }
  });

  localStorage.setItem("vip_seen",JSON.stringify(seen));
}

// APP INSTALL

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  installPrompt=e;
});

async function installApp(){
  if(installPrompt){
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt=null;
  }else{
    alert("Browser menu থেকে Add to Home Screen নির্বাচন করুন।");
  }
}

// RENDER USER AND ADMIN PAGES

function refresh(){
  const user=currentUser();

  const total=document.getElementById("totalMembers");
  if(total) total.textContent=db.users.length;

  const tt=document.getElementById("totalTournaments");
  if(tt) tt.textContent=db.tournaments.length;

  if(document.getElementById("adminUsers")){
    showAdminUsers();

    document.getElementById("adminTournaments").innerHTML=
      db.tournaments.map(t=>`
        <div class="user-row">
          <b>${safe(t.name)}</b>
          <p>${safe(t.game)} | Fee: ${t.fee} | Prize: ${t.prize}</p>
          <p>Joined: ${t.joined.length}</p>
          <button class="red" onclick="removeTournament(${t.id})">
            REMOVE
          </button>
        </div>
      `).join("");
  }

  const registerBox=document.getElementById("registerBox");
  if(registerBox){
    registerBox.hidden=!!user;
    document.getElementById("accountBox").hidden=!user;

    if(user){
      document.getElementById("welcomeName").textContent=user.name;
      document.getElementById("welcomeEmail").textContent=user.email;
      document.getElementById("userWallet").textContent=user.wallet;
    }

    document.getElementById("userTournaments").innerHTML=
      db.tournaments.filter(t=>t.active).map(t=>`
        <div class="user-row">
          <h3>${safe(t.name)}</h3>
          <p>Game: ${safe(t.game)}</p>
          <p>Entry: ${t.fee} Points</p>
          <p>Prize: ${t.prize} Points</p>
          <p>Players: ${t.joined.length}</p>
          <button onclick="joinTournament(${t.id})">JOIN NOW</button>
        </div>
      `).join("") || "No tournaments available";

    document.getElementById("userMembers").innerHTML=
      db.users.filter(u=>!u.blocked).map(u=>
        `<p>👤 ${safe(u.name)}</p>`
      ).join("");

    document.getElementById("myTournaments").innerHTML=
      user ? user.joined.map(id=>{
        const t=db.tournaments.find(x=>x.id===id);
        return t?`<p>🏆 ${safe(t.name)}</p>`:"";
      }).join("") : "Register first";

    document.getElementById("userNotifications").innerHTML=
      db.notifications.map(n=>`
        <div class="user-row">
          <b>${safe(n.title)}</b>
          <p>${safe(n.message)}</p>
          <small>${safe(n.time)}</small>
        </div>
      `).join("") || "No new notifications";

    if(user && !user.blocked) showNewNotifications();
  }
}

// REMOVE TOURNAMENT

function removeTournament(id){
  if(sessionStorage.getItem("vip_admin")!=="yes")return;
  if(confirm("Remove this tournament?")){
    db.tournaments=db.tournaments.filter(t=>t.id!==id);
    saveDB();
  }
}

// STARTUP

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").catch(console.error);
  });
}

window.addEventListener("storage",e=>{
  if(e.key===DB_KEY){
    db=JSON.parse(e.newValue||"null")||db;
    refresh();
  }
});

if(document.getElementById("dashboard")){
  const loggedIn=sessionStorage.getItem("vip_admin")==="yes";
  document.getElementById("loginBox").hidden=loggedIn;
  document.getElementById("dashboard").hidden=!loggedIn;
}

refresh();
