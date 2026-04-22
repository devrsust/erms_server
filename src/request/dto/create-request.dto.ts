import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, ValidateIf } from "class-validator";

export class CreateRequestDto {
    @ApiProperty({
        description: "ID of the user making the request",
        example: 12,
    })
    @IsNumber()
    @IsNotEmpty({ message: "User ID is required" })
    userId: number;

    @ApiProperty({
        description: "Requested document ID",
        example: 5,
    })
    @IsNumber()
    @IsNotEmpty({ message: "Document ID is required" })
    documentId: number;

    @ApiProperty({
        description: "Request type (internal, external_local, external_foreign)",
        example: "internal",
        enum: ['internal', 'external']
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ required: false })
    @ValidateIf(o => o.type === 'external')
    @IsString()
    @IsNotEmpty({ message: 'Email is required for external requests' })
    email?: string;

    @ApiProperty({ required: false })
    @ValidateIf(o => o.type === 'internal')
    @IsString()
    @IsNotEmpty({ message: 'Faculty ID is required for internal requests' })
    facultyId?: string;

    @ApiProperty({
        description: "Address of the user making the request",
    })
    @IsString()
    @IsNotEmpty({ message: "Address is required" })
    address: string;

    @ApiProperty({
        description: "Payment or request reference number",
        example: "REQ-2026-0001",
    })
    @IsString()
    @IsNotEmpty({ message: "Reference number is required" })
    reference_number: string;
}
