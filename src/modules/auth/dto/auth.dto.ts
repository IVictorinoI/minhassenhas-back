import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsString({ message: 'Credenciais inválidas.' })
  email = '';
  @ApiProperty({ format: 'password' })
  @IsString({ message: 'Credenciais inválidas.' })
  password = '';
}

export class SignupDto {
  @ApiProperty() @IsString({ message: 'Dados inválidos.' }) name = '';
  @ApiProperty({ example: 'maria@example.com' }) @IsString({ message: 'Dados inválidos.' }) email =
    '';
  @ApiProperty({ format: 'password', description: 'Até 72 bytes UTF-8.' })
  @IsString({ message: 'Dados inválidos.' })
  password = '';
  @ApiProperty({ format: 'password' }) @IsString({ message: 'Dados inválidos.' }) confirm_password =
    '';
}

export class ValidateTokenDto {
  @ApiPropertyOptional({ type: String }) @Allow() token?: unknown;
}

export class AuthResponseDto {
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() token!: string;
}

export class TokenValidationDto {
  @ApiProperty() valid!: boolean;
}
