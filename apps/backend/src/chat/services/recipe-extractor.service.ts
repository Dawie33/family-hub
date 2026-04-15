import { Injectable, Logger } from '@nestjs/common'
import { OpenAIService } from '../../ai/openai.service'

export interface ExtractedRecipe {
  title: string
  ingredients: string[]
  steps: string[]
  duration: string
  difficulty: 'débutant' | 'intermédiaire' | 'chef'
  servings?: number
  sourceUrl: string
}

@Injectable()
export class RecipeExtractorService {
  private readonly logger = new Logger(RecipeExtractorService.name)

  // Taille max du texte envoyé au LLM (les pages de recettes sont souvent très lourdes)
  private readonly MAX_TEXT_LENGTH = 8000

  constructor(private readonly openAIService: OpenAIService) {}

  async extractFromUrl(url: string): Promise<ExtractedRecipe> {
    this.logger.log(`Extraction de recette depuis : ${url}`)

    const rawHtml = await this.fetchPage(url)
    const plainText = this.stripHtml(rawHtml).slice(0, this.MAX_TEXT_LENGTH)

    return this.parseRecipeWithLLM(plainText, url)
  }

  // ─── Fetch de la page ────────────────────────────────────────────────────────

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyHubBot/1.0)',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} lors du chargement de ${url}`)
    }

    return response.text()
  }

  // ─── Nettoyage HTML ──────────────────────────────────────────────────────────

  private stripHtml(html: string): string {
    return html
      // Supprimer scripts, styles, nav, header, footer, aside (bruit de mise en page)
      .replace(/<(script|style|nav|header|footer|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      // Supprimer toutes les balises restantes
      .replace(/<[^>]+>/g, ' ')
      // Décoder les entités HTML courantes
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // Normaliser les espaces
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  // ─── Extraction via LLM ──────────────────────────────────────────────────────

  private async parseRecipeWithLLM(text: string, sourceUrl: string): Promise<ExtractedRecipe> {
    const systemPrompt = `Tu es un assistant spécialisé dans l'extraction de recettes de cuisine.
À partir du texte brut d'une page web, extrais les informations de la recette et réponds UNIQUEMENT avec un JSON valide, sans aucun texte supplémentaire.

Format de réponse attendu :
{
  "title": "Nom de la recette",
  "ingredients": ["200g de farine", "3 œufs", ...],
  "steps": ["Préchauffer le four à 180°C.", "Mélanger les ingrédients.", ...],
  "duration": "45 minutes",
  "difficulty": "débutant" | "intermédiaire" | "chef",
  "servings": 4
}

Règles :
- ingredients : chaque élément = quantité + ingrédient (ex: "200g de farine")
- steps : chaque étape est une phrase complète et actionnable
- duration : temps total (préparation + cuisson)
- difficulty : choisis parmi exactement ces trois valeurs
- Si une information est absente, utilise une valeur par défaut raisonnable`

    const userMessage = `Extrais la recette depuis ce texte de page web :\n\n${text}`

    const response = await this.openAIService.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'gpt-4o-mini',
    )

    const parsed = this.parseJsonResponse(response)

    return {
      title: typeof parsed.title === 'string' ? parsed.title : 'Recette extraite',
      ingredients: Array.isArray(parsed.ingredients) ? (parsed.ingredients as string[]) : [],
      steps: Array.isArray(parsed.steps) ? (parsed.steps as string[]) : [],
      duration: typeof parsed.duration === 'string' ? parsed.duration : '30 minutes',
      difficulty: this.normalizeDifficulty(parsed.difficulty),
      servings: typeof parsed.servings === 'number' ? parsed.servings : undefined,
      sourceUrl,
    }
  }

  private parseJsonResponse(raw: string): Record<string, unknown> {
    // Le LLM peut envelopper le JSON dans un bloc ```json ... ```
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonString = match ? match[1] : raw

    try {
      return JSON.parse(jsonString.trim()) as Record<string, unknown>
    } catch {
      this.logger.error(`Impossible de parser la réponse LLM : ${raw.slice(0, 200)}`)
      throw new Error("L'IA n'a pas pu extraire une recette structurée depuis cette page.")
    }
  }

  private normalizeDifficulty(value: unknown): 'débutant' | 'intermédiaire' | 'chef' {
    const allowed = ['débutant', 'intermédiaire', 'chef'] as const
    return allowed.includes(value as (typeof allowed)[number])
      ? (value as (typeof allowed)[number])
      : 'débutant'
  }
}
