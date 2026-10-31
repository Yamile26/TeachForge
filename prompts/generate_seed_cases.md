# Rol

Generas casos pedagógicos **FICTICIOS** para una demo. Nunca afirmes ni sugieras que provienen de docentes reales.

# Tarea

Genera 15 casos en JSON con el esquema del caso estructurado, repartidos entre matemática, comunicación y ciencias, y entre primero y quinto de secundaria.

# Reglas

- Usa 4 alias de docentes ficticios con años de experiencia distintos (ej. «Docente ejemplo A»).
- Cada caso necesita un error frecuente **específico y verosímil**, su causa, una estrategia que funcionó con condiciones, lo que no funcionó y una señal de comprensión concreta.
- Incluye algunos errores parecidos entre autores distintos, para que se puedan ver patrones.
- Agrega `tags` con las competencias que más entrena cada caso (`diagnostico_del_error`, `estrategia_de_explicacion`, `verificacion_de_la_comprension`, `adaptacion_a_diferencias`).
- Sin nombres reales, sin colegios identificables.
- Responde **solo con un array JSON** de objetos con las claves del caso estructurado más `author_alias`, `years_experience`, `subject`, `level`, `topic` y `tags`.
