import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';

@Controller('properties/:id/push')
@ApiTags('Push Notifications')
@ApiBearerAuth()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  async subscribe(
    @Param('id', ParseIntPipe) propertyId: number,
    @Body() dto: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    return this.pushService.subscribe(propertyId, userId, dto, userAgent);
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribe(@Body() dto: { endpoint: string }) {
    return this.pushService.unsubscribe(dto.endpoint);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test push notification' })
  async test(@Param('id', ParseIntPipe) propertyId: number) {
    return this.pushService.sendTestNotification(propertyId);
  }
}
