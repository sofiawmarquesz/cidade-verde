/* Acessibilidade do Cidade Verde (landing e comparador).
   Carregue no <head>, sem defer: as preferências salvas são aplicadas antes da primeira pintura
   (evita o "flash" de tema errado) e o painel é montado quando o DOM fica pronto. */
(() => {
  "use strict";

  const CHAVE = "cv-a11y-v1";
  const ESCALAS = [100, 115, 130, 150, 175, 200];
  const PADRAO = { tema: "auto", contraste: false, escala: 100, espacamento: false, fonte: false, movimento: false, links: false };
  const FONTE_LEGIVEL = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap";

  const raiz = document.documentElement;
  const sistema = {
    contraste: window.matchMedia("(prefers-contrast: more)"),
    movimento: window.matchMedia("(prefers-reduced-motion: reduce)")
  };

  /* ---------- armazenamento (pode falhar em modo privado) ---------- */
  function ler() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && typeof salvo === "object") return salvo;
    } catch (_) { /* sem armazenamento: segue com o padrão */ }
    return null;
  }
  function gravar(prefs) {
    try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch (_) { /* ignora */ }
  }
  function limpar() {
    try { localStorage.removeItem(CHAVE); } catch (_) { /* ignora */ }
  }

  /* Valida o que veio do armazenamento e usa o sistema como ponto de partida na primeira visita */
  function normalizar(salvo) {
    const p = { ...PADRAO };
    if (!salvo) {
      p.contraste = sistema.contraste.matches;
      p.movimento = sistema.movimento.matches;
      return p;
    }
    if (["auto", "claro", "escuro"].includes(salvo.tema)) p.tema = salvo.tema;
    if (ESCALAS.includes(salvo.escala)) p.escala = salvo.escala;
    for (const k of ["contraste", "espacamento", "fonte", "movimento", "links"]) {
      if (typeof salvo[k] === "boolean") p[k] = salvo[k];
    }
    return p;
  }

  let prefs = normalizar(ler());

  /* ---------- aplicação no <html> ---------- */
  let linkFonte = null;
  function carregarFonteLegivel() {
    if (linkFonte || !document.head) return;
    linkFonte = document.createElement("link");
    linkFonte.rel = "stylesheet";
    linkFonte.href = FONTE_LEGIVEL;
    document.head.appendChild(linkFonte);
  }

  function aplicar() {
    if (prefs.tema === "auto") raiz.removeAttribute("data-theme");
    else raiz.setAttribute("data-theme", prefs.tema === "escuro" ? "dark" : "light");

    const alternar = (attr, valor, ativo) => ativo ? raiz.setAttribute(attr, valor) : raiz.removeAttribute(attr);
    alternar("data-contrast", "high", prefs.contraste);
    alternar("data-spacing", "wide", prefs.espacamento);
    alternar("data-font", "legible", prefs.fonte);
    alternar("data-motion", "reduce", prefs.movimento);
    alternar("data-links", "underline", prefs.links);

    raiz.style.setProperty("--fs-scale", String(prefs.escala / 100));
    raiz.setAttribute("data-scale", String(prefs.escala));

    if (prefs.fonte) carregarFonteLegivel();
  }

  aplicar();

  /* ---------- painel ---------- */
  const TEXTO = {
    abrir: "Acessibilidade",
    titulo: "Acessibilidade",
    fechar: "Fechar",
    tema: "Aparência",
    temaOpcoes: [["auto", "Automático"], ["claro", "Claro"], ["escuro", "Escuro"]],
    tamanho: "Tamanho do texto",
    menos: "Diminuir texto",
    mais: "Aumentar texto",
    contraste: ["Alto contraste", "Cores mais fortes e bordas visíveis."],
    espacamento: ["Espaçamento do texto", "Mais espaço entre linhas, letras e parágrafos."],
    fonte: ["Fonte de leitura fácil", "Letras mais distintas entre si (Atkinson Hyperlegible)."],
    links: ["Sublinhar links", "Links sempre sublinhados."],
    movimento: ["Reduzir animações", "Remove transições e entradas animadas."],
    movimentoSistema: "Ativado pela configuração do seu dispositivo.",
    restaurar: "Restaurar padrão"
  };

  function el(tag, attrs = {}, filhos = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "texto") e.textContent = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const f of [].concat(filhos)) e.append(f);
    return e;
  }

  function montar() {
    if (document.querySelector(".a11y")) return;

    const refs = {};

    /* Botão flutuante */
    const botao = el("button", {
      class: "a11y-toggle", type: "button", id: "a11y-toggle",
      "aria-expanded": "false", "aria-controls": "a11y-panel"
    }, [
      (() => {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.8");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("cx", "12"); c.setAttribute("cy", "4.5"); c.setAttribute("r", "1.6");
        const p = document.createElementNS(ns, "path");
        p.setAttribute("d", "M4.5 8.5 12 10l7.5-1.5M12 10v4.5m0 0-3 6m3-6 3 6");
        svg.append(c, p);
        return svg;
      })(),
      el("span", { class: "a11y-toggle-label", texto: TEXTO.abrir })
    ]);

    /* Aparência (tema) */
    const grupoTema = el("fieldset", { class: "a11y-group" }, [
      el("legend", { texto: TEXTO.tema }),
      el("div", { class: "a11y-seg" }, TEXTO.temaOpcoes.map(([valor, rotulo]) => {
        const id = "a11y-tema-" + valor;
        const input = el("input", { type: "radio", name: "a11y-tema", id, value: valor });
        refs["tema-" + valor] = input;
        return el("span", { class: "a11y-seg-item" }, [input, el("label", { for: id, texto: rotulo })]);
      }))
    ]);

    /* Tamanho do texto */
    const valorEscala = el("output", { class: "a11y-size-value", id: "a11y-size-value", for: "a11y-menos a11y-mais", "aria-live": "polite" });
    const menos = el("button", { type: "button", class: "a11y-step", id: "a11y-menos", "aria-label": TEXTO.menos }, [
      el("span", { "aria-hidden": "true", texto: "A−" })
    ]);
    const mais = el("button", { type: "button", class: "a11y-step", id: "a11y-mais", "aria-label": TEXTO.mais }, [
      el("span", { "aria-hidden": "true", texto: "A+" })
    ]);
    refs.menos = menos; refs.mais = mais; refs.valorEscala = valorEscala;
    const grupoTamanho = el("div", { class: "a11y-group", role: "group", "aria-labelledby": "a11y-size-title" }, [
      el("p", { class: "a11y-group-title", id: "a11y-size-title", texto: TEXTO.tamanho }),
      el("div", { class: "a11y-size" }, [menos, valorEscala, mais])
    ]);

    /* Interruptores */
    function interruptor(chave, [titulo, ajuda]) {
      const id = "a11y-" + chave;
      const input = el("input", { type: "checkbox", role: "switch", id, "aria-describedby": id + "-d" });
      refs[chave] = input;
      const ajudaEl = el("span", { class: "a11y-help", id: id + "-d", texto: ajuda });
      refs[chave + "Ajuda"] = ajudaEl;
      return el("div", { class: "a11y-switch" }, [
        input,
        el("label", { for: id }, [el("span", { class: "a11y-switch-title", texto: titulo }), ajudaEl]),
        el("span", { class: "a11y-track", "aria-hidden": "true" }, [el("span", { class: "a11y-thumb" })])
      ]);
    }

    const restaurar = el("button", { type: "button", class: "a11y-reset", texto: TEXTO.restaurar });
    const fechar = el("button", { type: "button", class: "a11y-close", "aria-label": TEXTO.fechar }, [
      el("span", { "aria-hidden": "true", texto: "×" })
    ]);

    const painel = el("div", {
      class: "a11y-panel", id: "a11y-panel", role: "dialog", "aria-labelledby": "a11y-title", hidden: true
    }, [
      el("div", { class: "a11y-head" }, [el("h2", { id: "a11y-title", texto: TEXTO.titulo }), fechar]),
      el("div", { class: "a11y-body" }, [
        grupoTema,
        grupoTamanho,
        interruptor("contraste", TEXTO.contraste),
        interruptor("espacamento", TEXTO.espacamento),
        interruptor("fonte", TEXTO.fonte),
        interruptor("links", TEXTO.links),
        interruptor("movimento", TEXTO.movimento)
      ]),
      el("div", { class: "a11y-foot" }, [restaurar])
    ]);

    const raizUI = el("div", { class: "a11y" }, [botao, painel]);
    document.body.append(raizUI);

    /* Sincroniza controles com o estado atual */
    function sincronizar() {
      for (const [valor] of TEXTO.temaOpcoes) refs["tema-" + valor].checked = prefs.tema === valor;
      for (const k of ["contraste", "espacamento", "fonte", "links"]) refs[k].checked = prefs[k];

      const forcado = sistema.movimento.matches;
      refs.movimento.checked = forcado || prefs.movimento;
      refs.movimento.disabled = forcado;
      refs.movimentoAjuda.textContent = forcado ? TEXTO.movimentoSistema : TEXTO.movimento[1];

      valorEscala.textContent = prefs.escala + "%";
      const i = ESCALAS.indexOf(prefs.escala);
      menos.disabled = i <= 0;
      mais.disabled = i >= ESCALAS.length - 1;
    }

    function mudar(parcial) {
      prefs = { ...prefs, ...parcial };
      aplicar();
      gravar(prefs);
      sincronizar();
    }

    /* Eventos */
    for (const [valor] of TEXTO.temaOpcoes) {
      refs["tema-" + valor].addEventListener("change", e => { if (e.target.checked) mudar({ tema: valor }); });
    }
    for (const k of ["contraste", "espacamento", "fonte", "links", "movimento"]) {
      refs[k].addEventListener("change", e => mudar({ [k]: e.target.checked }));
    }
    function passo(delta) {
      const i = ESCALAS.indexOf(prefs.escala) + delta;
      if (i < 0 || i >= ESCALAS.length) return;
      mudar({ escala: ESCALAS[i] });
      /* Se o botão ficou desabilitado no limite, mantém o foco dentro do grupo */
      const alvo = delta < 0 ? menos : mais;
      if (alvo.disabled) (delta < 0 ? mais : menos).focus();
    }
    menos.addEventListener("click", () => passo(-1));
    mais.addEventListener("click", () => passo(1));

    restaurar.addEventListener("click", () => {
      limpar();
      prefs = normalizar(null);
      aplicar();
      sincronizar();
    });

    /* Abrir e fechar */
    function abrir() {
      painel.hidden = false;
      botao.setAttribute("aria-expanded", "true");
      raizUI.classList.add("open");
      painel.querySelector("input:checked, button:not(:disabled)").focus();
    }
    function fecharPainel(devolverFoco = true) {
      painel.hidden = true;
      botao.setAttribute("aria-expanded", "false");
      raizUI.classList.remove("open");
      if (devolverFoco) botao.focus();
    }
    botao.addEventListener("click", () => (painel.hidden ? abrir() : fecharPainel()));
    fechar.addEventListener("click", () => fecharPainel());
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !painel.hidden) { e.stopPropagation(); fecharPainel(); }
    });
    document.addEventListener("click", e => {
      if (!painel.hidden && !raizUI.contains(e.target)) fecharPainel(false);
    });
    /* Fecha ao sair com Tab do painel para fora */
    raizUI.addEventListener("focusout", e => {
      if (!painel.hidden && e.relatedTarget && !raizUI.contains(e.relatedTarget)) fecharPainel(false);
    });

    /* Reage a mudanças do sistema enquanto a página está aberta */
    sistema.movimento.addEventListener("change", sincronizar);
    window.addEventListener("storage", e => {
      if (e.key !== CHAVE) return;
      prefs = normalizar(ler());
      aplicar();
      sincronizar();
    });

    sincronizar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
