// src/common/email-validation/email-validation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailValidationService {
  private readonly logger = new Logger(EmailValidationService.name);
  private readonly apiKey = process.env.ABSTRACTAPI_KEY;
  private readonly baseUrl = 'https://emailreputation.abstractapi.com/v1/';

  async validate(email: string): Promise<boolean> {
    if (!this.apiKey) {
      // fallback regex if no key
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    try {
      const { data } = await axios.get(this.baseUrl, {
        params: { api_key: this.apiKey, email },
      });

      const deliverable =
        data.email_deliverability?.status === 'deliverable' &&
        data.email_quality?.is_disposable === false &&
        data.email_quality?.is_username_suspicious === false;

      if (!deliverable)
        this.logger.warn(`Email validation failed for ${email}`);

      return Boolean(deliverable);
    } catch (err: any) {
      this.logger.error(`Email validation fallback: ${err.message}`);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  }
}
