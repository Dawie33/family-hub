import { Controller, Get, Post, Body, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { PdfService } from './pdf.service';
import { GenerateShoppingListPdfDto } from './dto/shopping-list.dto';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * Génère un PDF de liste de courses
   */
  @Post('shopping-list')
  async generateShoppingList(
    @Body() dto: GenerateShoppingListPdfDto,
  ): Promise<{ filename: string; url: string }> {
    return this.pdfService.generateShoppingListPdf(dto.items, dto.summary);
  }

  /**
   * Télécharge un PDF généré
   */
  @Get(':filename')
  async downloadPdf(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    // Sécurité: vérifier que le filename ne contient pas de path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException('Fichier non trouvé');
    }

    if (!this.pdfService.fileExists(filename)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const filepath = this.pdfService.getFilePath(filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }
}
