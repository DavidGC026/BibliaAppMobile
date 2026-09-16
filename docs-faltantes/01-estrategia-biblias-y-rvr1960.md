# Estrategia legal y técnica para las Biblias

Estado revisado el 15 de julio de 2026.

## Objetivo

Lanzar BibliaAPP con textos bíblicos que puedan distribuirse legalmente desde el primer día, conseguir usuarios reales y utilizar esas métricas para solicitar posteriormente una licencia directa de Reina-Valera 1960.

Los códigos de acceso no eliminan las obligaciones de derechos de autor. Si BibliaAPP almacena y entrega una traducción protegida, sigue existiendo distribución aunque el contenido esté oculto o limitado a quienes tengan un código. Los códigos solo deben habilitar contenido para el que exista dominio público, licencia abierta o autorización escrita.

## Modelo de catálogo recomendado

### Catálogo público

Puede incluir:

- Traducciones de dominio público.
- Traducciones con licencia abierta compatible con aplicaciones y redistribución.
- Textos completos almacenados en el servidor y descargables para uso offline cuando la licencia lo permita.

Cada traducción debe conservar su fuente, licencia, atribución y evidencia de procedencia.

### Importación personal

El usuario puede importar un archivo propio en el dispositivo, sujeto a estas condiciones:

- El archivo se procesa localmente.
- No se publica en la comunidad.
- No se crea un enlace compartible.
- No se sincroniza al servidor por defecto.
- El usuario declara que tiene derecho a usar esa copia.

Este flujo reduce el riesgo de redistribución por parte de BibliaAPP, pero no convierte automáticamente una copia no autorizada en legal.

### Catálogo institucional mediante códigos

Una iglesia, organización o editorial podría usar un código para acceder a un catálogo privado si acredita derechos suficientes.

El código debe identificar:

- Organización responsable.
- Traducciones autorizadas.
- Usuarios o grupo habilitado.
- Territorio permitido.
- Vigencia de la autorización.
- Restricciones de descarga y uso offline.

La organización debe aportar una licencia o autorización que cubra expresamente el almacenamiento y la entrega digital a los usuarios previstos. Una licencia de uso interno no debe interpretarse automáticamente como permiso para sublicenciar o redistribuir.

## Ruta hacia Reina-Valera 1960

### Etapa 1: lanzamiento legal

- Incluir Reina-Valera 1909 como versión familiar y offline.
- Añadir traducciones modernas con licencia abierta.
- Mantener inicialmente el producto sin anuncios, pagos o freemium si se pretende usar una licencia no comercial de terceros.
- Medir usuarios registrados, usuarios activos mensuales, retención, lecturas y congregaciones participantes.

### Etapa 2: posible acceso en línea mediante API.Bible

API.Bible documenta acceso a traducciones protegidas y su FAQ menciona Reina-Valera 1960. Antes de desarrollar esta integración debe confirmarse en la cuenta concreta:

- Que RVR1960 esté disponible para el plan y territorio.
- Que el uso de BibliaAPP sea considerado comercial o no comercial.
- Precio y límite de solicitudes.
- Cantidad de texto que puede almacenarse temporalmente.
- Si se permiten capítulos completos.
- Atribución y aviso de copyright obligatorios.
- Cobertura de Android, iOS y web.
- Restricciones de uso offline.

Arquitectura propuesta si se autoriza:

```text
Aplicación móvil
    -> API propia de BibliaAPP
        -> API.Bible
```

La API key debe permanecer en el backend. No debe incorporarse en el bundle móvil. Las respuestas no deben convertirse en una base offline ni redistribuirse fuera de lo autorizado.

Referencias:

- [API.Bible](https://api.bible/)
- [Preguntas frecuentes de API.Bible](https://docs.api.bible/common-questions/)
- [Términos de API.Bible](https://api.bible/terms-and-conditions)

### Etapa 3: solicitud de licencia directa

Al alcanzar la métrica requerida por el titular, preparar un expediente con:

- Usuarios registrados y usuarios activos mensuales.
- Instalaciones verificadas.
- Retención a 7 y 30 días.
- Lecturas y sesiones mensuales.
- Países de uso.
- Iglesias participantes.
- Cartas de interés o apoyo.
- Política de privacidad.
- Seguridad y control de acceso.
- Moderación y procedimiento de retiro de contenido.
- Propuesta de atribución y presentación de RVR1960.
- Proyección de crecimiento y posible monetización.

Solicitar expresamente derechos para servidor, web, Android, iOS, caché y descarga offline. No asumir que una autorización para citas o para una sola plataforma cubre los demás usos.

## Registro de procedencia obligatorio

Cada Biblia importada debe tener:

- Nombre y abreviatura exactos.
- Edición o fecha.
- Idioma y variante regional.
- Autor, traductor o titular.
- Estado: dominio público, licencia abierta o licencia privada.
- Identificador de licencia, por ejemplo `Public-Domain` o `CC-BY-SA-4.0`.
- Aviso de copyright completo.
- Texto de atribución que debe mostrar la app.
- URL de origen.
- Fecha de consulta y descarga.
- Archivo original sin modificar.
- Hash SHA-256 del archivo recibido.
- Registro de cualquier transformación aplicada durante la importación.
- Permisos de servidor, descarga, offline, modificación y uso comercial.

## Conductas que deben evitarse

- Distribuir traducciones comerciales mediante códigos públicos.
- Pedir a usuarios que consigan copias no autorizadas.
- Crear un catálogo oculto de Biblias protegidas.
- Descargar una Biblia desde un sitio que permita leerla pero no redistribuirla.
- Copiar portadas, logotipos, notas o comentarios de una edición sin verificar sus derechos.
- Confundir una traducción antigua de dominio público con una revisión moderna protegida.
- Quitar avisos de copyright o atribución.

## Referencias de tiendas

- [Propiedad intelectual en Google Play](https://support.google.com/googleplay/android-developer/answer/9888072)
- [App Review Guidelines de Apple](https://developer.apple.com/app-store/review/guidelines/)
- [Ley Federal del Derecho de Autor de México](https://indautor.gob.mx/documentos/marco-juridico/leyfederal.pdf)

