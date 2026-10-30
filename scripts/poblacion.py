"""
Población de Colombia por departamento y municipio - DANE, proyecciones de población con base en el Censo 2018.
Se usa para calcular tasas por cada 100.000 habitantes (la forma de comparar lugares de distinto tamaño).

  datos/poblacion/deptos.csv      anio | depto | poblacion   (2005 en adelante; depto 00 = Colombia)
  datos/poblacion/municipios.csv  anio | cod_muni | poblacion  (2018 en adelante)

Las proyecciones cambian poco; basta con correrlo de vez en cuando (la tarea automática lo corre si falta el archivo).
Uso:  python scripts/poblacion.py
"""
import io
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import bajar, guardar  # noqa: E402

B = "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/"


def tabla(ruta, hoja_clave):
    hojas = pd.read_excel(io.BytesIO(bajar(B + ruta, timeout=600)), sheet_name=None, header=None, engine="calamine")
    d = next(v for k, v in hojas.items() if hoja_clave.lower() in k.lower() and any(str(d0).strip() == "DP" for d0 in v.iloc[:30, 0]))
    i = next(i for i in range(30) if str(d.iat[i, 0]).strip() == "DP")
    x = d.iloc[i + 1:].copy()
    x.columns = [str(c).strip() for c in d.iloc[i]]
    area = next(c for c in x.columns if "ÁREA" in c.upper())
    x = x[x[area].astype(str).str.strip() == "Total"]
    val = x.columns[-1]
    x["poblacion"] = pd.to_numeric(x[val], errors="coerce")
    x["anio"] = pd.to_numeric(x["AÑO"], errors="coerce").astype(int)
    return x


def main():
    a = tabla("Departamental/DCD-area-proypoblacion-dep-2005-2017_VP.xlsx", "Departamental")
    b = tabla("Departamental/PPED-AreaDep-2018-2050_VP.xlsx", "PobDepartamental")
    c = tabla("Departamental/DCD-areaproypoblacion-dep-1993-2004.xlsx", "")
    d = pd.concat([c[c.anio < 2005], a[a.anio < 2018], b])
    d["depto"] = d.DP.astype(str).str.strip().str.zfill(2)
    d = d[d.anio <= 2035][["anio", "depto", "poblacion"]]
    nac = d.groupby("anio", as_index=False).poblacion.sum().assign(depto="00")
    guardar(pd.concat([d, nac]), "poblacion", "deptos.csv", ["anio", "depto"])
    m = tabla("Municipal/PPED-AreaMun-2018-2042_VP.xlsx", "PobMunicipal")
    m["cod_muni"] = m.MPIO.astype(str).str.strip().str.zfill(5)
    nombres = m.drop_duplicates("cod_muni")[["cod_muni", "DPMP", "DPNOM"]].rename(columns={"DPMP": "municipio", "DPNOM": "departamento"})
    guardar(nombres, "poblacion", "nombres_muni.csv", ["cod_muni"])
    m = m[m.anio <= 2035][["anio", "cod_muni", "poblacion"]]
    guardar(m, "poblacion", "municipios.csv", ["anio", "cod_muni"])
    print("Colombia 2026:", int(nac[nac.anio == 2026].poblacion.iloc[0]))


if __name__ == "__main__":
    main()
