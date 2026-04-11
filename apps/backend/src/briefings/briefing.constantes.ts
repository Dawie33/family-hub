import { BriefingConfig } from "./briefing.interface"

const BRIEFING_CONFIGS: BriefingConfig[] = [
  {
    category: 'citation',
    title: 'Citation du Jour',
    icon: '✨',
    searchQuery: '',
    agentName: 'culture_du_jour',
    briefingInstructions: `## IMPORTANT : Citation Inspirante UNIQUEMENT

Tu dois générer UNE SEULE citation inspirante courte (1-2 phrases maximum).

RÈGLES STRICTES :
- PAS de "Le saviez-vous"
- PAS d'explications longues
- PAS de faits scientifiques ou historiques
- JUSTE une citation + son auteur

FORMAT EXACT à respecter :
"[La citation ici]" — [Auteur]

Exemples de bonnes citations :
- "La vie est trop courte pour être petite." — Benjamin Disraeli
- "Le succès c'est tomber sept fois et se relever huit." — Proverbe japonais
- "Sois le changement que tu veux voir dans le monde." — Gandhi

Choisis une citation motivante, positive, adaptée à une famille.
NE RÉPONDS QU'AVEC LA CITATION ET L'AUTEUR, RIEN D'AUTRE.`,
  },
  {
    category: 'sport',
    title: 'Résultats Sportifs',
    icon: '⚽',
    searchQuery: '',
    searchQueries: [
      'CrossFit compétitions résultats classement 2026 Open Games Throwdown',
      'NBA résultats scores résumé matchs highlights cette semaine',
      'NFL résultats scores Super Bowl playoffs saison 2026',
      'Jeux Olympiques résultats médailles France classement 2026',
      'rugby Top 14 résultats classement journée France',
      'tennis ATP WTA résultats tournoi cette semaine',
    ],
    searchResultCount: 5,
    agentName: 'chercheur_web',
    briefingInstructions: `## Format pour le briefing "Résultats Sportifs"

Tu es un journaliste sportif passionné. Rédige un VRAI résumé sportif riche et détaillé à partir des informations fournies, couvrant les **derniers jours** (pas uniquement hier).

OBJECTIF : Donner au lecteur l'impression de lire un vrai magazine sportif avec des résumés narratifs, du contexte et de l'analyse.

SPORTS PRIORITAIRES (dans cet ordre) :
1. **CrossFit** — Open, Games, Throwdown, Semifinals, compétitions en cours, qualifications, performances notables
2. **NBA** — Résumés des matchs marquants avec contexte (séries de victoires, courses aux playoffs, performances individuelles)
3. **NFL** — Résultats, playoffs, Super Bowl, performances clés
4. **Jeux Olympiques** — Médailles françaises, résultats marquants, programme à venir (été ou hiver selon la saison)
5. **Rugby Top 14** — Résumés de journée, classement, faits de match
6. **Tennis ATP/WTA** — Tournois en cours, résultats des Français

FORMAT ATTENDU pour chaque sport :

## 🏆 [Sport] — [Compétition]

Rédige un **vrai résumé narratif** de 3-5 phrases par sujet. Pas juste des scores secs !
Inclus :
- Le **contexte** (enjeu du match, position au classement, parcours de l'athlète)
- Les **résultats précis** (scores, temps, classements)
- Les **faits marquants** (actions décisives, records, surprises)
- Ce que ça **signifie pour la suite** (qualifications, éliminations, classement)

EXEMPLE DE BON FORMAT :
## 🏀 NBA — Les matchs de la semaine
Les Lakers ont dominé les Warriors 112-108 dans un match intense au Crypto.com Arena. LeBron James a été impérial avec 34 points et 12 passes, scellant la victoire dans le money time avec un tir à 3 points à 30 secondes de la fin. Cette victoire place les Lakers en 5e position de la Conférence Ouest, à seulement un match des Clippers.

RÈGLES :
- Si des préférences sportives sont connues dans les informations famille, adapte les priorités
- N'invente JAMAIS de résultats. Si tu n'as pas d'info sur un sport, ne l'inclus pas
- Sois généreux en détails et en analyse
- Maximum 1200 mots. Langue : français.`,
  },
  {
    category: 'actualites',
    title: 'Actualités du Jour',
    icon: '📰',
    searchQuery: "actualités france aujourd'hui principales informations",
    agentName: 'chercheur_web',
    briefingInstructions: `## Format pour le briefing "Actualités du Jour"

À partir des informations fournies, rédige un résumé des principales actualités du jour en France et dans le monde.

Si des centres d'intérêt sont connus dans les informations sur la famille, privilégie les actualités pertinentes.

Format attendu:
- Maximum 5 actualités
- Chacune en 2-3 phrases
- Ton: informatif, adapté à une famille
- Évite les sujets trop violents ou anxiogènes
- Langue: français`,
  },
  {
    category: 'culture',
    title: 'Culture du Jour',
    icon: '💡',
    searchQuery: 'le saviez-vous fait historique du jour anecdote culturelle',
    agentName: 'culture_du_jour',
    briefingInstructions: `## Format pour le briefing "Culture du Jour"

À partir des informations fournies, partage un fait culturel fascinant du jour.

Si des informations sur les enfants sont disponibles dans les informations sur la famille, adapte le niveau du contenu.

Format attendu:
- Un "Le saviez-vous ?" avec explication détaillée
- Rends le contenu captivant et mémorable
- Maximum 150 mots
- Langue: français`,
  },
  {
    category: 'meteo',
    title: 'Météo du Jour',
    icon: '☀️',
    searchQuery: "météo france aujourd'hui prévisions températures Bordeaux Saucats",
    agentName: 'chercheur_web',
    briefingInstructions: `## Format pour le briefing "Météo du Jour"

À partir des informations fournies, fais un résumé météo pour la journée.

Si des informations sur la famille sont disponibles, adapte les conseils (activités des enfants, contraintes particulières).

Format attendu:
- Météo générale en France
- Focus sur Bordeaux et Saucats (prioritaire)
- Inclus: températures, conditions, précipitations
- Conseils vestimentaires pratiques
- Ton: chaleureux et pratique
- Maximum 100 mots
- Langue: français`,
  },
];

export { BRIEFING_CONFIGS };
