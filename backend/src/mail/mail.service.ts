import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  // Gửi OTP qua email
  async sendOtp(email: string, otp: string) {
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');

    // Chế độ dev: chưa cấu hình mail thì log OTP ra terminal
    if (!mailUser || !mailPass) {
      console.log(`[DEV OTP] ${email}: ${otp}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') ?? 'smtp.gmail.com',
      port: Number(this.configService.get<string>('MAIL_PORT') ?? 587),
      secure: false,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });

    await transporter.sendMail({
      from: `"MangaFlow" <${mailUser}>`,
      to: email,
      subject: 'Your MangaFlow OTP Code',
      text: `Your OTP code is ${otp}. This code expires in 5 minutes.`,
    });
  }
}