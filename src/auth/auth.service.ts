import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginAlumniDto } from './dto/login-alumni.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RsuApiService } from '../rsu-api/rsu-api.service';
import * as bcrypt from 'bcrypt'
import * as crypto from "node:crypto";
import ms from "ms";
import axios from 'axios';
import { Alumni, User } from 'generated/prisma/client';

// Activity
import { ActivityService } from 'src/activity/activity.service';

@Injectable()
export class AuthService {

  private bearerToken: string | undefined;

  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rsuApiService: RsuApiService,
    private readonly activityService: ActivityService,

  ) {
    this.bearerToken = this.jwtService.sign(
      {
        iss: "https://ecampus.rsu.edu.ng",
        aud: "https://ecampus.rsu.edu.ng",
        username: "ict.idcards",
      },
      {
        secret: this.rsuApiService.getApiKey(),
        expiresIn: "365d",
      }
    );
  }

  private async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async loginUser(data: LoginUserDto) {
    try {
      const user = await this.prisma.user.findFirst({ where: { email: data.email } });

      if (!user) {
        return { status: 404, message: "Credentials not found." }
      }

      const matchPassword = await bcrypt.compare(data.password, user.password);
      if (!matchPassword) {
        return { status: 203, message: "Invalid Login Credentials" }
      }

      const accessToken = this.jwtService.sign({
        id: user.id,
        role: user.roleId
      });

      const refreshToken = crypto.randomBytes(32).toString("hex");

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          refresh_token: refreshToken,
          refresh_token_expiry: new Date(Date.now() + ms("30d")),
          last_login: new Date(),
        }
      })

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
              name: true
            }
          },
          isActive: true,
          last_login: true,
        }
      });

      await this.activityService.create({
        action: "LOGIN",
        entity: "USER",
        description: `User ${loggedinUser?.email} logged in`,
        actorType: loggedinUser!.role!.name,
        actorId: String(user.id),
      });

      return {
        status: 200,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: loggedinUser
      }

    } catch (error) {
      return {
        status: 500,
        message: `An error occured: ${error}`
      }
    }
  }

  async loginAlumni(data: LoginAlumniDto) {
    try {
      if (!data.matric_number) {
        return {
          status: 400,
          message: "Matric number is required"
        };
      }
      let user = await this.prisma.alumni.findUnique({ where: { matric_number: data.matric_number } });

      if (!user) {
        // check by email


        console.log("Calling RSU API...");
        const apiResponse = await axios.post(
          "https://ecampus.rsu.edu.ng/php/api/index.php//users/get_student_history?userid=ict.idcards",
          { mat_no: data.matric_number },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Bearer ${this.bearerToken}`,
            },
            transformRequest: [(data) => new URLSearchParams(data).toString()],
          }
        );

        console.log("RSU API Res...:", apiResponse.data);

        if (apiResponse.data.statuscode !== 0) {
          return { status: 200, message: "Invalid matric number" }
        }

        const { firstName, middleName, lastName } = this.splitName(
          apiResponse.data.data.biodata.fullname
        );

        const existingByEmail = await this.prisma.alumni.findUnique({
          where: { email: apiResponse.data.data.biodata.email },
        });

        if (existingByEmail) {
          user = existingByEmail;
        } else {
          user = await this.prisma.alumni.create({
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
          });
        }

        console.log("created user:", user)

        if (!user) {
          throw new HttpException("Unable to create user", HttpStatus.INTERNAL_SERVER_ERROR);
        }

      }

      const accessToken = this.jwtService.sign({
        id: user.id,
        role: user.roleId,
      });

      const refreshToken = crypto.randomBytes(32).toString("hex");

      await this.prisma.alumni.update({
        where: { id: user.id },
        data: {
          isActive: true,
          refresh_token: refreshToken,
          refresh_token_expiry: new Date(Date.now() + ms("30d")),
          last_login: new Date(),
        },
      });

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
          role: {
            select: {
              id: true,
              name: true
            }
          },
          phone_number: true,
          data: true,
          last_login: true,
          isActive: true,
          createdAt: true
        }
      });

      await this.activityService.create({
        action: "LOGIN",
        entity: "ALUMNI",
        description: `Alumni ${user.email || createdAlumni?.email} logged in`,
        actorType: "ALUMNI",
        actorId: String(user.id || createdAlumni?.id),
      });

      return {
        status: 200,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: createdAlumni
      };

    } catch (error) {
      return {
        status: 500,
        message: `An error occured: ${error}`
      };
    }
  }

  async getProfile(user: User | Alumni) { }

  async logout(user: User | Alumni) {
    try {
      if (!user) {
        return {
          status: 400,
          message: "User Not Found"
        };
      }

      if ("matric_number" in user) {
        await this.prisma.alumni.update({
          where: { id: user.id },
          data: {
            refresh_token: null,
            refresh_token_expiry: null,
            isActive: false
          }
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            refresh_token: null,
            refresh_token_expiry: null
          }
        })
      }

      const isAlumni = "matric_number" in user;

      await this.activityService.create({
        action: "LOGOUT",
        entity: isAlumni ? "ALUMNI" : "USER",
        description: `${isAlumni ? "Alumni" : "User"} ${user.email} logged out`,
        actorType: isAlumni ? "ALUMNI" : "USER",
        actorId: String(user.id),
      });

      return {
        status: 200,
        message: "Logged out successfully"
      }
    } catch (error) {
      return {
        status: 500,
        message: `An error occured: ${error}`
      }
    }
  }

  splitName(name: string) {
    const [lastName, otherNames] = name.split(",").map((part) => part.trim());
    const [firstName, middleName] = otherNames.split(" ").filter(Boolean);

    return { firstName, middleName, lastName };
  }

  getGender(gender: string) {
    switch (gender.trim().toUpperCase()) {
      case "F":
      case "FEMALE":
        return "FEMALE";
      case "M":
      case "MALE":
        return "MALE";
    }
  }

}
