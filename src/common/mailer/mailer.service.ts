import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: `"MonoCommerce" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your email address',
        html: `
        <p>Hello,</p>
        <p>Click the link below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (e: any) {
      this.logger.error(
        `Failed to send verification to ${email}: ${e.message}`,
      );
      throw e;
    }
  }
}
