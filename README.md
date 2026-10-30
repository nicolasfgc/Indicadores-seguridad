# Seguridad en Colombia en datos

Explorador abierto de los indicadores de seguridad en Colombia, mes a mes y con explicaciones en lenguaje sencillo.

**Página:** https://nicolasfgc.github.io/Indicadores-seguridad/

Hecho por **Nicolás González** · [nicolasfgcht@gmail.com](mailto:nicolasfgcht@gmail.com) · [LinkedIn](https://www.linkedin.com/in/nicolas-gonzalezc/). Proyectos hermanos: [Economía colombiana en datos](https://github.com/nicolasfgc/Indicadores-economia-colombiana) · [Educación en Colombia en datos](https://github.com/nicolasfgc/Indicadores-educativos).

## Qué tiene

| Pestaña | Qué muestra |
|---|---|
| Homicidios | Víctimas y tasa por 100.000 habitantes; por sexo, arma, zona y feminicidios; muertes en tránsito |
| Hurtos | A personas, residencias, comercio, vehículos (motos y carros), entidades financieras y piratería terrestre |
| Extorsión, secuestro y conflicto | Extorsión, secuestro simple y extorsivo, masacres, terrorismo, voladuras y Fuerza Pública afectada |
| Violencia en el hogar | Violencia intrafamiliar, delitos sexuales y lesiones personales |
| Narcotráfico | Incautaciones de cocaína, base de coca y bazuco; erradicación de cultivos ilícitos |

Cada pestaña trae la serie mensual (y de 12 meses), la comparación del año corrido con el mismo periodo de años anteriores, el detalle por características, un mapa por departamento y un ranking de ciudades de más de 100.000 habitantes.

## Fuentes

- **Delitos:** Ministerio de Defensa Nacional con datos de la Policía Nacional, en [datos.gov.co](https://www.datos.gov.co) (un conjunto por delito, ver [`datos/catalogo.csv`](datos/catalogo.csv)). Diarios, por municipio, desde 2003; se actualizan cada mes.
- **Población:** DANE, proyecciones de población con base en el Censo 2018 (departamental desde 1993 y municipal desde 2018).

## Notas sobre los datos

- Son **hechos registrados** (denuncias y reportes de la Fuerza Pública). En delitos poco denunciados (hurto, extorsión, violencia intrafamiliar, delitos sexuales) la cifra real es mayor, y los cambios pueden reflejar cambios en la denuncia. El homicidio es el más confiable.
- **El último mes publicado llega incompleto** (la Policía sigue sumando registros por varias semanas): la página no lo muestra y compara con el último mes completo.
- Las **masacres** solo están en esta fuente desde 2022; las incautaciones, desde 2010.

## Cómo funciona

`scripts/delitos.py` consulta datos.gov.co y guarda los agregados en `datos/delitos/`; `scripts/poblacion.py` baja las proyecciones del DANE; `scripts/web.py` prepara los archivos livianos de `web/`. La tarea `.github/workflows/actualizar-datos.yml` corre todo cada día. La página (`index.html` y `assets/`) es estática y se publica con GitHub Pages.

```bash
pip install -r requirements.txt
python scripts/delitos.py && python scripts/poblacion.py && python scripts/web.py
python -m http.server   # y abrir http://localhost:8000
```
