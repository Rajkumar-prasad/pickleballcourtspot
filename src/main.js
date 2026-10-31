// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const nav = document.getElementById('nav');
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

// Home page city finder
const finder = document.getElementById('finder');
if (finder) {
  const select = document.getElementById('city-select');
  const go = () => { if (select.value) window.location.href = select.value; };
  finder.addEventListener('submit', (e) => { e.preventDefault(); go(); });
  select.addEventListener('change', go);
}

// City page filters
const buttons = document.querySelectorAll('.filters button');
buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('.venue').forEach((card) => {
      const tags = (card.dataset.tags || '').split(' ');
      card.hidden = f !== 'all' && !tags.includes(f);
    });
  });
});
