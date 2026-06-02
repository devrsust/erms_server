import { ApiProperty } from '@nestjs/swagger'
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator'

export class CreateTemplateDto {

    @ApiProperty({
        example: 'Academic Transcript Template',
        description: 'Template name',
    })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({
        example: '<div>Template HTML Content</div>',
        description: 'Full template HTML content',
    })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiProperty({
        example: '/rsu-logo.png',
        description: 'Template logo URL or path',
        required: false,
    })
    @IsString()
    @IsOptional()
    logo: string

    @ApiProperty({
        example: 1,
        description: 'ID of the user creating the template',
    })
    @IsInt()
    @Min(1)
    createdBy: number
}