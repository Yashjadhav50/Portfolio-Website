// ===== GLOBAL THEME TOGGLE (WORKS ON ALL PAGES) =====
(function(){
  const toggle = document.getElementById("themeToggle");

  function applyTheme(theme){
    document.body.classList.remove("light","dark");
    document.body.classList.add(theme);

    if(toggle){
      toggle.textContent = theme === "dark" ? "🌙" : "🌞";
    }

    localStorage.setItem("theme", theme);
  }

  const saved = localStorage.getItem("theme") || "light";
  applyTheme(saved);

  toggle && toggle.addEventListener("click", ()=>{
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });
})();

// ===== Reveal Animation =====
(function(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.style.transition='all .6s';
        e.target.style.transform='translateY(0)';
        e.target.style.opacity='1';
      }
    });
  }, {threshold:0.15});

  document.querySelectorAll('.project-card,.skill,.soft-skill,.hero-card').forEach(el=>{
    el.style.opacity='0';
    el.style.transform='translateY(12px)';
    obs.observe(el);
  });
})();

// ===== Login Form Logic =====
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim()
    };
    const res = await fetch('/api/register',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    if(res.ok){
      window.location.href='/';
    } else alert("Failed to sign in");
  });
}

// ===== Logout (Portfolio & Admin) =====
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn){
  logoutBtn.addEventListener('click', async ()=>{
    await fetch('/api/logout',{method:'POST'});
    window.location.href='/login.html';
  });
}

// Admin logout fallback
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
if(adminLogoutBtn){
  adminLogoutBtn.addEventListener('click', async ()=>{
    await fetch('/api/admin/logout',{method:'POST'});
    window.location.href='/login.html';
  });
}
