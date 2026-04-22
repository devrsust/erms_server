// import { Injectable } from '@nestjs/common';
// import { PrismaMariaDb } from '@prisma/adapter-mariadb';
// import { ConfigService } from '@nestjs/config';
// import { PrismaClient } from 'generated/prisma/client';


// @Injectable()
// export class PrismaService extends PrismaClient {

//     constructor(configService: ConfigService) {
//         const url = configService.get("DATABASE_URL");

//         if (!url) {
//             throw new Error('DATABASE_URL is not defined');
//         }

//         super({
//             adapter: new PrismaMariaDb(url),
//         });
//     }
// }

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL');

    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
      connectionString: url,
    });

    super({
      adapter: new PrismaPg(pool),
    });
  }
}