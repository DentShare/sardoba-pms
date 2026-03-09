import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { DynamicPricingService } from './dynamic-pricing.service';
import { CreateRuleDto, UpdateRuleDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Dynamic Pricing')
@ApiBearerAuth()
export class DynamicPricingController {
  constructor(private readonly dynamicPricingService: DynamicPricingService) {}

  @Get('properties/:id/pricing-rules')
  @ApiOperation({ summary: 'List pricing rules' })
  async findAll(@Param('id', ParseIntPipe) id: number) {
    return this.dynamicPricingService.findAll(id);
  }

  @Post('properties/:id/pricing-rules')
  @ApiOperation({ summary: 'Create pricing rule' })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRuleDto,
  ) {
    return this.dynamicPricingService.create(id, dto);
  }

  @Get('pricing-rules/:ruleId')
  @ApiOperation({ summary: 'Get one pricing rule' })
  async findOne(
    @Param('ruleId') ruleId: string,
    @Query('property_id', ParseIntPipe) propertyId: number,
  ) {
    return this.dynamicPricingService.findOne(ruleId, propertyId);
  }

  @Put('pricing-rules/:ruleId')
  @ApiOperation({ summary: 'Update pricing rule' })
  async update(
    @Param('ruleId') ruleId: string,
    @Query('property_id', ParseIntPipe) propertyId: number,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.dynamicPricingService.update(ruleId, propertyId, dto);
  }

  @Delete('pricing-rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pricing rule' })
  async remove(
    @Param('ruleId') ruleId: string,
    @Query('property_id', ParseIntPipe) propertyId: number,
  ) {
    return this.dynamicPricingService.remove(ruleId, propertyId);
  }

  @Patch('pricing-rules/:ruleId/toggle')
  @ApiOperation({ summary: 'Toggle rule active state' })
  async toggle(
    @Param('ruleId') ruleId: string,
    @Query('property_id', ParseIntPipe) propertyId: number,
  ) {
    return this.dynamicPricingService.toggle(ruleId, propertyId);
  }

  @Post('properties/:id/pricing-rules/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview pricing rule effect' })
  async preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRuleDto,
  ) {
    return this.dynamicPricingService.preview(id, dto);
  }

  @Get('properties/:id/pricing-rules/history')
  @ApiOperation({ summary: 'Get pricing change history' })
  async getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.dynamicPricingService.getHistory(
      id,
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 50,
    );
  }

  @Post('properties/:id/pricing-rules/run-now')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run pricing calculation now' })
  async runNow(@Param('id', ParseIntPipe) id: number) {
    await this.dynamicPricingService.runPricingCalculation(id);
    return { message: 'Pricing calculation completed' };
  }

  @Get('pricing-rules/templates')
  @ApiOperation({ summary: 'Get preset rule templates' })
  async getTemplates() {
    return this.dynamicPricingService.getTemplates();
  }
}
