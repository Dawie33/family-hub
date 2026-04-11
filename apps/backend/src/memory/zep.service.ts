import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ZepClient } from '@getzep/zep-cloud';

const FAMILY_USER_ID = 'family_user';

@Injectable()
export class ZepService implements OnModuleInit {
  private readonly logger = new Logger(ZepService.name);
  private client: ZepClient | null = null;
  private enabled = false;

  async onModuleInit() {
    const apiKey = process.env.ZEP_API_KEY;
    if (!apiKey) {
      this.logger.warn('ZEP_API_KEY not set — Zep memory disabled, using local PostgreSQL only');
      return;
    }

    try {
      this.client = new ZepClient({ apiKey });
      await this.ensureFamilyUser();
      this.enabled = true;
      this.logger.log('Zep memory enabled');
    } catch (err) {
      this.logger.error(`Zep init failed: ${err.message} — falling back to local memory`);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private async ensureFamilyUser(): Promise<void> {
    try {
      await this.client!.user.get(FAMILY_USER_ID);
    } catch {
      await this.client!.user.add({ userId: FAMILY_USER_ID });
      this.logger.log(`Zep user created: ${FAMILY_USER_ID}`);
    }
  }

  /**
   * Assure qu'un thread Zep existe pour ce sessionId.
   */
  async ensureThread(sessionId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client!.thread.get(sessionId);
    } catch {
      await this.client!.thread.create({ threadId: sessionId, userId: FAMILY_USER_ID });
    }
  }

  /**
   * Ajoute un échange utilisateur/assistant au thread Zep.
   */
  async addMessages(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
  ): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.ensureThread(sessionId);
      await this.client!.thread.addMessages(sessionId, {
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantResponse },
        ],
      });
    } catch (err) {
      this.logger.error(`Zep addMessages failed: ${err.message}`);
    }
  }

  /**
   * Retourne le contexte mémoire Zep pour le system prompt.
   * Zep extrait automatiquement les faits de TOUTES les sessions passées de l'utilisateur.
   */
  async getMemoryContext(sessionId: string): Promise<string> {
    if (!this.enabled) return '';
    try {
      await this.ensureThread(sessionId);
      const result = await this.client!.thread.getUserContext(sessionId);
      if (!result.context) return '';
      return `\n\n## Mémoire longue durée (historique famille)\n${result.context}`;
    } catch (err) {
      this.logger.error(`Zep getMemoryContext failed: ${err.message}`);
      return '';
    }
  }
}
