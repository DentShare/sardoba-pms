import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

/**
 * Request interface extending Express Request with JWT user payload.
 */
interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ── GET /v1/invoices ──────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List all invoices for the property' })
  @ApiResponse({ status: 200, description: 'Invoice list' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (insufficient role)' })
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.invoicesService.findAll(req.user.propertyId);
  }

  // ── GET /v1/invoices/:id ──────────────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Invoice detail' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (insufficient role)' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (invoice)' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.invoicesService.findOne(req.user.propertyId, id);
  }

  // ── POST /v1/invoices ─────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a corporate invoice for a booking' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (insufficient role)' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (booking)' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.invoicesService.create(
      req.user.propertyId,
      req.user.sub,
      dto,
    );
  }

  // ── GET /v1/invoices/:id/pdf ──────────────────────────────────────────

  @Get(':id/pdf')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'PDF file download',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (insufficient role)' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (invoice)' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoicesService.generatePdf(
      req.user.propertyId,
      id,
    );

    // Retrieve invoice number for the filename
    const invoice = await this.invoicesService.findOne(
      req.user.propertyId,
      id,
    );
    const invoiceNumber = (invoice as any).invoice_number ?? `invoice-${id}`;
    const filename = `${invoiceNumber}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
