import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginUserDto {

    @ApiProperty({
        description: "Enter User Email"
    })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({
        description: "Enter User Password"
    })
    @IsString()
    @IsNotEmpty()
    password!: string;
}
