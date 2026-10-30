// Pestañas de delitos: todas se arman con la misma estructura a partir de una configuración.
// D = delitos.json (series mensuales nacionales), P = deptos.json (por departamento y año), C = ciudades.json
let D = null, P = null, C = null;
async function datosBase() {
  if (!D) [D, P, C] = await Promise.all([json("web/delitos.json"), json("web/deptos.json"), json("web/ciudades.json")]);
}
const MES_L = f => MESES_L[+f.slice(5, 7) - 1];
const num = (x, d = 0) => x == null ? "–" : fmt(x, d);
const signo = (a, b) => b ? (a >= b ? "+" : "−") + fmt(Math.abs(a / b - 1) * 100, 1) + "%" : "–";
const cantidad = (id, x) => { const u = D.delitos[id].u; return u === "kilos" ? (x >= 1e6 ? fmt(x / 1e6, 1) + " millones de kilos" : x >= 1000 ? fmt(x / 1000, 1) + " toneladas" : fmt(x, 0) + " kilos")
  : u === "hectáreas" ? fmt(x, 0) + " hectáreas" : fmt(x, 0) + " " + u; };
// índices útiles: último mes completo, año corrido
function corte() {
  const M = D.meses, iu = M.indexOf(D.ultimo), y = +D.ultimo.slice(0, 4), m = +D.ultimo.slice(5, 7);
  return {M, iu, y, m, i12: iu - 12, periodo: m === 12 ? `todo ${y}` : m === 1 ? `enero de ${y}` : `enero a ${MESES_L[m - 1]} de ${y}`, periodoCorto: m === 1 ? "enero" : `enero–${MESES[m - 1]}`};
}
function anioCorrido(id, y, m) {
  const t = D.delitos[id].total; let s = 0;
  D.meses.forEach((f, i) => { if (+f.slice(0, 4) === y && +f.slice(5, 7) <= m) s += t[i] || 0; });
  return s;
}
// suma de los últimos 12 meses (para tasas y tendencias sin estacionalidad)
const doce = (arr, i) => { let s = 0; for (let k = i - 11; k <= i; k++) { if (k < 0 || arr[k] == null) return null; s += arr[k]; } return s; };
const pobAnio = y => { const k = D.anios.indexOf(y); return D.poblacion[k] ?? D.poblacion.at(-1); };

function pestanaDelitos(cfg) {
  const st = {d: cfg.delitos[0], medida: "n", dim: null, mapaD: cfg.delitos.find(x => D?.delitos[x]?.tasa) || cfg.delitos[0], mapaA: null, ciudadD: null, ciudadA: null};
  const id = cfg.id, $$ = s => $(`${id}-${s}`);
  const conTasa = () => cfg.delitos.filter(d => D.delitos[d].tasa);
  const municipales = () => cfg.delitos.filter(d => Object.values(C.ciudades).some(c => c.v[d]));
  const nombre = d => D.delitos[d].n;

  function armar() {
    const sec = $(`tab-${id}`).querySelector(".contenido");
    const botones = (lista, attr) => lista.map((d, i) => `<button data-v="${d}"${i ? "" : ' class="on"'}>${attr ? attr(d) : nombre(d)}</button>`).join("");
    sec.innerHTML = `
      <div class="row spread mb"><p class="hint" style="margin:0">${cfg.intro}</p><span class="badge" id="${id}-ultima"></span></div>
      <section class="kpis" id="${id}-kpis"></section>
      <section class="panel">
        <span class="paso"><b>1</b>Cómo va</span>
        <h2 id="${id}-ser-t"></h2>
        <div class="row controles">${cfg.delitos.length > 1 ? `<div class="seg" id="${id}-del">${botones(cfg.delitos, d => cfg.corto?.[d] || nombre(d))}</div>` : ""}
          <div class="seg" id="${id}-med"><button data-v="n" class="on">Cada mes</button><button data-v="t">Últimos 12 meses</button></div></div>
        <div class="grupos-ise" id="${id}-exp"></div>
        <div class="chartbox" style="height:320px"><canvas id="${id}-ser"></canvas></div>
        <p class="interp" id="${id}-ser-txt"></p>
        <h2 style="margin-top:22px" id="${id}-yc-t"></h2>
        <p class="hint">Así se compara de forma justa un año que todavía no termina: el mismo periodo de cada año.</p>
        <div class="chartbox" style="height:240px"><canvas id="${id}-yc"></canvas></div>
        <p class="interp" id="${id}-yc-txt"></p>
      </section>
      <section class="panel" id="${id}-det-box">
        <span class="paso"><b>2</b>Quiénes y cómo</span>
        <h2 id="${id}-det-t"></h2>
        <div class="row controles"><div class="seg" id="${id}-dim"></div></div>
        <div class="chartbox" style="height:300px"><canvas id="${id}-det"></canvas></div>
        <p class="interp" id="${id}-det-txt"></p>
      </section>
      <section class="panel">
        <span class="paso"><b>3</b>Por departamento</span>
        <h2 id="${id}-map-t"></h2>
        <div class="row controles">${cfg.delitos.length > 1 ? `<label class="lbl">Qué ver:</label><select id="${id}-mapd"></select>` : ""}<label class="lbl">Año:</label><select id="${id}-mapa-a"></select></div>
        <p class="hint" id="${id}-map-h"></p>
        <div id="${id}-mapa"></div>
        <div id="${id}-map-tiempo" hidden></div>
        <p class="interp" id="${id}-map-txt"></p>
      </section>
      <section class="panel" id="${id}-ciu-box">
        <span class="paso"><b>4</b>Ciudades</span>
        <h2 id="${id}-ciu-t"></h2>
        <div class="row controles"><label class="lbl">Qué ver:</label><select id="${id}-ciud"></select><label class="lbl">Año:</label><select id="${id}-ciu-a"></select></div>
        <p class="hint">Municipios de más de 100.000 habitantes, de mayor a menor tasa. Toca una ciudad para verla en el tiempo.</p>
        <div class="chartbox"><canvas id="${id}-ciu"></canvas></div>
        <div id="${id}-ciu-tiempo" hidden></div>
        <p class="interp" id="${id}-ciu-txt"></p>
      </section>
      <p class="foot">${cfg.fuente || ""} Fuente: Ministerio de Defensa Nacional con datos de la Policía Nacional (datos abiertos, desde 2003); población: DANE, proyecciones con base en el Censo 2018.
        Son <strong>hechos registrados</strong> (denuncias y reportes): en delitos que se denuncian poco, como el hurto o la extorsión, muestran solo una parte de lo que pasa.
        Datos: <a href="datos/delitos/detalle.csv">nacional</a> · <a href="datos/delitos/deptos.csv">por departamento</a> · <a href="datos/delitos/municipios.csv">por municipio</a></p>`;
  }

  async function iniciar() {
    await datosBase();
    st.mapaD = conTasa()[0] || cfg.delitos[0];
    armar();
    const k = corte();
    $$("ultima").textContent = `Último mes completo: ${MES_L(D.ultimo)} de ${k.y}`;
    if (cfg.delitos.length > 1) seg(`${id}-del`, x => { st.d = x; st.dim = null; serieDel(); anual(); detalle(); });
    seg(`${id}-med`, x => { st.medida = x; serieDel(); });
    // selectores de año: los años completos y el año en curso (hasta el último mes completo)
    const anios = P.anios.filter(a => a <= k.y).reverse().map(a => [a, a === P.anio_parcial ? `${a} (${k.periodoCorto})` : a]);
    if ($$("mapd")) { opciones($$("mapd"), cfg.delitos.map(d => [d, nombre(d)]), st.mapaD); $$("mapd").onchange = () => { st.mapaD = $$("mapd").value; mapaDel(); }; }
    st.mapaA = String(k.y); opciones($$("mapa-a"), anios, st.mapaA); $$("mapa-a").onchange = () => { st.mapaA = $$("mapa-a").value; mapaDel(); };
    const mun = municipales();
    if (!mun.length) $$("ciu-box").hidden = true;
    else {
      st.ciudadD = mun[0]; opciones($$("ciud"), mun.map(d => [d, nombre(d)]), st.ciudadD); $$("ciud").onchange = () => { st.ciudadD = $$("ciud").value; ciudades(); };
      const ac = C.anios.filter(a => a <= k.y).reverse().map(a => [a, a === C.anio_parcial ? `${a} (${k.periodoCorto})` : a]);
      st.ciudadA = String(k.y); opciones($$("ciu-a"), ac, st.ciudadA); $$("ciu-a").onchange = () => { st.ciudadA = $$("ciu-a").value; ciudades(); };
    }
  }

  function kpis() {
    const k = corte();
    $$("kpis").innerHTML = cfg.delitos.slice(0, 4).map(d => {
      const a = anioCorrido(d, k.y, k.m), b = anioCorrido(d, k.y - 1, k.m), sube = a > b;
      const malo = !cfg.bueno?.includes(d);
      return `<div class="kpi"><div class="l">${cfg.corto?.[d] || nombre(d)}</div><div class="v small">${cantidad(d, a)}</div>
        <div class="d"><span class="${b ? (sube === malo ? "pos" : "neg") : ""}">${b ? (sube ? "▲ " : "▼ ") + signo(a, b) : ""}</span> ${k.periodoCorto} ${k.y} vs ${k.y - 1}</div></div>`;
    }).join("");
  }

  function serieDel() {
    const k = corte(), d = st.d, X = D.delitos[d], F = D.meses.slice(0, k.iu + 1), t = X.total.slice(0, k.iu + 1);
    const tasa = st.medida === "t";
    const datos = tasa ? t.map((v, i) => { const s = doce(t, i); return s == null ? null : X.tasa ? s / pobAnio(+F[i].slice(0, 4)) * 1e5 : s; }) : t;
    $$("ser-t").textContent = tasa ? (X.tasa ? `${X.n}: tasa de los últimos 12 meses por cada 100.000 habitantes` : `${X.n}: total de los últimos 12 meses`) : `${X.n} cada mes`;
    $$("exp").innerHTML = (cfg.exp?.[d] || []).map(([a, b]) => `<div><strong>${a}</strong><span>${b}</span></div>`).join("");
    const f = tasa && X.tasa ? (x => num(x, 1)) : (x => cantidad(d, x));
    serie(`${id}-ser`, F, [{label: tasa ? (X.tasa ? "Tasa por 100.000 habitantes (12 meses)" : "Total de 12 meses") : X.n, data: datos, color: css("--grafica"), ancho: 2.5}],
      {fmtValor: x => x == null ? "–" : f(x), eje0: true, inicio: tasa ? 120 : 24, despues: (i0, i1) => {
        const v = t[i1], v12 = t[i1 - 12], tr = datos.slice(i0, i1 + 1).map((x, j) => [x, F[i0 + j]]).filter(x => x[0] != null);
        const mx = tr.reduce((a, b) => b[0] > a[0] ? b : a, tr[0]), mn = tr.reduce((a, b) => b[0] < a[0] ? b : a, tr[0]);
        let txt = `En <strong>${MES_L(F[i1])} de ${F[i1].slice(0, 4)}</strong> se registraron <strong>${cantidad(d, v)}</strong>` +
          (v12 != null ? `, ${Math.abs(v / v12 - 1) < 0.02 ? "casi lo mismo que" : v > v12 ? `${signo(v, v12)} frente a` : `${signo(v, v12)} frente a`} ${MES_L(F[i1])} del año anterior (${cantidad(d, v12)})` : "") + ". ";
        if (tasa) { const s = datos[i1];
          txt += X.tasa ? `En los últimos 12 meses la tasa es de <strong>${num(s, 1)} por cada 100.000 habitantes</strong>. ` : `En los últimos 12 meses suman ${cantidad(d, s)}. `;
          if (tr.length > 12) txt += `En el periodo elegido, lo más alto fue ${f(mx[0])} (12 meses a ${etqMes(mx[1])}) y lo más bajo ${f(mn[0])} (12 meses a ${etqMes(mn[1])}). `;
        } else txt += `Las cifras de un solo mes saltan mucho; para ver la tendencia, usa “Últimos 12 meses”. `;
        txt += `${MES_L(D.preliminar).replace(/^./, c => c.toUpperCase())} de ${D.preliminar.slice(0, 4)} ya está publicado pero llega incompleto (la Policía sigue consolidando registros), así que no se muestra todavía.`;
        if (cfg.nota?.[d]) txt += " " + cfg.nota[d];
        $$("ser-txt").innerHTML = txt;
      }});
  }

  // el mismo periodo (enero al último mes completo) de cada año
  function anual() {
    const k = corte(), d = st.d, todos = D.anios.filter(a => a <= k.y);
    // la serie empieza en el primer año con datos (algunas, como las masacres o las incautaciones, arrancan después de 2003)
    const ini = todos.findIndex(a => anioCorrido(d, a, 12) > 0), A = todos.slice(Math.max(0, ini)), v = A.map(a => anioCorrido(d, a, k.m));
    const X = D.delitos[d];
    const vt = X.tasa ? A.map((a, i) => v[i] / pobAnio(a) * 1e5) : v;
    $$("yc-t").textContent = `${X.n}, ${k.periodoCorto} de cada año` + (X.tasa ? " (por cada 100.000 habitantes)" : "");
    const n = A.length - 1;
    dibujar(`${id}-yc`, {type: "bar", data: {labels: A.map(String), datasets: [{data: vt, backgroundColor: A.map((a, i) => i === n ? css("--grafica") : css("--chip")), borderRadius: 4}]},
      options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {display: false}, gobiernos: {activo: false},
        tooltip: {callbacks: {label: c => X.tasa ? `${num(c.raw, 1)} por 100.000 (${cantidad(d, v[c.dataIndex])})` : cantidad(d, c.raw)}}},
        scales: {x: {grid: {display: false}, ticks: {color: css("--muted")}}, y: {beginAtZero: true, grid: {color: css("--line")}, ticks: {color: css("--muted")}}}}});
    const mx = vt.indexOf(Math.max(...vt)), mn = vt.indexOf(Math.min(...vt));
    $$("yc-txt").innerHTML = `${k.m === 1 ? "En" : "De"} ${k.periodo} se registraron <strong>${cantidad(d, v[n])}</strong>, ` +
      `${signo(v[n], v[n - 1])} frente al mismo periodo de ${k.y - 1} (${cantidad(d, v[n - 1])}). ` +
      `Desde ${A[0]}, el año con la cifra más alta en ese periodo${X.tasa ? " (según la tasa por habitante)" : ""} fue ${A[mx]} y el de la más baja, ${A[mn]}.`;
  }

  function detalle() {
    const X = D.delitos[st.d], dims = Object.keys(X.dims || {}).filter(k => !(cfg.sinDims || []).includes(`${st.d}|${k}`));
    $$("det-box").hidden = !dims.length;
    if (!dims.length) return;
    if (!dims.includes(st.dim)) st.dim = dims[0];
    const DIM = {sexo: "Sexo de la víctima", arma_medio: "Arma o medio", zona: "Zona", spoa_caracterizacion: "Tipo de homicidio", tipo_delito: "Tipo", accion: "Qué pasó",
                 clase_de_bien: "Qué se destruyó", tipo_de_cultivo: "Cultivo"};
    $$("dim").innerHTML = dims.map(k => `<button data-v="${k}"${k === st.dim ? ' class="on"' : ""}>${DIM[k] || k}</button>`).join("");
    seg(`${id}-dim`, x => { st.dim = x; detalle(); });
    const k = corte(), F = D.meses.slice(0, k.iu + 1), cats = X.dims[st.dim];
    // categorías: las cuatro más grandes del último año y el resto como "Otros"
    const peso = c => cats[c].slice(k.iu - 11, k.iu + 1).reduce((a, b) => a + (b || 0), 0);
    const orden = Object.keys(cats).filter(c => !/^(sin dato|no reporta|sin establecer)$/i.test(c)).sort((a, b) => peso(b) - peso(a));
    const top = orden.slice(0, 4), resto = orden.slice(4);
    const ser12 = arr => F.map((f, i) => doce(arr, i));
    const pal = DISTINTOS();
    const series = top.map((c, i) => ({label: c, data: ser12(cats[c]), color: pal[i], ancho: 2.2}));
    if (resto.length) { const o = F.map((f, i) => resto.reduce((s, c) => s + (cats[c][i] || 0), 0)); series.push({label: "Otros", data: ser12(o), color: css("--muted"), ancho: 1.6}); }
    $$("det-t").textContent = `${X.n} según ${(DIM[st.dim] || st.dim).toLowerCase()} (total de 12 meses)`;
    serie(`${id}-det`, F, series, {fmtValor: x => x == null ? "–" : cantidad(st.d, x), eje0: true, inicio: 60, despues: (i0, i1) => {
      const tot = orden.reduce((s, c) => s + (doce(cats[c], i1) || 0), 0) ;
      const partes = top.map(c => [c, doce(cats[c], i1)]).filter(x => x[1] != null);
      $$("det-txt").innerHTML = `En los 12 meses hasta ${MES_L(F[i1])} de ${F[i1].slice(0, 4)}: ` +
        partes.map(([c, v]) => `${c.toLowerCase()}, <strong>${fmt(v / tot * 100, 0)}%</strong>`).join("; ") + ". " + (cfg.notaDim?.[`${st.d}|${st.dim}`] || "");
    }});
  }

  // valor por departamento para un delito y un año (tasa por 100.000 si aplica)
  function valoresDep(d, a) {
    const k = P.anios.indexOf(+a), V = P.delitos[d] || {}, out = {};
    for (const c of Object.keys(P.poblacion)) {
      const v = V[c]?.[k] ?? 0, pob = P.poblacion[c][k];
      out[c] = D.delitos[d].tasa ? (pob ? v / pob * 1e5 : null) : v;
    }
    return out;
  }
  async function mapaDel() {
    const d = st.mapaD, a = st.mapaA, X = D.delitos[d], k = corte(), parcial = +a === P.anio_parcial;
    const M = await json("web/mapa.json"), nombres = {};
    for (const c of Object.keys(M.deptos)) nombres[c] = NOMBRE_DEP[c] || c;
    const valores = valoresDep(d, a), kA = P.anios.indexOf(+a);
    $$("map-t").textContent = `${X.n} por departamento, ${a}${parcial ? ` (${k.periodoCorto})` : ""}`;
    $$("map-h").textContent = (X.tasa ? "Por cada 100.000 habitantes. " : `En ${X.u}. `) + "Entre más oscuro, más alto. " + (parcial ? `Como ${a} no ha terminado, la cifra va de enero a ${MESES_L[k.m - 1]}; no la compares directamente con un año completo.` : "");
    const f = X.tasa ? (x => num(x, 1)) : (x => cantidad(d, x));
    const ytdAnt = P.ytd_ant[d] || {};
    mapa(`${id}-mapa`, valores, nombres, {fmtValor: f, mayorEsMejor: !!cfg.bueno?.includes(d), log: !X.tasa,
      extra: c => { const v = P.delitos[d]?.[c]?.[kA] ?? 0; let t = X.tasa ? `${cantidad(d, v)} en total` : "";
        if (parcial && ytdAnt[c] != null) t += `${t ? " · " : ""}mismo periodo de ${+a - 1}: ${cantidad(d, ytdAnt[c])}`; return t; },
      alClic: c => {
        const A = P.anios.filter(x => x <= k.y), serieDep = cc => A.map(y => { const v = valoresDep(d, y)[cc]; return y === P.anio_parcial ? null : v; });
        const nac = A.map(y => { if (y === P.anio_parcial) return null; const v = anioCorrido(d, y, 12); return X.tasa ? v / pobAnio(y) * 1e5 : v; });
        enElTiempo(`${id}-map-tiempo`, `${X.n} en ${nombres[c]}`, A.map(String),
          [...(X.tasa ? [{label: "Colombia", data: nac, color: css("--muted"), ancho: 1.6}] : []), {label: nombres[c], data: serieDep(c), color: css("--grafica"), ancho: 2.5}],
          {fmtValor: x => x == null ? "–" : f(x), eje0: true, nota: (X.tasa ? "Tasa anual por cada 100.000 habitantes. " : "") + "Solo años completos. Toca otro departamento para cambiarlo."});
      }});
    const o = Object.entries(valores).filter(x => x[1] != null && (X.tasa ? (P.poblacion[x[0]]?.[kA] || 0) > 0 : true)).sort((p, q) => q[1] - p[1]);
    const nacV = anioCorrido(d, +a, parcial ? k.m : 12);
    $$("map-txt").innerHTML = X.tasa ? `La tasa más alta está en <strong>${nombres[o[0][0]]}</strong> (${f(o[0][1])})` +
      ` y la más baja en <strong>${nombres[o.at(-1)[0]]}</strong> (${f(o.at(-1)[1])}). ` :
      `Donde más hubo fue en <strong>${listaY(o.slice(0, 3).map(x => `${nombres[x[0]]} (${f(x[1])})`))}</strong>. ` +
      (X.tasa ? `La de todo el país es ${num(nacV / pobAnio(+a) * 1e5, 1)}. ` : "") +
      (X.tasa ? "En departamentos con poca población, unos pocos casos mueven mucho la tasa." : "");
  }

  function ciudades() {
    const d = st.ciudadD, a = +st.ciudadA, k = C.anios.indexOf(a), X = D.delitos[d], parcial = a === C.anio_parcial, kc = corte();
    const items = Object.entries(C.ciudades).map(([c, x]) => ({id: c, n: `${x.n} (${x.dn})`, v: x.v[d]?.[k] != null && x.pob[k] ? x.v[d][k] / x.pob[k] * 1e5 : 0, abs: x.v[d]?.[k] || 0}))
      .sort((p, q) => q.v - p.v);
    $$("ciu-t").textContent = `${X.n} por cada 100.000 habitantes, ${a}${parcial ? ` (${kc.periodoCorto})` : ""}`;
    barras(`${id}-ciu`, items, {fmtValor: x => num(x, 1), alto: 20, colores: () => css("--grafica"),
      alClic: x => { const c = C.ciudades[x.id], A = C.anios.map(String);
        enElTiempo(`${id}-ciu-tiempo`, `${X.n} en ${c.n}`, A, [{label: "Tasa por 100.000 habitantes", data: C.anios.map((y, i) => y === C.anio_parcial ? null : c.v[d]?.[i] != null && c.pob[i] ? c.v[d][i] / c.pob[i] * 1e5 : null), color: css("--grafica"), ancho: 2.5}],
          {fmtValor: v => v == null ? "–" : num(v, 1), eje0: true, nota: "Solo años completos. Toca otra ciudad para cambiarla."}); }});
    const grandes = items.filter(x => C.ciudades[x.id].pob[k] >= 1e6);
    $$("ciu-txt").innerHTML = `La tasa más alta entre las ciudades de más de 100.000 habitantes es la de <strong>${items[0].n}</strong> (${num(items[0].v, 1)}; ${fmt(items[0].abs, 0)} ${X.u}). ` +
      (grandes.length ? `Entre las ciudades de más de un millón de habitantes: ${grandes.map(x => `${C.ciudades[x.id].n} ${num(x.v, 1)}`).join(", ")}. ` : "") +
      (parcial ? `Como ${a} no ha terminado, las tasas cubren de enero a ${MESES_L[kc.m - 1]}.` : "");
  }

  function render() { kpis(); serieDel(); anual(); detalle(); mapaDel(); if (municipales().length) ciudades(); }
  registrar(id, {iniciar, render});
}

const NOMBRE_DEP = {"05": "Antioquia", "08": "Atlántico", "11": "Bogotá", "13": "Bolívar", "15": "Boyacá", "17": "Caldas", "18": "Caquetá", "19": "Cauca",
  "20": "Cesar", "23": "Córdoba", "25": "Cundinamarca", "27": "Chocó", "41": "Huila", "44": "La Guajira", "47": "Magdalena", "50": "Meta", "52": "Nariño",
  "54": "Norte de Santander", "63": "Quindío", "66": "Risaralda", "68": "Santander", "70": "Sucre", "73": "Tolima", "76": "Valle del Cauca", "81": "Arauca",
  "85": "Casanare", "86": "Putumayo", "88": "San Andrés", "91": "Amazonas", "94": "Guainía", "95": "Guaviare", "97": "Vaupés", "99": "Vichada"};
