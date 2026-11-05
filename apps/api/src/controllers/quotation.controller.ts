import { ApiResponse, QuotationDto, QuotationPublicDto, QuotationStatus, QuotationVersionDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { quotationService } from '../services/quotation.service';
import { pdfService } from '../services/pdf.service';
import { jobQueueService } from '../services/jobQueue.service';
import { agencySettingsService } from '../services/agencySettings.service';

export class QuotationController {
  async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.user
        ? {
            userId: req.user.id,
            role: req.user.role,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }
        : undefined;

      const result = await quotationService.calculateQuoteDetails(req.body, actor);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.createQuotation(req.body, actor);

      const response: ApiResponse<QuotationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.getQuotationById(req.params.id as string, actor);

      const response: ApiResponse<QuotationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async revise(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.reviseQuotation(req.params.id as string, req.body, actor);

      const response: ApiResponse<QuotationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.approveQuotation(req.params.id as string, req.body, actor);

      const response: ApiResponse<QuotationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.issueQuotation(req.params.id as string, actor);

      const response: ApiResponse<{ quotation: QuotationDto; shareableToken: string }> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await quotationService.listQuotationVersions(req.params.id as string, actor);

      const response: ApiResponse<QuotationVersionDto[]> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as QuotationStatus | undefined;
      const assignedAgentId = req.query.assignedAgentId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const leadId = req.query.leadId as string | undefined;

      const { quotations, total } = await quotationService.listQuotations(
        {
          search,
          status,
          assignedAgentId,
          customerId,
          leadId,
          skip: (page - 1) * limit,
          limit,
        },
        actor
      );

      const response: ApiResponse<QuotationDto[]> = {
        success: true,
        data: quotations,
        error: null,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPublicByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.getPublicQuotation(req.params.token as string);

      const response: ApiResponse<QuotationPublicDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateTravelerPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.updateTravelerPublicQuotation(
        req.params.token as string,
        req.body
      );

      const response: ApiResponse<QuotationPublicDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async acceptPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.acceptPublicQuotation(
        req.params.token as string,
        req.body?.notes
      );

      const response: ApiResponse<QuotationPublicDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async requestChangesPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.requestModificationPublicQuotation(
        req.params.token as string,
        req.body.message
      );

      const response: ApiResponse<QuotationPublicDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream / download pixel-perfect printable PDF quotation proposal for customer
   */
  async downloadPdfPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quote = await quotationService.getPublicQuotation(req.params.token as string);
      const settings = await agencySettingsService.getSettings();
      const html = pdfService.generateQuotationHtml(quote, settings);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Proposal_${quote.quoteNumber || 'quote'}.html"`
      );
      res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream / download quotation PDF for authenticated Admin / Agent
   */
  async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const quote = await quotationService.getQuotationById(req.params.id as string, actor);
      const settings = await agencySettingsService.getSettings();
      const html = pdfService.generateQuotationHtml(quote, settings);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Quotation_${quote.quoteNumber || req.params.id}.html"`
      );
      res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Async background worker job enqueue for heavy PDF generation
   */
  async queuePdfGeneration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const quote = await quotationService.getQuotationById(req.params.id as string, actor);
      const job = await jobQueueService.enqueue('GENERATE_PDF_QUOTATION', { quote });

      const response: ApiResponse<typeof job> = {
        success: true,
        data: job,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const quotationController = new QuotationController();

