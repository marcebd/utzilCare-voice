export interface InstructionPreset {
  id: string;
  titleEn: string;
  titleEs: string;
  textEn: string;
  textEs: string;
}

export const INSTRUCTION_PRESETS: InstructionPreset[] = [
  {
    id: 'wound-care',
    titleEn: 'Wound care',
    titleEs: 'Cuidado de la herida',
    textEn: 'Keep the wound clean and dry. Change the bandage once a day, or any time it becomes wet or dirty. Wash your hands before and after touching the wound. Do not apply any cream or ointment unless I told you to.',
    textEs: 'Mantenga la herida limpia y seca. Cambie el vendaje una vez al día, o cada vez que se moje o ensucie. Lávese las manos antes y después de tocar la herida. No aplique ninguna crema ni ungüento a menos que yo se lo haya indicado.',
  },
  {
    id: 'medication-schedule',
    titleEn: 'Medication schedule',
    titleEs: 'Horario de medicamentos',
    textEn: 'Take the pain medication every eight hours, with food. Take the antibiotic three times a day until it is finished, even if you feel better. Do not skip doses. Do not drink alcohol while taking these medications.',
    textEs: 'Tome el medicamento para el dolor cada ocho horas, con comida. Tome el antibiótico tres veces al día hasta terminarlo, aunque se sienta mejor. No se salte dosis. No tome alcohol mientras esté tomando estos medicamentos.',
  },
  {
    id: 'diet-restrictions',
    titleEn: 'Diet restrictions',
    titleEs: 'Restricciones alimenticias',
    textEn: 'For the first three days, eat only soft, cool foods like yogurt, soup, and mashed vegetables. Drink plenty of water. Avoid spicy, hard, or very hot foods. You may return to your normal diet slowly after that.',
    textEs: 'Durante los primeros tres días, coma solo alimentos blandos y fríos como yogur, sopa y verduras en puré. Beba mucha agua. Evite alimentos picantes, duros o muy calientes. Puede regresar a su dieta normal lentamente después de eso.',
  },
  {
    id: 'warning-signs',
    titleEn: 'Warning signs',
    titleEs: 'Señales de alerta',
    textEn: 'Go to the clinic or call me immediately if you have: a fever above 101 degrees Fahrenheit, heavy bleeding, increasing pain, pus or a bad smell from the wound, or any trouble breathing. These are not normal and need care right away.',
    textEs: 'Vaya a la clínica o llámeme inmediatamente si tiene: fiebre mayor a 38.3 grados Celsius, sangrado abundante, dolor que empeora, pus o mal olor de la herida, o dificultad para respirar. Estas señales no son normales y necesitan atención de inmediato.',
  },
  {
    id: 'follow-up',
    titleEn: 'Follow-up appointment',
    titleEs: 'Cita de seguimiento',
    textEn: 'Your next appointment is in seven days. I will check the wound and see how you are healing. If you cannot come, call the clinic right away so we can move the appointment.',
    textEs: 'Su próxima cita es en siete días. Revisaré la herida y veré cómo está sanando. Si no puede venir, llame a la clínica de inmediato para que podamos mover la cita.',
  },
  {
    id: 'activity-restrictions',
    titleEn: 'Physical activity',
    titleEs: 'Actividad física',
    textEn: 'For the next two weeks, do not lift anything heavier than five pounds. Do not bend, strain, or do any vigorous exercise. Walking and gentle movement are fine and good for healing. Sleep with your head slightly elevated.',
    textEs: 'Durante las próximas dos semanas, no levante nada más pesado que dos kilos. No se doble, no haga fuerza, ni haga ejercicio intenso. Caminar y moverse suavemente está bien y ayuda a la curación. Duerma con la cabeza ligeramente elevada.',
  },
];
