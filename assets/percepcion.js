// Pestaña: Percepción — Encuesta de Convivencia y Seguridad Ciudadana del DANE (anual)
registrar("percepcion", (() => {
  let E = null;
  const st = {cInd: "inseguridad_ciudad", cAnio: null, razon: "Hurto a personas"};
  const IND = {inseguridad_ciudad: "Se siente insegura en su ciudad o municipio", inseguridad_barrio: "Se siente insegura en su barrio o vereda",
               victimizacion: "Fue víctima de algún delito", denuncia: "De las víctimas, denunció"};
  const p1 = x => x == null ? "–" : fmt(x, 1) + "%";
  const ultimo = arr => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return i; return -1; };
  const anteriorA = (arr, i) => { for (let k = i - 1; k >= 0; k--) if (arr[k] != null) return k; return -1; };
  const S = (ind, lg = "Total nacional") => E.series[ind]?.[lg] || [];
  const corto = t => t.replace(/^Porque (hay |existen )?/, "").replace(/^Por /, "").replace(/^usted, familiares o amigos han sido víctimas de /, "Usted o alguien cercano sufrió ").replace(/ \(.*\)$/, "");

  async function iniciar() {
    E = await json("web/percepcion.json");
    seg("per-cind", x => { st.cInd = x; anioCiudades(); ciudades(); });
    const R = Object.keys(E.detalle.razones_no_denuncia || {});
    $("per-razon").innerHTML = R.map(r => `<button data-v="${r}"${r === st.razon ? ' class="on"' : ""}>${r.replace("Hurto de ganado, semovientes o aves de corral", "Hurto de ganado").replace("Extorsión o intento de extorsión", "Extorsión").replace("Incidentes de seguridad digital", "Seguridad digital")}</button>`).join("");
    seg("per-razon", x => { st.razon = x; razones(); });
    anioCiudades();
  }

  function anioCiudades() {
    // años en que hay dato para la mayoría de ciudades
    const A = E.anios.filter((a, i) => Object.values(E.series[st.cInd] || {}).filter(v => v[i] != null).length > 10);
    if (!A.includes(+st.cAnio)) st.cAnio = String(A.at(-1));
    opciones($("per-canio"), A.slice().reverse().map(a => [a, a]), st.cAnio);
    $("per-canio").onchange = () => { st.cAnio = $("per-canio").value; ciudades(); };
  }

  function evolucion() {
    const A = E.anios.map(String), pal = DISTINTOS();
    serie("per-insg", A, [{label: "En su ciudad o municipio", data: S("inseguridad_ciudad"), color: css("--grafica"), ancho: 2.5},
      {label: "En su barrio o vereda", data: S("inseguridad_barrio"), color: pal[2], ancho: 2.5},
      {label: "28 ciudades principales, en su ciudad", data: S("inseguridad_ciudad", "28 ciudades"), color: css("--muted"), ancho: 1.6, dash: [4, 3]}],
      {fmtValor: p1, eje0: true, despues: () => {
        const c = S("inseguridad_ciudad"), b = S("inseguridad_barrio"), i = ultimo(c), j = anteriorA(c, i), c28 = S("inseguridad_ciudad", "28 ciudades");
        $("per-insg-txt").innerHTML = `En <strong>${A[i]}</strong>, <strong>${fmt(c[i], 0)} de cada 100 personas</strong> de 15 años o más se sentían inseguras en su ciudad o municipio` +
          (j >= 0 ? ` (en ${A[j]}, ${p1(c[j])})` : "") + `, pero solo ${fmt(b[i], 0)} de cada 100 en su propio barrio o vereda. ` +
          `En las 28 ciudades principales la sensación de inseguridad es más alta: ${p1(c28[i])}. La gente suele sentirse más segura en el entorno que conoce que en la ciudad en general.`;
      }});
    serie("per-vict", A, [{label: "Fue víctima de algún delito", data: S("victimizacion"), color: css("--grafica"), ancho: 2.5},
      {label: "De las víctimas, denunció", data: S("denuncia"), color: pal[1], ancho: 2.5}], {fmtValor: p1, eje0: true, despues: () => {
        const v = S("victimizacion"), d = S("denuncia"), i = ultimo(v), k = ultimo(d);
        $("per-vict-txt").innerHTML = `En <strong>${A[i]}</strong>, <strong>${p1(v[i])}</strong> de las personas de 15 años o más fueron víctimas de al menos un delito (hurto, extorsión, riñas, incidentes digitales…). ` +
          `Y de las víctimas, <strong>solo ${fmt(d[k], 0)} de cada 100 denunciaron</strong>: ${fmt(100 - d[k], 0)} de cada 100 víctimas nunca acudieron a las autoridades. ` +
          `Por eso las cifras de la Policía (en las otras pestañas) se quedan cortas, sobre todo en hurto y extorsión. ` +
          `Ojo al comparar entre años: desde 2020 la victimización incluye incidentes de seguridad digital y las preguntas han cambiado algo entre ediciones.`;
      }});
  }

  function ciudades() {
    const i = E.anios.indexOf(+st.cAnio), V = E.series[st.cInd] || {};
    const fuera = ["Total nacional", "Cabeceras", "Zona rural", "28 ciudades", "13 ciudades"];
    const items = Object.entries(V).filter(([lg, v]) => !fuera.includes(lg) && v[i] != null).map(([lg, v]) => ({id: lg, n: lg, v: v[i]})).sort((a, b) => b.v - a.v);
    const nac = V["Total nacional"]?.[i];
    $("per-ciu-t").textContent = `${IND[st.cInd]}, por ciudad, ${st.cAnio}`;
    barras("per-ciu", items, {fmtValor: p1, alto: 22, colores: () => css("--grafica"),
      alClic: x => enElTiempo("per-ciu-tiempo", `${IND[st.cInd]}: ${x.n}`, E.anios.map(String),
        [{label: "Total nacional", data: V["Total nacional"] || [], color: css("--muted"), ancho: 1.6}, {label: x.n, data: V[x.n], color: css("--grafica"), ancho: 2.5}],
        {fmtValor: p1, eje0: true, nota: "Toca otra ciudad para cambiarla."})});
    if (!items.length) { $("per-ciu-txt").textContent = ""; return; }
    $("per-ciu-txt").innerHTML = `La cifra más alta está en <strong>${items[0].n}</strong> (${p1(items[0].v)}) y la más baja en <strong>${items.at(-1).n}</strong> (${p1(items.at(-1).v)})` +
      (nac != null ? `; el total nacional es ${p1(nac)}` : "") + `. Son resultados de una encuesta: en las ciudades pequeñas tienen más margen de error.`;
  }

  function razones() {
    const R = E.detalle.razones_no_denuncia?.[st.razon] || {};
    const items = Object.entries(R).filter(([k]) => !/^otra/i.test(k)).map(([k, v]) => ({id: k, n: k, v})).sort((a, b) => b.v - a.v);
    $("per-raz-t").textContent = `¿Por qué no denunciaron? ${st.razon}, ${E.edicion}`;
    barras("per-raz", items, {fmtValor: p1, alto: 30, colores: () => css("--grafica")});
    $("per-raz-txt").innerHTML = items.length ? `La razón más común es <strong>“${items[0].n.toLowerCase()}”</strong> (${p1(items[0].v)}), seguida de “${items[1].n.toLowerCase()}” (${p1(items[1].v)}). ` +
      `Porcentaje de las víctimas que no denunciaron, según la razón principal.` : "";
  }

  function causas() {
    const A = E.detalle.aspectos_inseguridad || {};
    const items = Object.entries(A).map(([k, v]) => ({id: k, n: corto(k).replace(/^./, c => c.toUpperCase()), v: v["Total nacional"]})).filter(x => x.v != null).sort((a, b) => b.v - a.v);
    barras("per-cau", items, {fmtValor: p1, alto: 30, colores: () => css("--grafica")});
    $("per-cau-txt").innerHTML = `De quienes se sienten inseguros, <strong>${fmt(items[0].v, 0)} de cada 100</strong> lo atribuyen a “${items[0].n.toLowerCase()}” y ${fmt(items[1].v, 0)} a “${items[1].n.toLowerCase()}”. ` +
      `Cada persona podía dar varias razones, por eso los porcentajes suman más de 100. El DANE publicó con un error las cifras de la presencia de grupos armados y de la falta de empleo (salen idénticas), así que no se muestran.`;
  }

  function otros() {
    const C = E.detalle.caminar_solo || {}, J = E.detalle.desempeno_justicia || {};
    const n = k => C[k]?.["Total nacional"];
    const orden = ["Muy seguro(a)", "Seguro(a)", "Inseguro(a)", "Muy inseguro(a)", "Nunca sale solo(a) de noche"];
    const pal = [css("--verde"), css("--s4"), css("--naranja"), css("--rojo"), css("--muted")];
    dibujar("per-cam", {type: "bar", data: {labels: ["Total nacional"], datasets: orden.map((k, i) => ({label: k, data: [n(k)], backgroundColor: pal[i], borderRadius: 4}))},
      options: {indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: {legend: leyendaRecordada("per-cam"), gobiernos: {activo: false}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${p1(c.raw)}`}}},
        scales: {x: {stacked: true, max: 100, ticks: {color: css("--muted"), callback: v => v + "%"}, grid: {color: css("--line")}}, y: {stacked: true, display: false}}}});
    const j = (a, b) => J[`${a} · ${b}`]?.["Total nacional"];
    $("per-otros-txt").innerHTML = `<strong>${fmt((n("Inseguro(a)") || 0) + (n("Muy inseguro(a)") || 0), 0)} de cada 100</strong> personas se sienten inseguras o muy inseguras caminando solas de noche por su barrio, y ${fmt(n("Nunca sale solo(a) de noche"), 0)} de cada 100 nunca lo hacen. ` +
      (j("Fiscalía", "Mucho (Alto)") != null ? `Sobre la justicia: solo ${fmt(j("Fiscalía", "Mucho (Alto)"), 0)} de cada 100 creen que la Fiscalía contribuye mucho a la seguridad y ${fmt(j("Jueces", "Mucho (Alto)"), 0)} de cada 100 lo creen de los jueces; ${fmt(j("Fiscalía", "Nada (cero)"), 0)} de cada 100 creen que la Fiscalía no aporta nada. Esa desconfianza ayuda a entender por qué tan poca gente denuncia.` : "");
  }

  function render() {
    const c = S("inseguridad_ciudad"), b = S("inseguridad_barrio"), v = S("victimizacion"), d = S("denuncia"), A = E.anios;
    const ic = ultimo(c), iv = ultimo(v), id = ultimo(d), ib = ultimo(b);
    $("per-ultima").textContent = `Encuesta ${E.edicion}`;
    $("per-k1").textContent = p1(c[ic]); $("per-k1d").textContent = `se siente insegura en su ciudad (${A[ic]})`;
    $("per-k2").textContent = p1(b[ib]); $("per-k2d").textContent = `se siente insegura en su barrio (${A[ib]})`;
    $("per-k3").textContent = p1(v[iv]); $("per-k3d").textContent = `fue víctima de algún delito (${A[iv]})`;
    $("per-k4").textContent = `${fmt(100 - d[id], 0)} de 100`; $("per-k4d").textContent = `víctimas no denunció (${A[id]})`;
    evolucion(); ciudades(); razones(); causas(); otros();
  }
  return {iniciar, render};
})());
