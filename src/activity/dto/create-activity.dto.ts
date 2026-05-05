import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
} from 'class-validator';

export class CreateActivityDto {
    @ApiProperty({
        example: 'CREATE',
        description: 'Action performed (e.g. CREATE, UPDATE, LOGIN, PAYMENT_SUCCESS)',
    })
    @IsString()
    @IsNotEmpty()
    action: string;

    @ApiProperty({
        example: 'Request',
        description: 'Entity affected (e.g. Request, Payment, User)',
    })
    @IsString()
    @IsNotEmpty()
    entity: string;

    @ApiPropertyOptional({
        example: 'User created a new request',
        description: 'Human-readable description of the activity',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        example: "ALUMNI",
        description: 'Type of actor performing the action',
    })
    @IsString()
    actorType: string;

    @ApiPropertyOptional({
        example: '5',
        description: 'ID of the actor (Alumni/User)',
    })
    @IsOptional()
    @IsString()
    actorId?: string;

    @ApiPropertyOptional({
        example: { amount: 5000, reference: 'abc123' },
        description: 'Additional metadata as JSON',
    })
    @IsOptional()
    meta?: any;
}