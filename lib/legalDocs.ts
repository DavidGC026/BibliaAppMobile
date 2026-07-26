/**
 * Documentos legales de BibliaAPP en formato nativo.
 *
 * Contenido portado de la web (app/terminos, app/privacidad,
 * app/normas-comunidad). Si se actualizan allá, actualizar aquí y
 * la fecha LEGAL_LAST_UPDATED.
 */

export const LEGAL_CONTACT_EMAIL = 'soporte@dvguzman.com';
export const LEGAL_LAST_UPDATED = '15 de julio de 2026';

export type LegalDocSlug = 'terminos' | 'privacidad' | 'normas-comunidad';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Párrafos posteriores a la lista */
  after?: string[];
}

export interface LegalDoc {
  slug: LegalDocSlug;
  title: string;
  shortTitle: string;
  sections: LegalSection[];
}

const terminos: LegalDoc = {
  slug: 'terminos',
  title: 'Términos y condiciones de uso',
  shortTitle: 'Términos y condiciones',
  sections: [
    {
      heading: '1. Aceptación de los términos',
      paragraphs: [
        'Estos términos regulan el uso de BibliaAPP, disponible como aplicación web en biblia2.dvguzman.com y como aplicación móvil para Android e iOS (en conjunto, el «Servicio»). Al crear una cuenta o utilizar el Servicio aceptas estos términos y el Aviso de privacidad. Si no estás de acuerdo, no utilices el Servicio.',
      ],
    },
    {
      heading: '2. Descripción del Servicio',
      paragraphs: [
        'BibliaAPP es una aplicación cristiana sin fines de lucro creada para facilitar la lectura, el estudio y la reflexión de las Escrituras. Ofrece, entre otras funciones: lectura de traducciones bíblicas, versículo del día, notas y cuadernos de estudio, resaltados, favoritos, planes de lectura, diccionario, creación de imágenes con versículos y, para congregaciones, grupos, peticiones de oración, calendario de eventos y comunidad.',
        'El Servicio es gratuito. No vende el texto bíblico ni condiciona su lectura a pagos, y no muestra publicidad de terceros.',
      ],
    },
    {
      heading: '3. Cuentas de usuario',
      bullets: [
        'Algunas funciones (notas, resaltados, favoritos, grupos, comunidad) requieren una cuenta. La lectura bíblica básica y el versículo del día son públicos.',
        'Debes proporcionar información veraz al registrarte y mantener la confidencialidad de tu contraseña. Eres responsable de la actividad realizada desde tu cuenta.',
        'El registro puede realizarse con correo y contraseña o mediante tu cuenta de Google.',
        'Debes tener la edad mínima requerida en tu país para aceptar estos términos o contar con el consentimiento de tu madre, padre o tutor.',
        'Puedes solicitar la eliminación de tu cuenta en cualquier momento (ver sección de eliminación en el Aviso de privacidad).',
      ],
    },
    {
      heading: '4. Conducta y uso aceptable',
      paragraphs: ['Al usar el Servicio te comprometes a no:'],
      bullets: [
        'Publicar contenido ilegal, difamatorio, amenazante, discriminatorio, sexualmente explícito, violento o que incite al odio.',
        'Suplantar a otras personas, congregaciones u organizaciones.',
        'Acosar, intimidar o dañar a otros usuarios.',
        'Difundir spam, malware, o intentar acceder sin autorización a cuentas ajenas o a la infraestructura del Servicio.',
        'Extraer, copiar o redistribuir de forma masiva el contenido del Servicio (incluido el texto bíblico) fuera de los usos permitidos por su licencia.',
      ],
      after: [
        'El incumplimiento puede dar lugar a la eliminación de contenido, la suspensión o la cancelación de la cuenta, según la gravedad del caso.',
      ],
    },
    {
      heading: '5. Contenido publicado por los usuarios',
      bullets: [
        'Conservas la titularidad del contenido que creas (notas, publicaciones, imágenes, peticiones de oración, comentarios).',
        'Al publicar contenido visible para otros (comunidad, grupos), otorgas a BibliaAPP una licencia no exclusiva, gratuita y revocable para almacenarlo y mostrarlo dentro del Servicio, con el único fin de operar las funciones correspondientes.',
        'Tus notas, cuadernos, resaltados y favoritos personales son privados; solo se comparten si tú decides hacerlo.',
        'Solo debes subir imágenes y archivos sobre los que tengas derechos suficientes.',
      ],
    },
    {
      heading: '6. Moderación',
      paragraphs: [
        `En los espacios comunitarios (feed, grupos), los administradores pueden revisar, ocultar o eliminar contenido que infrinja estos términos o las Normas de la comunidad, así como suspender cuentas reincidentes. Puedes reportar contenido o conductas inapropiadas escribiendo a ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '7. Texto bíblico y propiedad intelectual',
      bullets: [
        'Las traducciones bíblicas disponibles pertenecen a sus respectivos titulares y se distribuyen conforme a sus licencias. La atribución, el copyright y la licencia de cada traducción pueden consultarse dentro de la aplicación (sección «Información legal»).',
        'Algunas traducciones pueden tener restricciones de copia, descarga sin conexión, compartición o creación de imágenes; la aplicación aplica esas restricciones según la licencia de cada versión, y una traducción puede dejar de estar disponible si su licencia lo exige.',
        'El software, el diseño y los elementos gráficos propios de BibliaAPP pertenecen a sus autores. No se otorga ningún derecho sobre ellos más allá del uso personal del Servicio.',
        `Si consideras que algún contenido infringe tus derechos de autor, escríbenos a ${LEGAL_CONTACT_EMAIL} indicando el contenido afectado y la acreditación de tus derechos.`,
      ],
    },
    {
      heading: '8. Disponibilidad y garantías',
      paragraphs: [
        'El Servicio se ofrece «tal cual» y «según disponibilidad», sin garantías de funcionamiento ininterrumpido o libre de errores. Al ser un proyecto sin fines de lucro, podemos modificar, suspender o descontinuar funciones (o el Servicio completo) en cualquier momento, procurando avisar con antelación razonable cuando afecte a tus datos.',
        'Te recomendamos conservar copias propias de la información importante. Cuando sea posible, facilitaremos mecanismos de exportación de tus notas.',
      ],
    },
    {
      heading: '9. Limitación de responsabilidad',
      paragraphs: [
        'En la máxima medida permitida por la ley, BibliaAPP y sus colaboradores no serán responsables de daños indirectos, pérdida de datos o perjuicios derivados del uso o la imposibilidad de uso del Servicio. Nada en estos términos limita responsabilidades que no puedan excluirse legalmente.',
      ],
    },
    {
      heading: '10. Suspensión y terminación',
      paragraphs: [
        'Podemos suspender o cancelar cuentas que incumplan estos términos. Tú puedes dejar de usar el Servicio y solicitar la eliminación de tu cuenta en cualquier momento. Tras la eliminación, tus datos se tratarán según lo descrito en el Aviso de privacidad.',
      ],
    },
    {
      heading: '11. Cambios a estos términos',
      paragraphs: [
        'Podemos actualizar estos términos para reflejar cambios en el Servicio o en la ley. Publicaremos la versión vigente con su fecha de actualización; los cambios relevantes se anunciarán dentro de la aplicación. El uso continuado del Servicio tras la publicación implica la aceptación de los nuevos términos.',
      ],
    },
    {
      heading: '12. Ley aplicable y contacto',
      paragraphs: [
        'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes de dicho país, salvo que la normativa de tu lugar de residencia disponga otra cosa de forma imperativa.',
        `Dudas o comentarios: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const privacidad: LegalDoc = {
  slug: 'privacidad',
  title: 'Aviso de privacidad',
  shortTitle: 'Aviso de privacidad',
  sections: [
    {
      heading: '1. Responsable y alcance',
      paragraphs: [
        'Este aviso describe cómo BibliaAPP —aplicación cristiana sin fines de lucro disponible en biblia2.dvguzman.com y como app móvil para Android e iOS— recopila, usa y protege tus datos personales. Aplica tanto a la versión web como a la aplicación móvil, que comparten la misma cuenta y los mismos datos.',
        `Contacto para temas de privacidad: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '2. Datos que recopilamos',
      paragraphs: ['Datos de cuenta:'],
      bullets: [
        'Nombre, correo electrónico, nombre de usuario y rol dentro de la plataforma.',
        'Contraseña, almacenada únicamente como hash criptográfico (scrypt); nunca en texto plano.',
        'Foto de perfil o avatar, si decides subir una.',
        'Si inicias sesión con Google: el nombre, correo y foto de perfil que Google nos entrega. No recibimos tu contraseña de Google.',
      ],
      after: [
        'Contenido que creas: notas, cuadernos, resaltados, favoritos y progreso en planes de lectura; publicaciones en la comunidad, peticiones de oración, participación en grupos y eventos, y comentarios; imágenes y archivos que subas (por ejemplo, imágenes insertadas en notas).',
        'Datos técnicos: token de sesión (cookie en la web; almacén seguro del sistema en el móvil); token de notificaciones push (Expo) si activas las notificaciones en el móvil; registros técnicos del servidor (fecha, dirección IP, ruta solicitada) usados solo para seguridad y diagnóstico.',
        'No recopilamos tu ubicación, contactos, ni datos de otras aplicaciones. No usamos tus datos para publicidad ni los vendemos a terceros.',
      ],
    },
    {
      heading: '3. Para qué usamos tus datos',
      bullets: [
        'Crear y mantener tu cuenta, e iniciar sesión en web y móvil.',
        'Sincronizar entre dispositivos tus notas, resaltados, favoritos, planes y demás contenido.',
        'Mostrar tus publicaciones y actividad en los espacios comunitarios que uses.',
        'Enviarte correos transaccionales (verificación de cuenta, restablecimiento de contraseña) y notificaciones que hayas activado.',
        'Proteger el Servicio frente a abusos y resolver problemas técnicos.',
      ],
    },
    {
      heading: '4. Almacenamiento local en tus dispositivos',
      bullets: [
        'Web: cookie de sesión y preferencias (por ejemplo, tema visual) en el navegador.',
        'Móvil: el token de sesión se guarda en el almacén seguro del sistema (Keychain en iOS, EncryptedSharedPreferences en Android). Los capítulos bíblicos descargados para lectura sin conexión se guardan en una base de datos SQLite local, solo cuando la licencia de la traducción lo permite.',
        'La app móvil usa el selector de fotos del sistema para elegir imágenes puntuales; no accede a toda tu galería.',
      ],
    },
    {
      heading: '5. Terceros que intervienen en el Servicio',
      paragraphs: [
        'No compartimos tus datos con terceros para sus propios fines. Los siguientes proveedores procesan datos únicamente para operar funciones del Servicio:',
      ],
      bullets: [
        'Google — inicio de sesión con Google (OAuth), si eliges usarlo.',
        'Expo — entrega de notificaciones push en el móvil, si las activas.',
        'Resend — envío de correos transaccionales (verificación, restablecimiento de contraseña).',
        'Unsplash — búsqueda de imágenes de fondo; solo se envía el término de búsqueda, nunca tus datos de cuenta.',
      ],
      after: [
        'Los datos del Servicio se alojan en infraestructura propia administrada por el equipo de BibliaAPP.',
      ],
    },
    {
      heading: '6. Seguridad',
      bullets: [
        'Todas las comunicaciones viajan cifradas mediante HTTPS.',
        'Las contraseñas se almacenan con hash scrypt y sal aleatoria.',
        'Los tokens de sesión están cifrados (AES-256) y expiran a los 7 días.',
        'El acceso a los datos está limitado por roles; tus notas y cuadernos personales solo son visibles para ti salvo que decidas compartirlos.',
      ],
      after: [
        'Ningún sistema es infalible; si detectamos un incidente de seguridad que afecte tus datos, te lo notificaremos por los medios disponibles.',
      ],
    },
    {
      heading: '7. Retención de datos',
      bullets: [
        'Los datos de tu cuenta y tu contenido se conservan mientras la cuenta esté activa.',
        'Los registros técnicos del servidor se conservan por un periodo breve con fines de seguridad y diagnóstico.',
        'Al eliminarse la cuenta, los datos personales se eliminan o anonimizan en un plazo máximo de 30 días, salvo obligación legal de conservación.',
      ],
    },
    {
      heading: '8. Eliminación de cuenta y datos',
      paragraphs: ['Para eliminar tu cuenta y los datos asociados:'],
      bullets: [
        `Envía un correo a ${LEGAL_CONTACT_EMAIL} desde la dirección registrada en tu cuenta, con el asunto «Eliminación de cuenta».`,
        'Confirmaremos la solicitud y eliminaremos tu cuenta, notas, resaltados, favoritos, publicaciones, archivos subidos, tokens de sesión y tokens de notificaciones.',
        'El proceso se completa en un máximo de 30 días; recibirás confirmación al finalizar.',
      ],
      after: [
        'La eliminación es irreversible. Si solo quieres dejar de recibir notificaciones, puedes desactivarlas desde tu perfil sin eliminar la cuenta.',
      ],
    },
    {
      heading: '9. Tus derechos',
      paragraphs: [
        `Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, cancelación y oposición (ARCO), así como retirar tu consentimiento, escribiendo a ${LEGAL_CONTACT_EMAIL}. Buena parte de tus datos (nombre, avatar, notas, contenido) también puedes consultarlos, editarlos o eliminarlos directamente desde la aplicación.`,
      ],
    },
    {
      heading: '10. Menores de edad',
      paragraphs: [
        'El Servicio no está dirigido a menores sin supervisión. Si eres madre, padre o tutor y crees que un menor nos ha proporcionado datos sin tu consentimiento, contáctanos para eliminarlos.',
      ],
    },
    {
      heading: '11. Cambios a este aviso',
      paragraphs: [
        'Publicaremos cualquier actualización de este aviso con su fecha de vigencia. Los cambios significativos se anunciarán dentro de la aplicación antes de entrar en vigor.',
      ],
    },
  ],
};

const normasComunidad: LegalDoc = {
  slug: 'normas-comunidad',
  title: 'Normas de la comunidad',
  shortTitle: 'Normas de la comunidad',
  sections: [
    {
      heading: '1. Propósito de la comunidad',
      paragraphs: [
        'Los espacios comunitarios de BibliaAPP (feed, grupos, peticiones de oración, comentarios y eventos) existen para edificar: compartir la Palabra, orar unos por otros, animar y acompañar. Estas normas aplican a todo lo que publiques —texto, imágenes y archivos— y complementan los Términos y condiciones.',
        'Regla general: si dudas de que algo edifique o de que tengas derecho a publicarlo, no lo publiques.',
      ],
    },
    {
      heading: '2. Contenido permitido',
      bullets: [
        'Versículos, reflexiones, devocionales y testimonios personales.',
        'Peticiones de oración y palabras de ánimo.',
        'Anuncios y actividades de tu congregación o grupo.',
        'Imágenes propias o con licencia que acompañen lo anterior (por ejemplo, imágenes de versículos creadas con la propia aplicación).',
        'Preguntas y conversaciones respetuosas sobre las Escrituras.',
      ],
    },
    {
      heading: '3. Contenido estrictamente prohibido',
      paragraphs: [
        'Lo siguiente se elimina sin previo aviso y puede causar la suspensión inmediata y definitiva de la cuenta:',
      ],
      bullets: [
        'Contenido sexual o desnudez en cualquier grado, incluido el sugerente. Tolerancia cero con cualquier contenido que involucre a menores: además de la expulsión, se denunciará a las autoridades competentes.',
        'Violencia: imágenes o textos violentos, gore, autolesiones, amenazas o apología de la violencia.',
        'Odio y discriminación por origen, etnia, nacionalidad, sexo, discapacidad, condición social o religión, incluso disfrazados de «debate».',
        'Acoso: insultos, burlas, humillaciones, hostigamiento o exposición de conversaciones privadas.',
        'Datos personales de terceros (teléfonos, direcciones, fotos de otras personas) publicados sin su consentimiento. Esto incluye fotos donde aparezcan menores sin autorización de sus tutores.',
        'Material con derechos de autor que no te pertenece: libros, estudios, música, videos o imágenes sin licencia para compartirlos. Citar con atribución breve está bien; subir la obra, no.',
        'Suplantación de personas, pastores, congregaciones u organizaciones.',
        'Spam y fraude: publicidad, ventas, cadenas, sorteos, enlaces engañosos, esquemas de dinero o peticiones de dinero personales no verificadas.',
        'Contenido ilegal de cualquier tipo, incluida la promoción de drogas, armas o actividades delictivas.',
        'Desinformación peligrosa, por ejemplo consejos que sustituyan atención médica o profesional («deja tu tratamiento y solo ora»).',
      ],
    },
    {
      heading: '4. Reglas sobre imágenes y archivos subidos',
      paragraphs: ['Sé especialmente cuidadoso con lo que subes al servidor:'],
      bullets: [
        'Sube únicamente imágenes que tú creaste o que tienen licencia de uso.',
        'Nada de capturas de conversaciones privadas ni documentos de terceros.',
        'No subas fotos de otras personas sin su permiso; con menores, nunca sin permiso expreso de sus tutores.',
        'No uses la plataforma como almacén de archivos ajenos a su propósito.',
        'Los administradores pueden eliminar cualquier archivo que incumpla estas normas, sin previo aviso.',
      ],
    },
    {
      heading: '5. Convivencia y desacuerdos doctrinales',
      bullets: [
        'Trata a los demás con el respeto que enseñan las Escrituras.',
        'Los desacuerdos doctrinales se conversan con humildad; no se permiten ataques, descalificaciones ni campañas contra otras denominaciones, congregaciones o creyentes.',
        'Las peticiones de oración de otros son confidenciales: no las difundas fuera.',
      ],
    },
    {
      heading: '6. Moderación y consecuencias',
      bullets: [
        'Los administradores y moderadores pueden ocultar o eliminar contenido y restringir cuentas que incumplan estas normas.',
        'Según la gravedad: aviso → eliminación de contenido → suspensión temporal → expulsión definitiva. Las infracciones de la sección 3 pueden implicar expulsión inmediata sin aviso previo.',
        'Evadir una suspensión con otra cuenta implica el cierre de ambas.',
        'Las decisiones de moderación quedan registradas.',
      ],
    },
    {
      heading: '7. Cómo reportar',
      paragraphs: [
        `Si ves contenido o conductas que incumplen estas normas, repórtalo escribiendo a ${LEGAL_CONTACT_EMAIL} con una captura o enlace de lo sucedido. Revisamos todos los reportes y actuamos a la brevedad posible. Los reportes son confidenciales.`,
      ],
    },
    {
      heading: '8. Cambios a estas normas',
      paragraphs: [
        'Podemos actualizar estas normas cuando sea necesario; la versión vigente estará siempre publicada con su fecha de actualización.',
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDocSlug, LegalDoc> = {
  terminos,
  privacidad,
  'normas-comunidad': normasComunidad,
};

export const LEGAL_DOC_ORDER: LegalDocSlug[] = ['terminos', 'normas-comunidad', 'privacidad'];
