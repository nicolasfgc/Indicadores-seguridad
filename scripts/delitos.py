"""
Delitos y operaciones de la Fuerza Pública - Ministerio de Defensa Nacional, con datos de la Policía Nacional,
publicados en datos.gov.co. Cada conjunto trae un registro por día, municipio y característica (sexo, arma, zona...),
desde 2003, y se actualiza cada mes.

Las cifras son hechos registrados (denuncias y reportes de la Fuerza Pública): en delitos que la gente denuncia poco,
como el hurto o la extorsión, muestran solo una parte de lo que ocurre, y cambian cuando cambia la facilidad de denunciar.

Salida (formato largo):
  datos/delitos/deptos.csv      mes | delito | depto | valor          (depto = código DANE de 2 dígitos)
  datos/delitos/detalle.csv     mes | delito | dimension | categoria | valor   (nacional, por sexo, arma, zona, tipo...)
  datos/delitos/municipios.csv  anio | delito | cod_muni | valor     (solo los delitos principales, desde 2018)
  datos/delitos/nombres_muni.csv  cod_muni | municipio | depto

Uso:  python scripts/delitos.py
"""
import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import guardar, soql  # noqa: E402

# id del delito: (conjunto, columna con la cifra, dimensiones que se guardan)
DELITOS = {
    "homicidio": ("m8fd-ahd9", "cantidad", ["sexo", "arma_medio", "zona", "spoa_caracterizacion"]),
    "hurto_personas": ("4rxi-8m8d", "cantidad", []),
    "hurto_residencias": ("7mn7-vzqp", "cantidad", []),
    "hurto_comercio": ("7i2x-h5vp", "cantidad", []),
    "hurto_vehiculos": ("csb4-y6v2", "cantidad", ["tipo_delito"]),
    "hurto_financieras": ("i7h7-wmjc", "cantidad", []),
    "pirateria_terrestre": ("sutf-7dyz", "cantidad", []),
    "extorsion": ("q2ib-t9am", "cantidad", []),
    "secuestro": ("d7zw-hpf4", "cantidad", ["tipo_delito"]),
    "masacres": ("u8eq-92tb", "casos", []),
    "masacres_victimas": ("u8eq-92tb", "victimas", []),
    "terrorismo": ("yi5j-5fe9", "cantidad", ["zona"]),
    "voladuras": ("m98b-cdys", "cantidad", ["clase_de_bien"]),
    "fuerza_publica": ("8rpn-wpty", "cantidad", ["accion"]),
    "violencia_intrafamiliar": ("gepp-dxcs", "cantidad", ["zona"]),
    "delitos_sexuales": ("bz43-8ahq", "cantidad", ["sexo", "zona"]),
    "lesiones": ("jr6v-i33g", "cantidad", ["sexo"]),
    "homicidio_transito": ("uav5-b85g", "cantidad", []),
    "incautacion_cocaina": ("26zg-9p9r", "cantidad", []),
    "incautacion_base": ("nxbk-nikm", "cantidad", []),
    "incautacion_basuco": ("3cjd-phaj", "cantidad", []),
    "erradicacion": ("p72f-qcvk", "cantidad", ["tipo_de_cultivo"]),
}
MUNICIPALES = ["homicidio", "hurto_personas", "extorsion", "violencia_intrafamiliar", "delitos_sexuales", "hurto_vehiculos"]
LIMPIAR = {"ARTICULO 168. SECUESTRO SIMPLE": "Secuestro simple", "ARTICULO 169. SECUESTRO EXTORSIVO": "Secuestro extorsivo",
           "ARTICULO 239. HURTO MOTOCICLETAS": "Motos", "ARTICULO 239. HURTO AUTOMOTORES": "Carros y otros automotores",
           "HOMICIDIO INTENCIONAL O CON DOLO": "Homicidio intencional", "FEMINICIDIO": "Feminicidio",
           "ASESINADO": "Asesinados", "HERIDO": "Heridos", "VIAS PUBLICAS": "Vías", "PUENTE": "Puentes"}


def consulta(conj, val, extra=""):
    sel = f"date_trunc_ym(fecha_hecho) as mes, {extra + ', ' if extra else ''}sum({val}) as valor"
    d = soql(conj, select=sel, group="mes" + (f", {extra}" if extra else ""), limit=500000)
    d["mes"] = d.mes.str[:10]
    d["valor"] = pd.to_numeric(d.valor, errors="coerce").fillna(0)
    return d


def bonito(v):
    v = str(v).strip()
    if v in LIMPIAR:
        return LIMPIAR[v]
    if v in ("", "nan", "-", "NO REPORTADO", "NO REPORTADA", "SIN DATO"):
        return "Sin dato"
    return v[:1].upper() + v[1:].lower()


def main():
    deptos, detalle, munis, nombres = [], [], [], {}
    for delito, (conj, val, dims) in DELITOS.items():
        d = consulta(conj, val, "cod_depto")
        d["depto"] = d.cod_depto.fillna("").str.strip().str.zfill(2)
        deptos.append(d.groupby(["mes", "depto"], as_index=False).valor.sum().assign(delito=delito))
        detalle.append(d.groupby("mes", as_index=False).valor.sum().assign(delito=delito, dimension="total", categoria="Total"))
        for dim in dims:
            x = consulta(conj, val, dim)
            x["categoria"] = x[dim].map(bonito)
            detalle.append(x.groupby(["mes", "categoria"], as_index=False).valor.sum().assign(delito=delito, dimension=dim))
        if delito in MUNICIPALES:
            m = soql(conj, select=f"date_extract_y(fecha_hecho) as anio, cod_muni, max(municipio) as municipio, max(cod_depto) as depto, sum({val}) as valor",
                     where="fecha_hecho >= '2018-01-01'", group="anio, cod_muni", limit=500000)
            m["valor"] = pd.to_numeric(m.valor)
            m["cod_muni"] = m.cod_muni.str.strip().str.zfill(5)
            nombres.update({r.cod_muni: (r.municipio, str(r.depto).zfill(2)) for r in m.itertuples()})
            munis.append(m[["anio", "cod_muni", "valor"]].assign(delito=delito))
        u = d.mes.max()
        print(f"  {delito}: último mes {u} = {d[d.mes == u].valor.sum():,.0f}")
        time.sleep(1)
    guardar(pd.concat(deptos)[["mes", "delito", "depto", "valor"]], "delitos", "deptos.csv", ["mes", "delito", "depto"])
    guardar(pd.concat(detalle)[["mes", "delito", "dimension", "categoria", "valor"]], "delitos", "detalle.csv", ["mes", "delito", "dimension", "categoria"])
    mu = pd.concat(munis)
    mu["anio"] = mu.anio.astype(int)
    guardar(mu.groupby(["anio", "delito", "cod_muni"], as_index=False).valor.sum(), "delitos", "municipios.csv", ["anio", "delito", "cod_muni"])
    guardar(pd.DataFrame([(k, v[0], v[1]) for k, v in nombres.items()], columns=["cod_muni", "municipio", "depto"]), "delitos", "nombres_muni.csv", ["cod_muni"])


if __name__ == "__main__":
    main()
