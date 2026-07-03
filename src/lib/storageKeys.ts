// Fuente única de verdad de las claves de localStorage que usa cada store.
// Cualquier módulo que necesite enumerar, sincronizar o respaldar datos de
// usuario debe importar de aquí en vez de repetir las claves a mano — así
// evitamos que lectores y escritores diverjan (ver auditoría: Dashboard,
// backup y notificaciones leían claves legacy que ningún store escribía).

export const STORE_KEYS = {
  agenda_tasks: 'agenda_tasks',
  agenda_recurring: 'agenda_recurring',
  agenda_pending: 'agenda_pending',
  agenda_shifts: 'agenda_shifts',
  agenda_templates: 'agenda_templates',

  nutri_log: 'nutri_log',
  nutri_dishes: 'nutri_dishes',
  nutri_goals: 'nutri_goals',
  nutri_menu: 'nutri_menu',
  nutri_body: 'nutri_body',
  nutri_water: 'nutri_water',
  nutri_water_goal: 'nutri_water_goal',
  nutri_favs: 'nutri_favs',
  nutri_fasting: 'nutri_fasting',
  nutri_macro_calc: 'nutri_macro_calc',

  fisico_sessions: 'fisico_sessions',
  fisico_routines: 'fisico_routines',
  fisico_exercises: 'fisico_exercises',
  fisico_runs: 'fisico_runs',
  fisico_run_plans: 'fisico_run_plans',
  fisico_mob_routines: 'fisico_mob_routines',
  fisico_mob_exercises: 'fisico_mob_exercises',
  fisico_mob_sessions: 'fisico_mob_sessions',
  fisico_prs: 'fisico_prs',
  fisico_templates: 'fisico_templates',

  finances_tx: 'finances_tx',
  finances_huchas: 'finances_huchas',
  finances_pufos: 'finances_pufos',
  finances_cuentas: 'finances_cuentas',
  finances_budgets: 'finances_budgets',
  finances_recurring: 'finances_recurring',

  lifeos_habits: 'lifeos_habits',
  lifeos_habits_log: 'lifeos_habits_log',
  lifeos_xp: 'lifeos_xp',

  josema_rpg_missions_v1: 'josema_rpg_missions_v1',
  journal_entries: 'journal_entries',

  lifeos_viajes_v1: 'lifeos_viajes_v1',
  lifeos_actividades_v1: 'lifeos_actividades_v1',
  lifeos_compras_v1: 'lifeos_compras_v1',
  lifeos_inbox_v1: 'lifeos_inbox_v1',
  lifeos_proyectos_v1: 'lifeos_proyectos_v1',
  nutri_medidas: 'nutri_medidas',

  lifeos_username_v1: 'lifeos_username_v1',
  lifeos_theme_v2: 'lifeos_theme_v2',
  lifeos_notif_habits: 'lifeos_notif_habits',
  lifeos_notif_agenda: 'lifeos_notif_agenda',
} as const

export const ALL_STORAGE_KEYS: string[] = Object.values(STORE_KEYS)

// Etiquetas legibles para UI (pantalla de almacenamiento en Ajustes).
// Solo las claves con volumen de datos relevante para el usuario.
export const STORAGE_LABELS: Record<string, string> = {
  [STORE_KEYS.agenda_tasks]: 'Agenda (tareas)',
  [STORE_KEYS.nutri_log]: 'Nutrición (diario)',
  [STORE_KEYS.fisico_sessions]: 'Físico (sesiones)',
  [STORE_KEYS.finances_tx]: 'Finanzas',
  [STORE_KEYS.lifeos_habits]: 'Hábitos',
  [STORE_KEYS.nutri_body]: 'Peso y composición',
  [STORE_KEYS.journal_entries]: 'Diario',
}
