/* Comportamentos da landing page: menu móvel, estado do cabeçalho e entrada sutil dos blocos. */
(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu");
  const label = document.querySelector(".nav-toggle-label");
  const mobile = window.matchMedia("(max-width: 52rem)");
  let aberto = false;

  function atualizarCabecalho() {
    header.classList.toggle("at-top", window.scrollY < 24 && !aberto);
  }

  function definirMenu(abrir) {
    aberto = abrir;
    menu.classList.toggle("open", abrir);
    toggle.setAttribute("aria-expanded", String(abrir));
    label.textContent = abrir ? "Fechar" : "Menu";
    atualizarCabecalho();
  }

  toggle.addEventListener("click", () => definirMenu(!aberto));
  menu.addEventListener("click", e => { if (e.target.closest("a")) definirMenu(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && aberto) { definirMenu(false); toggle.focus(); }
  });
  mobile.addEventListener("change", e => { if (!e.matches) definirMenu(false); });

  let pendente = false;
  window.addEventListener("scroll", () => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => { atualizarCabecalho(); pendente = false; });
  }, { passive: true });
  atualizarCabecalho();

  const itens = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    itens.forEach(el => el.classList.add("in"));
  } else {
    const obs = new IntersectionObserver(entradas => {
      for (const en of entradas) {
        if (en.isIntersecting) { en.target.classList.add("in"); obs.unobserve(en.target); }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    itens.forEach(el => obs.observe(el));
  }
})();
