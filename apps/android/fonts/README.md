# Tipografías de la app

Los `.ttf` que se empaquetan están en `app/src/main/res/font/`. Son instancias
**estáticas** (sin eje variable) y **subconfiguradas** del Latin de las cuatro
familias de la marca Llégate, que son las mismas que carga la web desde Google
Fonts (`lllegate-sim/index.html`):

| Familia | Uso | Weight |
|---|---|---|
| Bebas Neue | wordmark y títulos display | 400 |
| Outfit | encabezados y etiquetas | 400, 500, 600, 700, 900 |
| DM Sans | texto corrido (fuente base) | 400, 500, 700 |
| JetBrains Mono | montos, códigos y placas | 400, 700 |

Se instancian y subconfiguran así (necesita `pip install fonttools`), porque los
repositorios de Google Fonts ya no traen las instancias estáticas sueltas y el
APK apunta a `minSdk 24`, donde Android todavía no resuelve ejes variables:

```bash
curl -sL -o Outfit.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
curl -sL -o DMSans.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf"
curl -sL -o JetBrainsMono.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
curl -sL -o BebasNeue.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf"

python -m fontTools.varLib.instancer Outfit.ttf wght=700 -o outfit_bold.ttf
python -m fontTools.varLib.instancer DMSans.ttf opsz=14 wght=400 -o dm_sans_regular.ttf

python -m fontTools.subset outfit_bold.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2190-21FF,U+25A0-25FF,U+2700-27BF" \
  --layout-features="kern,liga,calt,tnum,zero,ccmp,mark,mkmk,locl,frac,sups,subs" \
  --output-file=outfit_bold.ttf
```

El rango de Unicode deja el español completo (tildes, ñ, `¿¡`), los símbolos de
moneda y las flechas que usa la interfaz; el resto de los glifos se descarta para
que los 11 archivos pesen 496 KB en total en lugar de los 736 KB que ocupaban las
instancias sin recortar.

## Licencias

Las cuatro familias están bajo la SIL Open Font License 1.1; el texto de cada
una se guarda aquí (`<familia>/OFL.txt`) junto con el aviso de copyright, y viaja
en el repositorio porque el APK distribuye los archivos modificados.
