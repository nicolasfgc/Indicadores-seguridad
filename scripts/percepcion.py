"""
Percepción de seguridad y victimización - DANE, Encuesta de Convivencia y Seguridad Ciudadana (ECSC).

Es una encuesta anual a personas de 15 años y más: pregunta si fueron víctimas de algún delito, si lo denunciaron
y qué tan seguras se sienten. Sirve para ver lo que las denuncias no muestran (la mayoría de delitos no se denuncia).
Se toma de los anexos que publica el DANE: la edición más reciente desde la página de la encuesta y las anteriores
desde la página de históricos. Cada edición trae el total nacional, cabeceras, zona rural y 28 ciudades principales.

Salida:
  datos/percepcion/series.csv   anio | indicador | lugar | valor | edicion   (%, todas las ediciones disponibles)
       anio: el año al que se refiere el dato (la victimización y la denuncia son del año anterior a la encuesta)
       indicador: inseguridad_ciudad, inseguridad_barrio, victimizacion, denuncia
  datos/percepcion/detalle.csv  edicion | tabla | grupo | fila | valor  (solo la edición más reciente, total nacional
       y 28 ciudades): razones para no denunciar, qué causa inseguridad, sensación al caminar solo, confianza en la justicia

Uso:  python scripts/percepcion.py
"""
import io
import re
import sys
import unicodedata
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import bajar, guardar  # noqa: E402

DANE = "https://www.dane.gov.co"
PAGINAS = ["/index.php/estadisticas-por-tema/seguridad-y-defensa/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc",
           "/index.php/estadisticas-por-tema/seguridad-y-defensa/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc-historicos"]


def plano(x):
    return " ".join(unicodedata.normalize("NFKD", str(x)).encode("ascii", "ignore").decode().lower().split())


def anexos():
    """{edición: url} de los anexos principales (no los de necesidades jurídicas)."""
    out = {}
    for p in PAGINAS:
        html = bajar(DANE + p).decode("utf-8", "ignore")
        for u in set(re.findall(r'href="([^"]+\.xlsx?)"', html)):
            if "neces" in u.lower() or "nj" in u.lower().split("/")[-1].split("-"):
                continue
            m = re.search(r"(?:anex-ECSC-|anexos_ecsc_)(\d{4})\.xlsx?$", u, re.I)
            if m:
                out[int(m.group(1))] = u if u.startswith("http") else DANE + u
    return out


def titulo(d):
    return plano(" ".join(str(v) for v in d.iloc[:13, :3].values.ravel() if str(v) != "nan"))


def tabla(d, primera=("ciudad",)):
    """Lee un cuadro: devuelve (filas, columnas) donde columnas = [(etiqueta_superior, etiqueta_inferior, índice de la columna %)]."""
    i = next((i for i in range(min(25, len(d))) if plano(d.iat[i, 0]) in primera), None)
    if i is None:
        return None, None
    j = next(j for j in range(i, i + 6) if any(plano(v) == "%" for v in d.iloc[j]))   # fila donde dice "%"
    cols = []
    for c in range(d.shape[1]):
        if plano(d.iat[j, c]) != "%":
            continue
        etq = []
        for r in range(i, j):   # para cada piso del encabezado, la etiqueta más cercana hacia la izquierda
            k = c
            while k > 0 and str(d.iat[r, k]) == "nan":
                k -= 1
            etq.append(" ".join(str(d.iat[r, k]).split()) if k > 0 else "")
        cols.append((etq, c))
    filas = []
    for r in range(j + 1, len(d)):
        n = str(d.iat[r, 0]).strip()
        if n == "nan" or n.lower().startswith(("fuente", "nota")):
            if filas:
                break
            continue
        filas.append((r, " ".join(n.split())))
    return filas, cols


def valor(d, r, c):
    return pd.to_numeric(d.iat[r, c], errors="coerce")


LUGAR = {"total nacional": "Total nacional", "cabeceras": "Cabeceras", "centro poblado y rural disperso": "Zona rural",
         "total 28 ciudades": "28 ciudades", "total 13 ciudades": "13 ciudades"}


def lugar(n):
    p = plano(n).rstrip("*")
    return LUGAR.get(p, n.rstrip("*").replace("Bogotá D.C.", "Bogotá").strip())


def series(ed, hojas):
    out = []
    for nombre, d in hojas.items():
        t = titulo(d)
        ind, filtro = None, None
        if "percepcion" in t and "ciudad o municipio" in t and "aspectos" not in t and "insegur" in t + plano(d.iloc[:16].values.ravel()):
            ind, filtro = "inseguridad_ciudad", "insegur"
        elif "percepcion" in t and "barrio" in t and "insegur" in t and "aspectos" not in t and "caminar" not in t and "lugar" not in t:
            ind, filtro = "inseguridad_barrio", "insegur"
        elif "victimizacion a personas" in t and ("sexo" in t or "segun sexo" in plano(d.iloc[:12].values.ravel())):
            ind = "victimizacion"
        elif "denuncia y no denuncia" in t:
            ind, filtro = "denuncia", "denuncia"
        if not ind:
            continue
        filas, cols = tabla(d)
        if not filas:
            continue
        if filtro:   # la primera columna de % bajo la etiqueta buscada (ej. "Inseguro", "Denuncia" y no "No denuncia")
            c = next((c for etq, c in cols if any(plano(e).startswith(filtro) for e in etq)), cols[0][1])
        else:
            c = cols[0][1]
        # año al que se refiere el dato: la victimización es del año anterior a la encuesta y la percepción, del año en que se pregunta
        anios = [int(a) for a in re.findall(r"\b(20[12]\d)\b", t)]
        anio = anios[-1] if anios else ed
        for r, n in filas:
            v = valor(d, r, c)
            if pd.notna(v):
                out.append((anio, ind, lugar(n), float(v), ed))
    return out


def detalle(ed, hojas):
    out = []
    for nombre, d in hojas.items():
        t = titulo(d)
        if "razones no denuncia" in t:
            filas, cols = tabla(d, ("razones no denuncia",))
            for r, n in filas or []:
                for etq, c in cols:
                    v = valor(d, r, c)
                    if pd.notna(v):
                        out.append((ed, "razones_no_denuncia", etq[-1], n, float(v)))
            continue
        clave = ("aspectos_inseguridad" if "aspectos que caus" in t and "ciudad o municipio" in t else
                 "caminar_solo" if "caminar solo" in t else
                 "desempeno_justicia" if "desempeno de las instituciones" in t else None)
        if not clave:
            continue
        filas, cols = tabla(d)
        for r, n in filas or []:
            if lugar(n) not in ("Total nacional", "28 ciudades") and clave != "aspectos_inseguridad":
                continue
            for etq, c in cols:
                v = valor(d, r, c)
                if pd.notna(v):
                    out.append((ed, clave, " · ".join(e for e in etq if e and plano(e) not in ("ciudad",)), lugar(n), float(v)))
    return out


def main():
    urls = anexos()
    print("Ediciones:", sorted(urls))
    todo = []
    for ed, u in sorted(urls.items()):
        hojas = pd.read_excel(io.BytesIO(bajar(u, timeout=300)), sheet_name=None, header=None, engine="calamine")
        s = series(ed, hojas)
        todo += s
        nac = {(i, a): round(v, 1) for a, i, lg, v, e in s if lg == "Total nacional"}
        print(f"  {ed}: {len(s)} datos | nacional: {nac}")
    # si un cuadro aparece dos veces (con y sin incidentes de seguridad digital), queda el último: el que los incluye
    d = pd.DataFrame(todo, columns=["anio", "indicador", "lugar", "valor", "edicion"]).drop_duplicates(["anio", "indicador", "lugar"], keep="last")
    guardar(d, "percepcion", "series.csv", ["anio", "indicador", "lugar"])
    ult = max(urls)
    hojas = pd.read_excel(io.BytesIO(bajar(urls[ult], timeout=300)), sheet_name=None, header=None, engine="calamine")
    det = pd.DataFrame(detalle(ult, hojas), columns=["edicion", "tabla", "grupo", "fila", "valor"]).drop_duplicates(["tabla", "grupo", "fila"])
    guardar(det, "percepcion", "detalle.csv", ["tabla", "grupo", "fila"])


if __name__ == "__main__":
    main()
