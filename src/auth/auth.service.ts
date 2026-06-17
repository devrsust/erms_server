import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RsuApiService } from '../rsu-api/rsu-api.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import ms from 'ms';
import axios from 'axios';

import { PrismaService } from '../prisma/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private bearerToken: string | undefined;
  private readonly REFRESH_TOKEN_EXPIRY = '30d';
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rsuApiService: RsuApiService,
  ) {
    this.initializeBearerToken();
  }

  /**
   * Generates long-lived internal system credentials for communication 
   * with the external university ecampus API layer.
   */
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

  /**
   * Hashes plain text passwords securely via bcrypt.
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Generates a secure, cryptographically strong random string to act as a refresh token string.
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a raw refresh token before storing it in the database.
   */
  private async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Commits an encrypted refresh token value and updates metadata fields in the database.
   */
  private async updateUserRefreshToken(
    userId: number,
    refreshToken: string,
    isAlumni: boolean,
  ): Promise<Date> {
    const lastLogin = new Date();
    const updateData = {
      refresh_token: refreshToken,
      refresh_token_expiry: new Date(Date.now() + ms(this.REFRESH_TOKEN_EXPIRY)),
      last_login: lastLogin,
      isActive: true,
    };

    if (isAlumni) {
      await this.prisma.alumni.update({ where: { id: userId }, data: updateData });
    } else {
      await this.prisma.user.update({ where: { id: userId }, data: updateData });
    }

    return lastLogin;
  }

  /**
   * Issues short-lived authorization JSON Web Tokens for client routing control.
   */
  private generateAccessToken(
    sub: number,
    email?: string,
    role?: string,
    roleId?: number,
  ): string {
    return this.jwtService.sign({ sub, email, role, roleId });
  }

  /**
   * Authenticates internal system administration users.
   * @throws NotFoundException if user email doesn't match records
   * @throws UnauthorizedException if encryption signatures mismatch
   */
  async loginUser(data: LoginUserDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: data.email },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          password: true,
          roleId: true,
          isActive: true,
          role: { select: { id: true, name: true } },
        },
      });

      if (!user) throw new NotFoundException('Credentials not found.');

      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) throw new UnauthorizedException('Invalid Login Credentials');

      const accessToken = this.generateAccessToken(user.id, user.email, user.role?.name, user.roleId!);
      const refreshToken = this.generateRefreshToken();
      const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

      const freshLoginTimestamp = await this.updateUserRefreshToken(user.id, hashedRefreshToken, false);

      // Strip sensitive password field out cleanly before delivering payload map
      const { password, ...sanitizedUser } = user;

      return {
        status: HttpStatus.OK,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          ...sanitizedUser,
          last_login: freshLoginTimestamp,
          isActive: true,
        },
      };
    } catch (error) {
      this.logger.error(`loginUser error: ${error}`);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('An error occurred during login');
    }
  }

  /**
   * Authenticates graduated alumni users via registration metrics. 
   * Fetches remote datasets transparently if local database footprints do not exist yet.
   */
  async loginAlumni(data: LoginAlumniDto) {
    try {
      if (!data.matric_number?.trim()) {
        throw new BadRequestException('Matric number is required');
      }

      let alumniUser = await this.prisma.alumni.findUnique({
        where: { matric_number: data.matric_number },
        include: { role: true },
      });

      if (!alumniUser) {
        alumniUser = await this.fetchAndCreateAlumni(data.matric_number);
      }

      if (!alumniUser) {
        throw new InternalServerErrorException('Unable to process alumni record');
      }

      const accessToken = this.generateAccessToken(alumniUser.id, alumniUser.email, alumniUser.role?.name, alumniUser.roleId!);
      const refreshToken = this.generateRefreshToken();
      const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

      const freshLoginTimestamp = await this.updateUserRefreshToken(alumniUser.id, hashedRefreshToken, true);

      // Re-fetch or build identical schema formatting matching old downstream output expectation securely
      const completedRecord = await this.prisma.alumni.findUnique({
        where: { id: alumniUser.id },
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
        user: completedRecord,
      };
    } catch (error) {
      this.logger.error(`loginAlumni error: ${error}`);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('An error occurred during alumni login');
    }
  }

  /**
   * Query university data store externally to construct or resolve local records sync.
   * @private
   */
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
        throw new BadRequestException('Invalid matric number');
      }

      const biodata = apiResponse.data.data.biodata;
      const { firstName, middleName, lastName } = this.splitName(biodata.fullname);

      const existingByEmail = await this.prisma.alumni.findUnique({
        where: { email: biodata.email },
        include: { role: true },
      });

      if (existingByEmail) return existingByEmail;

      return await this.prisma.alumni.create({
        data: {
          firstname: firstName,
          lastname: lastName,
          middlename: middleName,
          email: biodata.email,
          matric_number: biodata.mat_no,
          data: apiResponse.data.data,
          gender: this.getGender(biodata.gender),
          date_of_birth: new Date(biodata.dob),
          phone_number: biodata.mobile,
          roleId: 3,
        },
        include: { role: true },
      });
    } catch (error) {
      this.logger.error(`fetchAndCreateAlumni error: ${error}`);
      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException('Error fetching data from external API');
      }
      throw error;
    }
  }

  /**
   * Clears state references, effectively logging out either a user or alumni.
   */
  async logout(user: { id: number; role: number | string }) {
    try {
      if (!user?.id) throw new BadRequestException('User Not Found');

      const isAlumni = user.role === 'ALUMNI' || user.role === 3;
      const updateData = { refresh_token: null, refresh_token_expiry: null, isActive: false };

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
      throw new InternalServerErrorException('An error occurred during logout');
    }
  }

  /**
   * Retrieves profile details for a system user.
   */
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

  /**
   * Updates basic fields for a user profile.
   */
  async updateProfile(
    userId: number,
    data: { firstname?: string; lastname?: string; email?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, firstname: true, lastname: true, email: true },
    });
  }

  /**
   * Alters an active password record string safely after ensuring matching validity verification.
   */
  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      status: HttpStatus.OK,
      message: 'Password changed successfully',
    };
  }

  /**
   * Parse utility dividing mixed text name blocks securely into structured layouts.
   */
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

  /**
   * Maps shorthand notation values into rigid structural string values.
   */
  getGender(gender: string): 'MALE' | 'FEMALE' | undefined {
    const normalised = gender?.trim()?.toUpperCase();
    if (['F', 'FEMALE'].includes(normalised)) return 'FEMALE';
    if (['M', 'MALE'].includes(normalised)) return 'MALE';
    return undefined;
  }
}