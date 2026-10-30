// Pestaña: Resumen — el dato clave de cada tema y qué significa
const TARJETAS = [
  {d: "homicidio", tab: "homicidios", t: "Homicidios", c: "--s1"},
  {d: "hurto_personas", tab: "hurtos", t: "Hurto a personas", c: "--s2"},
  {d: "extorsion", tab: "conflicto", t: "Extorsión", c: "--s3"},
  {d: "secuestro", tab: "conflicto", t: "Secuestro", c: "--s6"},
  {d: "masacres", tab: "conflicto", t: "Masacres", c: "--s7"},
  {d: "violencia_intrafamiliar", tab: "violencia", t: "Violencia intrafamiliar", c: "--s4"},
  {d: "delitos_sexuales", tab: "violencia", t: "Delitos sexuales", c: "--s8"},
  {d: "incautacion_cocaina", tab: "narcotrafico", t: "Cocaína incautada", c: "--s5"}];
registrar("resumen", (() => {
  async function iniciar() {
    await datosBase();
    $("tab-resumen").querySelector(".tarjetas").innerHTML = TARJETAS.map(x => `<div class="tarjeta"><div class="tt"><h3>${x.t}</h3></div><div class="num" id="r-${x.d}-num"></div>
      <div class="cambio" id="r-${x.d}-cam"></div><div class="mini"><canvas id="r-${x.d}-g"></canvas></div><p id="r-${x.d}-txt"></p><a class="mas" href="#${x.tab}">Ver más ›</a></div>`).join("");
  }
  function mini(id, F, v, color) {
    dibujar(id, {type: "line", data: {labels: F, datasets: [{data: v, borderColor: color, borderWidth: 2, pointRadius: 0, tension: .3, fill: false, spanGaps: true}]},
      options: {responsive: true, maintainAspectRatio: false, animation: false, plugins: {legend: {display: false}, tooltip: {enabled: false}, gobiernos: {activo: false}},
        scales: {x: {display: false}, y: {grid: {color: css("--line")}, ticks: {color: css("--muted"), maxTicksLimit: 3, font: {size: 10},
          callback: v => Math.abs(v) >= 1e6 ? fmt(v / 1e6, 1) + " M" : Math.abs(v) >= 1e3 ? fmt(v / 1e3, 0) + " mil" : fmt(v, v < 10 ? 1 : 0)}}}}});
  }
  function render() {
    const k = corte();
    for (const x of TARJETAS) {
      const X = D.delitos[x.d], a = anioCorrido(x.d, k.y, k.m), b = anioCorrido(x.d, k.y - 1, k.m);
      const bueno = x.d.startsWith("incaut"), sube = a > b;
      $(`r-${x.d}-num`).textContent = cantidad(x.d, a).replace(/ (víctimas|casos|kilos)$/, "");
      $(`r-${x.d}-cam`).textContent = `${X.u === "kilos" ? "incautadas" : X.u}, ${k.periodoCorto} de ${k.y}`;
      const s12 = X.total.map((v, i) => i <= k.iu ? doce(X.total, i) : null), tasa = X.tasa ? doce(X.total, k.iu) / pobAnio(k.y) * 1e5 : null;
      const cambio = b ? a / b - 1 : null, igual = cambio != null && Math.abs(cambio) < 0.02;
      let txt = b ? `En el mismo periodo de ${k.y - 1} fueron ${cantidad(x.d, b)}: <strong>${igual ? "casi igual" : `${sube ? "subió" : "bajó"} ${fmt(Math.abs(cambio) * 100, 1)}%`}</strong>` +
        // solo se califica como mejora o empeoramiento donde la cifra es confiable; en delitos poco denunciados un cambio puede ser más o menos denuncia
        (igual || !["homicidio", "secuestro", "masacres"].includes(x.d) ? "" : sube ? " (empeoró)" : " (mejoró)") + ". " : "";
      if (tasa != null) txt += `En los últimos 12 meses, ${fmt(tasa, 1)} por cada 100.000 habitantes. `;
      txt += {homicidio: "Es el indicador más confiable de violencia.", hurto_personas: "Muchos robos no se denuncian: la cifra real es mayor.",
              extorsion: "Se denuncia muy poco; la mayoría de casos no llega a las autoridades.", masacres: "Asesinatos de tres o más personas al mismo tiempo.",
              incautacion_cocaina: "Más incautación puede ser más eficacia o más producción.",
              violencia_intrafamiliar: "Se denuncia poco: un aumento puede ser más violencia o más denuncias.", delitos_sexuales: "Se denuncia poco: muchas víctimas son niñas, niños y adolescentes."}[x.d] || "";
      $(`r-${x.d}-txt`).innerHTML = txt;
      const i0 = Math.max(11, k.iu - 120);
      mini(`r-${x.d}-g`, D.meses.slice(i0, k.iu + 1), s12.slice(i0, k.iu + 1), css(x.c));
    }
    $("res-nota").innerHTML = `Cifras de enero a ${MESES_L[k.m - 1]} de ${k.y} (el último mes completo), comparadas con el mismo periodo del año anterior. La línea de cada tarjeta es el total de los últimos 12 meses durante los últimos diez años.`;
  }
  return {iniciar, render};
})());
