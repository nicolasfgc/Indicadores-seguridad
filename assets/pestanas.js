// Configuración de cada pestaña de delitos (ver tema.js)
pestanaDelitos({id: "homicidios", delitos: ["homicidio", "homicidio_transito"], sinDims: [],
  corto: {homicidio: "Homicidios", homicidio_transito: "Muertes en tránsito"},
  intro: "El homicidio es el delito más confiable para medir la violencia: casi todos se registran. Se cuentan víctimas.",
  exp: {homicidio: [["Homicidio", "Toda muerte causada intencionalmente por otra persona, con cualquier arma o medio."],
                    ["Feminicidio", "Homicidio de una mujer por el hecho de ser mujer o por motivos de género. Está incluido en el total."],
                    ["Tasa por 100.000", "Cuántas personas son asesinadas por cada 100.000 habitantes en un año. Permite comparar lugares y años de distinto tamaño."]],
        homicidio_transito: [["Muertes en tránsito", "Personas que mueren en accidentes de tránsito (choques, atropellos, caídas de moto). No son homicidios intencionales, pero la Policía los registra como homicidio culposo."]]},
  notaDim: {"homicidio|sexo": "Más de 9 de cada 10 víctimas son hombres.", "homicidio|arma_medio": "Las armas de fuego están detrás de la mayoría de homicidios en Colombia."}});

pestanaDelitos({id: "hurtos", delitos: ["hurto_personas", "hurto_residencias", "hurto_comercio", "hurto_vehiculos", "hurto_financieras", "pirateria_terrestre"],
  corto: {hurto_personas: "A personas", hurto_residencias: "A residencias", hurto_comercio: "A comercio", hurto_vehiculos: "De vehículos", hurto_financieras: "A bancos", pirateria_terrestre: "Piratería terrestre"},
  intro: "Robos registrados por la Policía. Mucha gente no denuncia un robo, así que estas cifras se quedan cortas y suben o bajan también según qué tan fácil sea denunciar.",
  exp: {hurto_personas: [["Hurto a personas", "Robo de lo que una persona lleva consigo (celular, billetera, bolso), con o sin violencia: atraco, raponazo, cosquilleo."],
                         ["Ojo con las denuncias", "Desde que se puede denunciar por internet se registran más hurtos; parte de las subidas puede ser más denuncia y no más robos."]],
        hurto_vehiculos: [["Hurto de vehículos", "Robo de carros, motos y otros automotores. La gran mayoría son motos."]],
        pirateria_terrestre: [["Piratería terrestre", "Robo de mercancía que se transporta por carretera, por ejemplo asaltando camiones."]]}});

pestanaDelitos({id: "conflicto", delitos: ["extorsion", "secuestro", "masacres", "masacres_victimas", "terrorismo", "fuerza_publica", "voladuras"],
  corto: {extorsion: "Extorsión", secuestro: "Secuestro", masacres: "Masacres", masacres_victimas: "Víctimas de masacres", terrorismo: "Terrorismo", fuerza_publica: "Fuerza Pública", voladuras: "Voladuras"},
  intro: "Delitos ligados al crimen organizado y al conflicto armado: extorsión, secuestro, masacres y ataques.",
  exp: {extorsion: [["Extorsión", "Obligar a alguien a dar plata o hacer algo bajo amenaza. Incluye la “vacuna” a comerciantes y la extorsión por celular desde las cárceles. Se denuncia muy poco."]],
        secuestro: [["Secuestro simple", "Retener a una persona contra su voluntad."], ["Secuestro extorsivo", "Retenerla para pedir algo a cambio, casi siempre plata."]],
        masacres: [["Masacre", "El asesinato de tres o más personas al mismo tiempo, en el mismo lugar y por los mismos autores. Esta serie arranca en 2022."]],
        masacres_victimas: [["Víctimas de masacres", "Personas asesinadas en masacres. Esta serie arranca en 2022."]],
        terrorismo: [["Terrorismo", "Ataques que buscan generar terror en la población: explosivos, hostigamientos, ataques a instalaciones."]],
        fuerza_publica: [["Fuerza Pública", "Soldados y policías asesinados o heridos en servicio."]]},
  nota: {masacres: "Las masacres solo se registran en esta fuente desde 2022.", masacres_victimas: "Las masacres solo se registran en esta fuente desde 2022."}});

pestanaDelitos({id: "violencia", delitos: ["violencia_intrafamiliar", "delitos_sexuales", "lesiones"], sinDims: ["violencia_intrafamiliar|zona", "delitos_sexuales|zona"],
  corto: {violencia_intrafamiliar: "Violencia intrafamiliar", delitos_sexuales: "Delitos sexuales", lesiones: "Lesiones personales"},
  intro: "Violencias que pasan muchas veces dentro de la casa o entre conocidos. Se denuncian poco: las cifras muestran solo una parte.",
  exp: {violencia_intrafamiliar: [["Violencia intrafamiliar", "Maltrato físico o psicológico a un miembro de la familia o de la pareja."]],
        delitos_sexuales: [["Delitos sexuales", "Abuso, acoso, acceso carnal violento y demás delitos contra la libertad sexual. Muchas víctimas son niñas, niños y adolescentes."]],
        lesiones: [["Lesiones personales", "Cuando una persona le causa una herida o daño físico a otra, sin contar los accidentes de tránsito."]]},
  notaDim: {"delitos_sexuales|sexo": "La gran mayoría de las víctimas son mujeres."}});

pestanaDelitos({id: "narcotrafico", delitos: ["incautacion_cocaina", "incautacion_base", "incautacion_basuco", "erradicacion"], bueno: ["incautacion_cocaina", "incautacion_base", "incautacion_basuco", "erradicacion"],
  corto: {incautacion_cocaina: "Cocaína incautada", incautacion_base: "Base de coca incautada", incautacion_basuco: "Bazuco incautado", erradicacion: "Erradicación"},
  intro: "Resultados de la Fuerza Pública contra el narcotráfico. Más incautaciones pueden significar más eficacia, pero también que se está produciendo más droga.",
  exp: {incautacion_cocaina: [["Cocaína incautada", "Kilos de clorhidrato de cocaína (el producto final) que la Fuerza Pública le quitó al narcotráfico."]],
        incautacion_base: [["Base de coca", "Pasta intermedia entre la hoja de coca y la cocaína."]],
        erradicacion: [["Erradicación", "Hectáreas de cultivos ilícitos (sobre todo coca) arrancadas o destruidas por la Fuerza Pública."]]}});
