import {
BadRequestException,
Injectable,
UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UserRole } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleRequestOtpDto } from './dto/google-request-otp.dto';
import { GoogleVerifyOtpDto } from './dto/google-verify-otp.dto';
import { LoginDto } from './dto/login.dto';

type LoginUser = {
id: number;
email: string;
displayName: string;
role: UserRole;
mustChangePassword: boolean;
};

@Injectable()
export class AuthService {
constructor(
private readonly usersService: UsersService,
private readonly jwtService: JwtService,
private readonly prisma: PrismaService,
private readonly mailService: MailService,
) {}

// Login bằng tài khoản nội bộ
async login(dto: LoginDto) {
const email = dto.email.trim().toLowerCase();


const user = await this.usersService.findByEmailForAuth(email);

if (!user || !user.isActive) {
  throw new UnauthorizedException('Invalid email or password');
}

if (!user.passwordHash) {
  throw new UnauthorizedException(
    'This account does not support password login',
  );
}

const isPasswordValid = await compare(dto.password, user.passwordHash);

if (!isPasswordValid) {
  throw new UnauthorizedException('Invalid email or password');
}

const updatedUser = await this.prisma.user.update({
  where: {
    id: user.id,
  },
  data: {
    lastLoginAt: new Date(),
  },
});

return this.buildLoginResponse(updatedUser);


}

// Đổi mật khẩu lần đầu hoặc đổi mật khẩu thủ công
async changePassword(userId: number, dto: ChangePasswordDto) {
const user = await this.prisma.user.findUnique({
where: {
id: userId,
},
});


if (!user || !user.passwordHash) {
  throw new UnauthorizedException('User not found');
}

const isOldPasswordValid = await compare(
  dto.oldPassword,
  user.passwordHash,
);

if (!isOldPasswordValid) {
  throw new BadRequestException('Old password is incorrect');
}

if (dto.oldPassword === dto.newPassword) {
  throw new BadRequestException(
    'New password must be different from old password',
  );
}

const newPasswordHash = await hash(dto.newPassword, 10);

const updatedUser = await this.prisma.user.update({
  where: {
    id: userId,
  },
  data: {
    passwordHash: newPasswordHash,
    mustChangePassword: false,
  },
});

return this.buildLoginResponse(updatedUser);


}

// Google login: verify token rồi gửi OTP
async requestGoogleOtp(dto: GoogleRequestOtpDto) {
const googleClientId = process.env.GOOGLE_CLIENT_ID;


if (!googleClientId) {
  throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
}

const client = new OAuth2Client(googleClientId);

const ticket = await client.verifyIdToken({
  idToken: dto.credential,
  audience: googleClientId,
});

const payload = ticket.getPayload();

if (!payload?.email || !payload.sub) {
  throw new BadRequestException('Invalid Google account');
}

const email = payload.email.trim().toLowerCase();
const displayName = payload.name ?? email;
const avatarUrl = payload.picture;
const googleSubject = payload.sub;

let user = await this.prisma.user.findUnique({
  where: {
    email,
  },
});

if (!user) {
  user = await this.prisma.user.create({
    data: {
      email,
      displayName,
      avatarUrl,
      googleSubject,
      role: UserRole.MANGAKA,
      isActive: true,
      mustChangePassword: false,
    },
  });
} else {
  user = await this.prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      googleSubject: user.googleSubject ?? googleSubject,
      avatarUrl: user.avatarUrl ?? avatarUrl,
    },
  });
}

const otp = this.generateOtp();
const codeHash = await hash(otp, 10);

await this.prisma.otpCode.create({
  data: {
    email,
    codeHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  },
});

await this.mailService.sendOtp(email, otp);

return {
  message: 'OTP has been sent to your email',
  email,
};


}

// Verify OTP rồi trả JWT
async verifyGoogleOtp(dto: GoogleVerifyOtpDto) {
const email = dto.email.trim().toLowerCase();

const otpRecord = await this.prisma.otpCode.findFirst({
  where: {
    email,
    usedAt: null,
    expiresAt: {
      gt: new Date(),
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});

if (!otpRecord) {
  throw new BadRequestException('OTP is invalid or expired');
}

const isOtpValid = await compare(dto.otp, otpRecord.codeHash);

if (!isOtpValid) {
  throw new BadRequestException('OTP is invalid or expired');
}

const user = await this.prisma.user.findUnique({
  where: {
    email,
  },
});

if (!user || !user.isActive) {
  throw new UnauthorizedException('User not found or inactive');
}

await this.prisma.otpCode.update({
  where: {
    id: otpRecord.id,
  },
  data: {
    usedAt: new Date(),
  },
});

const updatedUser = await this.prisma.user.update({
  where: {
    id: user.id,
  },
  data: {
    emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    lastLoginAt: new Date(),
  },
});

return this.buildLoginResponse(updatedUser);


}

// Tạo OTP 6 số
private generateOtp() {
return Math.floor(100000 + Math.random() * 900000).toString();
}

// Tạo JWT response dùng chung
private buildLoginResponse(user: LoginUser) {
const payload = {
sub: user.id,
email: user.email,
displayName: user.displayName,
role: user.role,
};


return {
  accessToken: this.jwtService.sign(payload),
  tokenType: 'Bearer',
  requiresPasswordChange: user.mustChangePassword,
  user: {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  },
};


}
}
