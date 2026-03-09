import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (this.apiKey) {
      this.logger.log('AI service configured (Anthropic API key present)');
    } else {
      this.logger.warn('AI service not configured — ANTHROPIC_API_KEY missing. AI features will use fallback logic.');
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Send a text-only message to Claude API.
   */
  async sendMessage(params: {
    system: string;
    userMessage: string;
    model?: string;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: params.model || 'claude-sonnet-4-20250514',
          max_tokens: params.maxTokens || 1024,
          system: params.system,
          messages: [{ role: 'user', content: params.userMessage }],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        },
      );

      return response.data.content[0].text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Claude API error: ${error.response?.status} ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(`Claude API error: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Send a vision (image + text) message to Claude API.
   */
  async sendVisionMessage(params: {
    system: string;
    imageBase64: string;
    mediaType: string;
    userMessage: string;
    model?: string;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: params.model || 'claude-sonnet-4-20250514',
          max_tokens: params.maxTokens || 1024,
          system: params.system,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: params.mediaType,
                    data: params.imageBase64,
                  },
                },
                { type: 'text', text: params.userMessage },
              ],
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 60000,
        },
      );

      return response.data.content[0].text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Claude Vision API error: ${error.response?.status} ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(`Claude Vision API error: ${error}`);
      }
      throw error;
    }
  }
}
