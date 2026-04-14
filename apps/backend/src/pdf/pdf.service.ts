import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { ShoppingItem } from './dto/shopping-list.dto';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir: string;
  private readonly baseUrl: string;

  constructor() {
    // Créer le dossier de sortie s'il n'existe pas
    this.outputDir = path.join(process.cwd(), 'uploads', 'pdf');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    // URL de base pour les PDF (backend URL)
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Génère un PDF de liste de courses
   */
  async generateShoppingListPdf(
    items: ShoppingItem[],
    summary?: string,
  ): Promise<{ filename: string; url: string }> {
    const filename = `liste-courses-${Date.now()}.pdf`;
    const filepath = path.join(this.outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Titre
      doc.fontSize(24).font('Helvetica-Bold').text('Liste de Courses', { align: 'center' });
      doc.moveDown();

      // Date
      const date = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.fontSize(12).font('Helvetica').text(date, { align: 'center' });
      doc.moveDown();

      // Résumé du menu si fourni
      if (summary) {
        doc.moveDown();
        doc.fontSize(11).font('Helvetica-Oblique').text(summary, { align: 'center' });
        doc.moveDown();
      }

      // Ligne de séparation
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Grouper les items par catégorie
      const grouped = this.groupByCategory(items);

      // Afficher chaque catégorie
      for (const [category, categoryItems] of Object.entries(grouped)) {
        // Titre de catégorie
        doc.fontSize(14).font('Helvetica-Bold').text(this.getCategoryEmoji(category) + ' ' + category);
        doc.moveDown(0.5);

        // Items de la catégorie
        for (const item of categoryItems) {
          const checkbox = '[ ] ';
          const itemText = item.quantity ? `${item.item} (${item.quantity})` : item.item;
          doc.fontSize(11).font('Helvetica').text(checkbox + itemText, { indent: 20 });
        }

        doc.moveDown();
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica').fillColor('#888888')
        .text('Genere par votre Assistant IA', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        this.logger.log(`PDF generated: ${filename}`);
        resolve({
          filename,
          url: `${this.baseUrl}/api/pdf/${filename}`,
        });
      });

      stream.on('error', (error) => {
        this.logger.error(`PDF generation error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Récupère le chemin d'un fichier PDF
   */
  getFilePath(filename: string): string {
    return path.join(this.outputDir, filename);
  }

  /**
   * Vérifie si un fichier PDF existe
   */
  fileExists(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }

  /**
   * Groupe les items par catégorie
   */
  private groupByCategory(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
    const grouped: Record<string, ShoppingItem[]> = {};

    for (const item of items) {
      const category = item.category || 'Autre';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    }

    // Ordre des catégories
    const categoryOrder = [
      'Legumes',
      'Fruits',
      'Viande',
      'Poisson',
      'Produits laitiers',
      'Epicerie',
      'Surgeles',
      'Boissons',
      'Autre',
    ];

    const sortedGrouped: Record<string, ShoppingItem[]> = {};
    for (const cat of categoryOrder) {
      if (grouped[cat]) {
        sortedGrouped[cat] = grouped[cat];
      }
    }
    // Ajouter les catégories non prévues
    for (const [cat, catItems] of Object.entries(grouped)) {
      if (!sortedGrouped[cat]) {
        sortedGrouped[cat] = catItems;
      }
    }

    return sortedGrouped;
  }

  /**
   * Retourne l'emoji correspondant à la catégorie
   */
  private getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      'Legumes': '',
      'Fruits': '',
      'Viande': '',
      'Poisson': '',
      'Produits laitiers': '',
      'Epicerie': '',
      'Surgeles': '',
      'Boissons': '',
      'Autre': '',
    };
    return emojis[category] || '';
  }
}
