/**
 * "Familiar Things" — people, places, food and activities the patient is known to know,
 * built purely from data that already exists: the People list (always familiar — a
 * caregiver registered them on purpose) and keyword matches inside approved Memories
 * text. Nothing here is guessed from the patient's behaviour or invented: a place/food/
 * activity only appears if a memory's own words name it.
 */
import type { PatientMemory } from '../api/memories';
import type { FamiliarPerson } from '../api/people';

export type FamiliarPersonItem = { id: number; name: string; relationship: string; photoUrl: string | null };
export type FamiliarCategory = 'place' | 'food' | 'activity';
export type FamiliarTagItem = { label: string; category: FamiliarCategory; count: number };

export type FamiliarThings = {
  people: FamiliarPersonItem[];
  places: FamiliarTagItem[];
  foods: FamiliarTagItem[];
  activities: FamiliarTagItem[];
};

// [match pattern, the clean label to show when it matches]. Deliberately a short,
// curated list — a near-miss should mean "not shown", never a wrong guess.
const PLACE_RULES: [RegExp, string][] = [
  [/\bgarden\b/i, 'Garden'],
  [/\bpark\b/i, 'Park'],
  [/\btemple\b/i, 'Temple'],
  [/\bchurch\b/i, 'Church'],
  [/\bmosque\b/i, 'Mosque'],
  [/\bmarket\b/i, 'Market'],
  [/\bbeach\b/i, 'Beach'],
  [/\bvillage\b/i, 'Village'],
  [/\b(home\s?town)\b/i, 'Hometown'],
  [/\bclinic\b/i, 'Clinic'],
  [/\bhospital\b/i, 'Hospital'],
];

const FOOD_RULES: [RegExp, string][] = [
  [/\bmango(es)?\b/i, 'Mangoes'],
  [/\btea\b/i, 'Tea'],
  [/\bcoffee\b/i, 'Coffee'],
  [/\bsweets?\b/i, 'Sweets'],
  [/\bmilk\b/i, 'Milk'],
  [/\bbiscuits?\b/i, 'Biscuits'],
  [/\brice\b/i, 'Rice'],
  [/\b(chapat(i|ti)|rotis?)\b/i, 'Roti'],
  [/\bmithai\b/i, 'Mithai'],
];

const ACTIVITY_RULES: [RegExp, string][] = [
  [/\b(playing\s)?cards\b/i, 'Playing cards'],
  [/\b(music|songs?|singing)\b/i, 'Music'],
  [/\bwalks?\b|\bwalking\b/i, 'Walking'],
  [/\b(reading|books?)\b/i, 'Reading'],
  [/\b(tv|television|movies?)\b/i, 'Watching TV'],
  [/\bcooking\b/i, 'Cooking'],
  [/\bchess\b/i, 'Chess'],
  [/\bknitting\b/i, 'Knitting'],
];

function extractTags(memories: PatientMemory[], rules: [RegExp, string][], category: FamiliarCategory): FamiliarTagItem[] {
  const counts = new Map<string, number>();
  for (const m of memories) {
    for (const [pattern, label] of rules) {
      if (pattern.test(m.text)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, category, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function deriveFamiliarThings(people: FamiliarPerson[], memories: PatientMemory[]): FamiliarThings {
  return {
    people: people.map((p) => ({ id: p.id, name: p.display_name, relationship: p.relationship_label, photoUrl: p.photo_url })),
    places: extractTags(memories, PLACE_RULES, 'place'),
    foods: extractTags(memories, FOOD_RULES, 'food'),
    activities: extractTags(memories, ACTIVITY_RULES, 'activity'),
  };
}
