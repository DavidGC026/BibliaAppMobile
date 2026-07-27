import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useThemeColors } from '@/hooks/useThemeColors';

type TourStep = {
  icon: AppIconName;
  title: string;
  /** Un párrafo por línea; el primero dice qué se hace y el resto, los matices. */
  body: string[];
};

/**
 * Los pasos del tutorial: qué se le cuenta a quien abre una nota por primera
 * vez. Están aquí, fuera del componente, porque son contenido y cambian por su
 * cuenta; el componente solo los pasa.
 */
export const NOTE_TOUR_STEPS: TourStep[] = [
  {
    icon: 'edit',
    title: 'La cinta de abajo',
    body: [
      'Todo se hace desde la cinta: «Inicio» da el formato del texto y «Insertar» añade contenido.',
      'Al seleccionar un versículo, una imagen o una tabla se abre sola una pestaña más con las opciones de eso, y desaparece al dejar de seleccionarlo.',
      'La flecha de la derecha contrae la cinta cuando estorbe; tocar cualquier pestaña la despliega otra vez.',
    ],
  },
  {
    icon: 'bible',
    title: 'Insertar un versículo',
    body: [
      'Insertar → Versículo. Elige libro, capítulo y el rango que quieras y se pega citado, con su referencia y su versión.',
      'Tócalo y aparece «Formato de versículo»: subirlo o bajarlo dentro de la nota, copiarlo, cortarlo o eliminarlo.',
      'El versículo entra como una pieza entera, así que no se rompe al escribir a su lado.',
    ],
  },
  {
    icon: 'dictionary',
    title: 'Definiciones del diccionario',
    body: [
      'Insertar → Diccionario. Busca por palabra o por número Strong y se inserta la definición completa.',
      'También llega desde el lector: al abrir una palabra en el diccionario Strong puedes mandarla a la nota.',
      'Igual que el versículo, es un bloque con su propia pestaña para moverlo o quitarlo.',
    ],
  },
  {
    icon: 'image',
    title: 'Imágenes',
    body: [
      'Insertar → Imagen y la eliges de la galería. Se guarda dentro de la nota, así que se ve sin conexión.',
      'Tócala y se abre «Formato de imagen»: ancho al 25, 50, 75 o 100 %, alineación y «Detrás del texto» para usarla de fondo.',
      'Una imagen de fondo deja escribir encima, por eso no responde al tacto. Para volver a moverla o cambiarla, enciende Insertar → Modo fondos, arrástrala, y apágalo al terminar.',
    ],
  },
  {
    icon: 'chart',
    title: 'Tablas',
    body: [
      'Insertar → Tabla. Eliges filas y columnas, y si la primera fila es de encabezado, con una vista previa antes de crearla.',
      'Con el cursor dentro aparece «Diseño de tabla»: añadir o quitar filas y columnas, combinar celdas y volver a dividirlas.',
      'Para cambiar el ancho de una columna, arrastra su borde.',
    ],
  },
  {
    icon: 'check',
    title: 'Guardar y compartir',
    body: [
      'El botón «Guardar» de arriba se enciende en cuanto hay cambios y avisa cuando termina; debajo del título va el número de palabras.',
      'El ojo muestra la nota como se lee, sin la cinta.',
      'En el menú de tres puntos están Compartir, Exportar a PDF y Eliminar, y también este tutorial por si quieres repasarlo.',
    ],
  },
];

interface NoteEditorTourProps {
  visible: boolean;
  /** Se llama tanto al terminar como al saltarlo: en ambos casos ya se vio. */
  onClose: () => void;
}

/** Tutorial de primera vez del editor de notas. */
export function NoteEditorTour({ visible, onClose }: NoteEditorTourProps) {
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);

  // Cada apertura empieza por el principio, también cuando se repasa a mano.
  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const step = NOTE_TOUR_STEPS[index];
  const isLast = index === NOTE_TOUR_STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.head}>
            <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <AppIcon name={step.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.headText}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                Paso {index + 1} de {NOTE_TOUR_STEPS.length}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {step.body.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.text }]}>
                {paragraph}
              </Text>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {NOTE_TOUR_STEPS.map((item, position) => (
              <View
                key={item.title}
                style={[
                  styles.dot,
                  {
                    backgroundColor: position === index ? colors.primary : colors.border,
                    width: position === index ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={index === 0 ? onClose : () => setIndex(index - 1)}
              hitSlop={8}
              style={styles.ghost}
            >
              <Text style={[styles.ghostLabel, { color: colors.textMuted }]}>
                {index === 0 ? 'Saltar' : 'Atrás'}
              </Text>
            </Pressable>

            <Pressable
              onPress={isLast ? onClose : () => setIndex(index + 1)}
              style={[styles.primary, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
                {isLast ? 'Entendido' : 'Siguiente'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  body: { marginTop: 14, marginBottom: 4 },
  paragraph: { fontSize: 14, lineHeight: 21, marginBottom: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ghost: { paddingVertical: 10, paddingHorizontal: 6 },
  ghostLabel: { fontSize: 14, fontWeight: '700' },
  primary: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 12 },
  primaryLabel: { fontSize: 14, fontWeight: '800' },
});
