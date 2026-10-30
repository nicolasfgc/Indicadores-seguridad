"""
Prepara versiones livianas de los datos para el explorador web (carpeta web/).
Uso:  python scripts/web.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mapa  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "datos"
WEB = RAIZ / "web"

NOMBRES = {  # nombre para mostrar, unidad, si se calcula tasa por 100.000 habitantes
    "homicidio": ("Homicidios", "víctimas", True), "homicidio_transito": ("Muertes en accidentes de tránsito", "víctimas", True),
    "hurto_personas": ("Hurto a personas", "casos", True), "hurto_residencias": ("Hurto a residencias", "casos", True),
    "hurto_comercio": ("Hurto a comercio", "casos", True), "hurto_vehiculos": ("Hurto de vehículos", "vehículos", True),
    "hurto_financieras": ("Hurto a entidades financieras", "casos", False), "pirateria_terrestre": ("Piratería terrestre", "casos", False),
    "extorsion": ("Extorsión", "casos", True), "secuestro": ("Secuestro", "víctimas", True),
    "masacres": ("Masacres", "casos", False), "masacres_victimas": ("Víctimas de masacres", "víctimas", False),
    "terrorismo": ("Terrorismo", "casos", False), "voladuras": ("Voladuras de vías y puentes", "casos", False),
    "fuerza_publica": ("Miembros de la Fuerza Pública asesinados o heridos", "personas", False),
    "violencia_intrafamiliar": ("Violencia intrafamiliar", "casos", True), "delitos_sexuales": ("Delitos sexuales", "casos", True),
    "lesiones": ("Lesiones personales", "casos", True),
    "incautacion_cocaina": ("Cocaína incautada", "kilos", False), "incautacion_base": ("Base de coca incautada", "kilos", False),
    "incautacion_basuco": ("Bazuco incautado", "kilos", False), "erradicacion": ("Erradicación de cultivos ilícitos", "hectáreas", False)}


def guardar(nombre, obj):
    p = WEB / nombre
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"  {nombre}: {p.stat().st_size / 1024:,.0f} KB")


def limpiar(v, dec=0):
    return None if v is None or (isinstance(v, float) and np.isnan(v)) else round(float(v), dec)


def lista(s, claves, dec=0):
    return [limpiar(s.get(k), dec) for k in claves]


def main():
    print("Preparando datos para la web:")
    mapa.main()
    det = pd.read_csv(DATOS / "delitos" / "detalle.csv")
    meses = pd.date_range(det.mes.min(), det.mes.max(), freq="MS").strftime("%Y-%m-%d").tolist()
    # el último mes publicado siempre llega incompleto (la Policía sigue consolidando registros): se marca como preliminar
    prelim, ult = meses[-1], meses[-2]
    out = {"meses": meses, "preliminar": prelim, "ultimo": ult, "delitos": {}}
    for d, g in det.groupby("delito"):
        n, u, tasa = NOMBRES[d]
        x = {"n": n, "u": u, "tasa": tasa, "total": lista(g[g.dimension == "total"].set_index("mes").valor, meses, 1 if "incaut" in d or d == "erradicacion" else 0), "dims": {}}
        for (dim, cat), h in g[g.dimension != "total"].groupby(["dimension", "categoria"]):
            x["dims"].setdefault(dim, {})[cat] = lista(h.set_index("mes").valor, meses)
        out["delitos"][d] = x
    pob = pd.read_csv(DATOS / "poblacion" / "deptos.csv", dtype={"depto": str})
    anios = sorted({int(m[:4]) for m in meses})
    out["anios"] = anios
    out["poblacion"] = lista(pob[pob.depto == "00"].set_index("anio").poblacion, anios)
    guardar("delitos.json", out)

    # por departamento: totales por año (el año en curso, hasta el último mes completo) y el mismo periodo del año anterior
    dep = pd.read_csv(DATOS / "delitos" / "deptos.csv", dtype={"depto": str})
    dep = dep[dep.mes <= ult]
    dep["anio"] = dep.mes.str[:4].astype(int)
    a_act, mes_ult = int(ult[:4]), int(ult[5:7])
    dep["mm"] = dep.mes.str[5:7].astype(int)
    validos = set(mapa_codigos())
    dd = {"anios": anios, "anio_parcial": a_act if mes_ult < 12 else None, "mes_corte": mes_ult, "delitos": {}, "ytd_ant": {}, "poblacion": {}}
    for d, g in dep[dep.depto.isin(validos)].groupby("delito"):
        dd["delitos"][d] = {c: lista(h.groupby("anio").valor.sum(), anios, 1) for c, h in g.groupby("depto")}
        prev = g[(g.anio == a_act - 1) & (g.mm <= mes_ult)]
        dd["ytd_ant"][d] = {c: limpiar(h.valor.sum(), 1) for c, h in prev.groupby("depto")}
    for c, h in pob[pob.depto.isin(validos)].groupby("depto"):
        dd["poblacion"][c] = lista(h.set_index("anio").poblacion, anios)
    guardar("deptos.json", dd)

    # ciudades: municipios de más de 100.000 habitantes
    mu = pd.read_csv(DATOS / "delitos" / "municipios.csv", dtype={"cod_muni": str})
    nm = pd.read_csv(DATOS / "delitos" / "nombres_muni.csv", dtype={"cod_muni": str, "depto": str}).set_index("cod_muni")
    pm = pd.read_csv(DATOS / "poblacion" / "municipios.csv", dtype={"cod_muni": str})
    am = sorted(int(a) for a in mu.anio.unique())
    grandes = pm[(pm.anio == a_act) & (pm.poblacion >= 100000)].cod_muni
    pmuni = pm[pm.cod_muni.isin(grandes)]
    nd = pd.read_csv(DATOS / "poblacion" / "nombres_muni.csv", dtype={"cod_muni": str}).set_index("cod_muni")
    ciudades = {}
    for c in grandes:
        p = pmuni[pmuni.cod_muni == c].set_index("anio").poblacion
        x = mu[mu.cod_muni == c]
        ciudades[c] = {"n": str(nd.municipio.get(c, nm.municipio.get(c, c))), "dn": str(nd.departamento.get(c, "")), "d": c[:2], "pob": lista(p, am),
                       "v": {d: lista(h.set_index("anio").valor, am) for d, h in x.groupby("delito")}}
    percepcion()
    guardar("ciudades.json", {"anios": am, "anio_parcial": a_act if mes_ult < 12 else None, "mes_corte": mes_ult, "ciudades": ciudades})


def percepcion():
    """Encuesta de Convivencia y Seguridad Ciudadana (DANE): series por año y detalle de la edición más reciente."""
    p = DATOS / "percepcion" / "series.csv"
    if not p.exists():
        return
    s = pd.read_csv(p)
    anios = list(range(int(s.anio.min()), int(s.anio.max()) + 1))
    out = {"anios": anios, "series": {}, "edicion": int(s.edicion.max())}
    for (ind, lg), g in s.groupby(["indicador", "lugar"]):
        out["series"].setdefault(ind, {})[lg] = lista(g.set_index("anio").valor, anios, 1)
    t = pd.read_csv(DATOS / "percepcion" / "detalle.csv")
    det = {}
    for tb, g in t.groupby("tabla"):
        if tb == "razones_no_denuncia":
            det[tb] = {gr: {f: round(v, 1) for f, v in zip(h.fila, h.valor)} for gr, h in g.groupby("grupo")}
        else:
            x = {gr: {f: round(v, 1) for f, v in zip(h.fila, h.valor)} for gr, h in g.groupby("grupo")}
            # el DANE repitió por error las cifras de un aspecto en otro: si dos aspectos tienen exactamente las mismas cifras,
            # no se sabe cuál es el correcto y se quitan los dos
            from collections import Counter
            firmas = Counter(tuple(sorted(v.items())) for v in x.values())
            limpio = {gr: v for gr, v in x.items() if firmas[tuple(sorted(v.items()))] == 1 or len(v) <= 3}
            det[tb] = limpio
    out["detalle"] = det
    guardar("percepcion.json", out)


def mapa_codigos():
    return json.loads((WEB / "mapa.json").read_text(encoding="utf-8"))["deptos"].keys()


if __name__ == "__main__":
    main()
