/* =====================================================================
   DADOS PREENCHIDOS À MÃO
   Os temas abaixo não estão na API do IBGE. Preencha os valores
   consultando as fontes indicadas. Use o código IBGE do município
   como chave (Recife = 2611606, Olinda = 2609600).
   - tipo "numero": coloque um número (ex.: 42.5). null = a preencher.
   - tipo "texto": coloque um texto curto (ex.: "Sim", "Rio Beberibe").
   ===================================================================== */
const DADOS_MANUAIS = {
  residuos: {
    fonte: "SINISA / SNIS (Ministério das Cidades) e MUNIC (IBGE)",
    link: "https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa",
    indicadores: [
      { nome: "Massa de resíduos coletada por habitante", unidade: "kg/hab/dia", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Destinação final dos resíduos (aterro, lixão...)", tipo: "texto", valores: { "2611606": null, "2609600": null } },
      { nome: "Possui coleta seletiva", tipo: "texto", valores: { "2611606": null, "2609600": null } }
    ]
  },
  vegetacao: {
    fonte: "MapBiomas, estatísticas de cobertura por município (ano mais recente)",
    link: "https://plataforma.brasil.mapbiomas.org",
    indicadores: [
      { nome: "Área com vegetação natural", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Área de mangue", unidade: "ha", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Área urbanizada", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Variação da vegetação natural desde 1985", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } }
    ]
  },
  hidricos: {
    fonte: "ANA (SNIRH, Atlas Esgotos) e APAC",
    link: "https://www.snirh.gov.br",
    indicadores: [
      { nome: "Principais rios e bacias", tipo: "texto", valores: { "2611606": null, "2609600": null } },
      { nome: "Esgoto coletado e tratado", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Perdas na distribuição de água", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } }
    ]
  },
  drenagem: {
    fonte: "IBGE MUNIC 2024, IBGE/Cemaden (População em Áreas de Risco, 2018) e SINISA",
    link: "https://www.ibge.gov.br/estatisticas/sociais/saude/10586-pesquisa-de-informacoes-basicas-municipais.html",
    indicadores: [
      { nome: "Possui plano diretor de drenagem", tipo: "texto", valores: { "2611606": null, "2609600": null } },
      { nome: "População em áreas de risco", unidade: "pessoas", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Parcela da população em áreas de risco", unidade: "%", tipo: "numero", valores: { "2611606": null, "2609600": null } },
      { nome: "Principais riscos (alagamento, deslizamento...)", tipo: "texto", valores: { "2611606": null, "2609600": null } }
    ]
  }
};

/* =====================================================================
   CONFIGURAÇÃO DA API DO IBGE
   ===================================================================== */
const API = "https://servicodados.ibge.gov.br/api";
const UF = 26; // Pernambuco
const PADRAO = { a: "2611606", b: "2609600" };

const TEMAS = [
  { id: "resumo",   nome: "Resumo" },
  { id: "agua",     nome: "Abastecimento de água", tabela: 6909, filtro: /abastecimento/i,
    texto: "Forma principal como a água chega aos domicílios. Não é comparável diretamente com 2010, porque o Censo mudou a pergunta." },
  { id: "esgoto",   nome: "Esgotamento sanitário", tabela: 9397, filtro: /esgot/i,
    texto: "Destino do esgoto do banheiro ou sanitário dos domicílios." },
  { id: "residuos", nome: "Resíduos sólidos e coleta de lixo", tabela: 9541, filtro: /lixo/i, manual: "residuos",
    texto: "Destino do lixo produzido nos domicílios, com dados complementares de gestão dos resíduos." },
  { id: "vegetacao", nome: "Vegetação e cobertura do solo", manual: "vegetacao",
    texto: "Quanto do território ainda tem vegetação natural, mangue e quanto já foi urbanizado." },
  { id: "hidricos", nome: "Recursos hídricos", manual: "hidricos",
    texto: "Rios, bacias e pressão do esgoto e das perdas de água sobre eles." },
  { id: "drenagem", nome: "Drenagem urbana e riscos ambientais", manual: "drenagem",
    texto: "Planejamento da drenagem das chuvas e população exposta a alagamentos e deslizamentos." }
];

const KPIS = [
  { tema: "agua",     nome: "Água pela rede geral",       re: /^rede geral/i },
  { tema: "esgoto",   nome: "Esgoto pela rede geral ou pluvial", re: /^rede geral/i },
  { tema: "residuos", nome: "Lixo coletado",              re: /coletado|caçamba/i }
];

/* ===================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const fmt = (n, d = 1) => n == null || isNaN(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const estado = { a: PADRAO.a, b: PADRAO.b, nomes: { [PADRAO.a]: "Recife", [PADRAO.b]: "Olinda" }, slugs: {} };
const cacheMeta = {}, cacheDados = {};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/* Lê os metadados da tabela e escolhe a variável (moradores) e a classificação do tema */
async function meta(t) {
  if (cacheMeta[t.tabela]) return cacheMeta[t.tabela];
  const m = await getJSON(`${API}/v3/agregados/${t.tabela}/metadados`);
  const vars = m.variaveis.filter(v => !/%|percent/i.test(v.unidade + v.nome));
  const variavel = vars.find(v => /moradores/i.test(v.nome)) || vars[0] || m.variaveis[0];
  const cls = m.classificacoes.find(c => t.filtro.test(c.nome)) || m.classificacoes[0];
  const temNivel1 = cls.categorias.some(c => c.nivel === 1);
  const categorias = cls.categorias.filter(c => !/^total$/i.test(c.nome.trim()) && (!temNivel1 || c.nivel === 1));
  const total = cls.categorias.find(c => /^total$/i.test(c.nome.trim()));
  return (cacheMeta[t.tabela] = { nomeTabela: m.nome, variavel, cls, categorias, total });
}

/* Busca os valores para os dois municípios e devolve percentuais por categoria */
async function dados(t, a, b) {
  const chave = `${t.tabela}|${a}|${b}`;
  if (cacheDados[chave]) return cacheDados[chave];
  const m = await meta(t);
  const url = `${API}/v3/agregados/${t.tabela}/periodos/-1/variaveis/${m.variavel.id}?localidades=N6[${a},${b}]&classificacao=${m.cls.id}[all]`;
  const resp = await getJSON(url);
  const valores = {}; // valores[catId][munId] = número
  let periodo = "";
  for (const res of resp[0].resultados) {
    const c = res.classificacoes.find(x => String(x.id) === String(m.cls.id));
    const catId = c ? Object.keys(c.categoria)[0] : "total";
    for (const s of res.series) {
      const p = Object.keys(s.serie)[0]; periodo = p;
      const n = Number(String(s.serie[p]).replace(",", "."));
      (valores[catId] ??= {})[s.localidade.id] = isNaN(n) ? null : n;
    }
  }
  const totalDe = mun => {
    if (m.total && valores[m.total.id]?.[mun] != null) return valores[m.total.id][mun];
    return m.categorias.reduce((s, c) => s + (valores[c.id]?.[mun] || 0), 0);
  };
  const ta = totalDe(a), tb = totalDe(b);
  const linhas = m.categorias.map(c => {
    const va = valores[c.id]?.[a], vb = valores[c.id]?.[b];
    return { nome: c.nome, a: va == null ? null : va / ta * 100, b: vb == null ? null : vb / tb * 100, absA: va, absB: vb };
  }).filter(l => (l.absA || 0) + (l.absB || 0) > 0);
  return (cacheDados[chave] = { linhas, periodo, variavel: m.variavel.nome, tabela: t.tabela, nomeTabela: m.nomeTabela });
}

/* ---------- Renderização ---------- */
function nomeA() { return estado.nomes[estado.a] || estado.a; }
function nomeB() { return estado.nomes[estado.b] || estado.b; }

function legenda() {
  return `<div class="legend"><span><i class="dot a"></i>${esc(nomeA())}</span><span><i class="dot b"></i>${esc(nomeB())}</span></div>`;
}

function barras(linhas, max = 100, unidade = "%") {
  return `<div class="bars">${linhas.map(l => `
    <div class="row">
      <div class="lab">${esc(l.nome)}</div>
      <div class="bar" title="${esc(nomeA())}"><div class="track"><div class="fill a" style="width:${Math.max(0, Math.min(100, (l.a || 0) / max * 100))}%"></div></div><div class="val">${fmt(l.a)}${l.a == null ? "" : unidade}</div></div>
      <div class="bar" title="${esc(nomeB())}"><div class="track"><div class="fill b" style="width:${Math.max(0, Math.min(100, (l.b || 0) / max * 100))}%"></div></div><div class="val">${fmt(l.b)}${l.b == null ? "" : unidade}</div></div>
    </div>`).join("")}</div>`;
}

function carregando(n = 4) {
  return `<div class="bars">${Array.from({ length: n }, () => `<div class="row"><div class="skel" style="width:45%"></div><div class="skel"></div><div class="skel" style="width:80%"></div></div>`).join("")}</div>`;
}

function erroAPI(e) {
  const local = location.protocol === "file:" || location.protocol === "http:" || location.protocol === "https:";
  return `<div class="state err">Não foi possível buscar os dados do IBGE (${esc(e.message)}). Verifique a conexão com a internet e recarregue a página.${local ? "" : ""} Se o site estiver aberto dentro de um visualizador que bloqueia acesso externo, abra o arquivo direto no navegador.</div>`;
}

function cardCenso(t) {
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = `<h3>Moradores por ${esc(t.nome.toLowerCase())}</h3>${legenda()}${carregando()}`;
  dados(t, estado.a, estado.b).then(d => {
    el.innerHTML = `<h3>Moradores por ${esc(t.nome.toLowerCase())}</h3>${legenda()}${barras(d.linhas)}
      <div class="src">IBGE, Censo ${esc(d.periodo)} · Tabela SIDRA ${d.tabela} · % de ${esc(d.variavel.toLowerCase())}</div>`;
  }).catch(e => { el.innerHTML = `<h3>${esc(t.nome)}</h3>${erroAPI(e)}`; });
  return el;
}

function cardManual(chave) {
  const g = DADOS_MANUAIS[chave];
  const el = document.createElement("section");
  el.className = "card";
  const num = g.indicadores.filter(i => i.tipo === "numero" && i.unidade === "%" && i.valores[estado.a] != null && i.valores[estado.b] != null);
  const linhas = g.indicadores.map(i => {
    const cel = mun => {
      const v = i.valores[mun];
      if (v == null || v === "") return `<span class="pill">a preencher</span>`;
      return i.tipo === "numero" ? `${fmt(Number(v), Number.isInteger(Number(v)) ? 0 : 1)} ${esc(i.unidade || "")}` : esc(v);
    };
    return `<tr><td>${esc(i.nome)}</td><td class="${i.tipo === "numero" ? "n" : ""}">${cel(estado.a)}</td><td class="${i.tipo === "numero" ? "n" : ""}">${cel(estado.b)}</td></tr>`;
  }).join("");
  const temDados = g.indicadores.some(i => i.valores[estado.a] != null || i.valores[estado.b] != null);
  el.innerHTML = `
    <h3>Indicadores complementares</h3>
    ${num.length ? legenda() + barras(num.map(i => ({ nome: i.nome, a: Number(i.valores[estado.a]), b: Number(i.valores[estado.b]) }))) : ""}
    <div class="tbl-wrap"><table>
      <thead><tr><th>Indicador</th><th><i class="dot a"></i> ${esc(nomeA())}</th><th><i class="dot b"></i> ${esc(nomeB())}</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    <div class="src">Fonte: <a href="${esc(g.link)}" target="_blank" rel="noopener">${esc(g.fonte)}</a>${temDados ? "" : ". Preencha os valores no bloco DADOS_MANUAIS do arquivo."}</div>`;
  return el;
}

function painelTema(t) {
  const p = document.createElement("section");
  p.className = "panel";
  p.id = "painel-" + t.id;
  p.setAttribute("role", "tabpanel");
  p.innerHTML = `<div class="panel-head"><h2>${esc(t.nome)}</h2><p>${esc(t.texto)}</p></div>`;
  const grid = document.createElement("div");
  grid.className = "grid";
  if (t.tabela) grid.appendChild(cardCenso(t));
  if (t.manual) grid.appendChild(cardManual(t.manual));
  p.appendChild(grid);
  return p;
}

function painelResumo() {
  const p = document.createElement("section");
  p.className = "panel";
  p.setAttribute("role", "tabpanel");
  p.innerHTML = `<div class="panel-head"><h2>Saneamento em três números</h2>
    <p>Parcela dos moradores atendida por cada serviço, segundo o Censo 2022. Use as abas para ver cada tema em detalhe.</p></div>`;
  const k = document.createElement("div");
  k.className = "kpis";
  for (const kp of KPIS) {
    const t = TEMAS.find(x => x.id === kp.tema);
    const box = document.createElement("article");
    box.className = "kpi";
    box.innerHTML = `<h3>${esc(kp.nome)}</h3><div class="skel" style="height:2.2rem"></div>`;
    k.appendChild(box);
    dados(t, estado.a, estado.b).then(d => {
      const sel = d.linhas.filter(l => kp.re.test(l.nome));
      const va = sel.reduce((s, l) => s + (l.a || 0), 0), vb = sel.reduce((s, l) => s + (l.b || 0), 0);
      const dif = va - vb;
      box.innerHTML = `<h3>${esc(kp.nome)}</h3>
        <div class="pair">
          <div><div class="city"><span class="dot a"></span><span>${esc(nomeA())}</span></div><div class="num a">${fmt(va)}%</div></div>
          <div><div class="city"><span class="dot b"></span><span>${esc(nomeB())}</span></div><div class="num b">${fmt(vb)}%</div></div>
        </div>
        <div class="diff">${Math.abs(dif) < 0.05 ? "Mesmo nível nos dois municípios" : `${esc(dif > 0 ? nomeA() : nomeB())} está ${fmt(Math.abs(dif))} ponto(s) percentual(is) à frente`}</div>`;
    }).catch(e => { box.innerHTML = `<h3>${esc(kp.nome)}</h3>${erroAPI(e)}`; });
  }
  p.appendChild(k);
  const temas = document.createElement("div");
  temas.className = "grid";
  temas.append(cardCenso(TEMAS[1]), cardCenso(TEMAS[2]));
  p.appendChild(temas);
  p.insertAdjacentHTML("beforeend", `<p class="note">Percentuais calculados sobre o total de moradores em domicílios particulares permanentes ocupados de cada município, o que permite comparar cidades de tamanhos diferentes.</p>`);
  return p;
}

/* ---------- Abas (funcionam com toque, mouse e setas do controle da TV) ---------- */
let atual = "resumo";
function montarAbas() {
  const tl = $("#tablist");
  tl.innerHTML = TEMAS.map(t => `<button class="tab" role="tab" id="tab-${t.id}" data-id="${t.id}" aria-selected="false" tabindex="-1">${esc(t.nome)}</button>`).join("");
  tl.addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) abrir(b.dataset.id, true); });
  tl.addEventListener("keydown", e => {
    const i = TEMAS.findIndex(t => t.id === atual);
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % TEMAS.length;
    if (e.key === "ArrowLeft") n = (i - 1 + TEMAS.length) % TEMAS.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = TEMAS.length - 1;
    if (n != null) { e.preventDefault(); abrir(TEMAS[n].id, true); $("#tab-" + TEMAS[n].id).focus(); }
  });
}

function abrir(id, mudarHash) {
  if (!TEMAS.some(t => t.id === id)) id = "resumo";
  atual = id;
  document.querySelectorAll(".tab").forEach(b => {
    const on = b.dataset.id === id;
    b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1;
    if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  const main = $("#main");
  main.innerHTML = "";
  const t = TEMAS.find(x => x.id === id);
  main.appendChild(id === "resumo" ? painelResumo() : painelTema(t));
  main.firstElementChild.setAttribute("aria-labelledby", "tab-" + id);
  if (mudarHash) history.replaceState(null, "", "#" + id);
}

/* ---------- Municípios ---------- */
function slug(nome) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function atualizarTitulos() {
  $("#t-a").textContent = nomeA();
  $("#t-b").textContent = nomeB();
  document.title = `${nomeA()} x ${nomeB()} | Comparador Cidade Verde`;
  $("#pan-a").textContent = nomeA(); $("#pan-a").href = `https://cidades.ibge.gov.br/brasil/pe/${slug(nomeA())}/panorama`;
  $("#pan-b").textContent = nomeB(); $("#pan-b").href = `https://cidades.ibge.gov.br/brasil/pe/${slug(nomeB())}/panorama`;
}

async function carregarMunicipios() {
  try {
    const lista = await getJSON(`${API}/v1/localidades/estados/${UF}/municipios?orderBy=nome`);
    const opts = lista.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join("");
    for (const m of lista) estado.nomes[m.id] = m.nome;
    $("#sel-a").innerHTML = opts; $("#sel-b").innerHTML = opts;
  } catch (e) { /* mantém Recife e Olinda como opções */ }
  $("#sel-a").value = estado.a; $("#sel-b").value = estado.b;
}

function mudar() {
  estado.a = $("#sel-a").value; estado.b = $("#sel-b").value;
  atualizarTitulos(); abrir(atual, false);
}
$("#sel-a").addEventListener("change", mudar);
$("#sel-b").addEventListener("change", mudar);
$("#btn-swap").addEventListener("click", () => {
  [$("#sel-a").value, $("#sel-b").value] = [estado.b, estado.a]; mudar();
});
window.addEventListener("hashchange", () => abrir(location.hash.slice(1), false));

/* ---------- Início ---------- */
montarAbas();
atualizarTitulos();
abrir(location.hash.slice(1) || "resumo", false);
carregarMunicipios();
