import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RsuApiService } from '../rsu-api/rsu-api.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import ms from 'ms';
import axios from 'axios';
import { Alumni, User, Role } from 'generated/prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private bearerToken: string | undefined;
  private readonly REFRESH_TOKEN_EXPIRY = '30d';
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rsuApiService: RsuApiService,
  ) {
    this.initializeBearerToken();
  }

  private initializeBearerToken(): void {
    this.bearerToken = this.jwtService.sign(
      {
        iss: 'https://ecampus.rsu.edu.ng',
        aud: 'https://ecampus.rsu.edu.ng',
        username: 'ict.idcards',
      },
      {
        secret: this.rsuApiService.getApiKey(),
        expiresIn: '365d',
      },
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private async updateUserRefreshToken(
    userId: number,
    refreshToken: string,
    isAlumni: boolean,
  ): Promise<void> {
    const updateData = {
      refresh_token: refreshToken,
      refresh_token_expiry: new Date(Date.now() + ms(this.REFRESH_TOKEN_EXPIRY)),
      last_login: new Date(),
      isActive: true,
    };

    if (isAlumni) {
      await this.prisma.alumni.update({ where: { id: userId }, data: updateData });
    } else {
      await this.prisma.user.update({ where: { id: userId }, data: updateData });
    }
  }

  private generateAccessToken(
    sub: number,
    email?: string,
    role?: string,
    roleId?: number,
  ): string {
    return this.jwtService.sign({
      sub,
      email,
      role,
      roleId,
    });
  }

  async loginUser(data: LoginUserDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: data.email },
        select: {
          id: true,
          email: true,
          password: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Credentials not found.');
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid Login Credentials');
      }

      const accessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role?.name,
        user.roleId!,
      );

      const refreshToken = this.generateRefreshToken();
      const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

      await this.updateUserRefreshToken(user.id, hashedRefreshToken, false);

      const loggedinUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
          last_login: true,
        },
      });

      return {
        status: HttpStatus.OK,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: loggedinUser,
      };
    } catch (error) {
      this.logger.error(`loginUser error: ${error}`);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        'An error occurred during login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async loginAlumni(data: LoginAlumniDto) {
    try {
      if (!data.matric_number?.trim()) {
        throw new HttpException('Matric number is required', HttpStatus.BAD_REQUEST);
      }

      let user = await this.prisma.alumni.findUnique({
        where: { matric_number: data.matric_number },
        include: { role: true },
      });

      if (!user) {
        user = await this.fetchAndCreateAlumni(data.matric_number);
      }

      if (!user) {
        throw new HttpException(
          'Unable to process alumni record',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const accessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role?.name,
        user.roleId!,
      );

      const refreshToken = this.generateRefreshToken();
      const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

      await this.updateUserRefreshToken(user.id, hashedRefreshToken, true);

      const createdAlumni = await this.prisma.alumni.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstname: true,
          middlename: true,
          lastname: true,
          date_of_birth: true,
          gender: true,
          matric_number: true,
          email: true,
          role: { select: { id: true, name: true } },
          phone_number: true,
          data: true,
          last_login: true,
          isActive: true,
          createdAt: true,
        },
      });

      return {
        status: HttpStatus.OK,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: createdAlumni,
      };
    } catch (error) {
      this.logger.error(`loginAlumni error: ${error}`);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        'An error occurred during alumni login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchAndCreateAlumni(matricNumber: string): Promise<any> {
    try {
      const apiResponse = await axios.post(
        'https://ecampus.rsu.edu.ng/php/api/index.php//users/get_student_history?userid=ict.idcards',
        { mat_no: matricNumber },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${this.bearerToken}`,
          },
          timeout: 10000,
          transformRequest: [(data) => new URLSearchParams(data).toString()],
        },
      );

      if (apiResponse.data.statuscode !== 0) {
        throw new HttpException('Invalid matric number', HttpStatus.BAD_REQUEST);
      }

      const { firstName, middleName, lastName } = this.splitName(
        apiResponse.data.data.biodata.fullname,
      );

      const existingByEmail = await this.prisma.alumni.findUnique({
        where: { email: apiResponse.data.data.biodata.email },
        include: { role: true },
      });

      if (existingByEmail) return existingByEmail;

      return await this.prisma.alumni.create({
        data: {
          firstname: firstName,
          lastname: lastName,
          middlename: middleName,
          email: apiResponse.data.data.biodata.email,
          matric_number: apiResponse.data.data.biodata.mat_no,
          data: apiResponse.data.data,
          gender: this.getGender(apiResponse.data.data.biodata.gender),
          date_of_birth: new Date(apiResponse.data.data.biodata.dob),
          phone_number: apiResponse.data.data.biodata.mobile,
          roleId: 3,
        },
        include: { role: true },
      });
    } catch (error) {
      this.logger.error(`fetchAndCreateAlumni error: ${error}`);

      if (axios.isAxiosError(error)) {
        throw new HttpException(
          'Error fetching data from external API',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw error;
    }
  }

  async logout(user: { id: number; role: number | string }) {
    try {
      if (!user?.id) {
        throw new HttpException('User Not Found', HttpStatus.BAD_REQUEST);
      }

      const isAlumni = user.role === 'ALUMNI' || user.role === 3;

      const updateData = {
        refresh_token: null,
        refresh_token_expiry: null,
        isActive: false,
      };

      if (isAlumni) {
        await this.prisma.alumni.update({ where: { id: user.id }, data: updateData });
      } else {
        await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      }

      return {
        status: HttpStatus.OK,
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error(`logout error: ${error}`);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        'An error occurred during logout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(
    userId: number,
    data: { firstname?: string; lastname?: string; email?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
      },
    });
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      status: 200,
      message: 'Password changed successfully',
    };
  }

  splitName(name: string) {
    if (!name?.includes(',')) {
      return { firstName: '', middleName: '', lastName: name || '' };
    }

    const [lastName, otherNames] = name.split(',').map((p) => p.trim());
    const names = otherNames.split(' ').filter(Boolean);

    return {
      firstName: names[0] || '',
      middleName: names.slice(1).join(' ') || '',
      lastName,
    };
  }

  getGender(gender: string) {
    const map: Record<string, string> = {
      F: 'FEMALE',
      FEMALE: 'FEMALE',
      M: 'MALE',
      MALE: 'MALE',
    };

    return map[gender?.trim()?.toUpperCase()] ?? undefined;
  }
}
