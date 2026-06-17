import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class LoginAlumniDto {

    @ApiProperty({
        description: "Enter User Matric Number"
    })
    @IsString()
    @IsNotEmpty()
    matric_number!: string;
}
