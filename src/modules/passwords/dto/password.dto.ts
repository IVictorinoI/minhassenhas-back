import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CreatePasswordDto {
  @ApiProperty()
  @IsString({ message: "O atributo 'description' é obrigatório." })
  @IsNotEmpty({ message: "O atributo 'description' é obrigatório." })
  description!: string;
  @ApiProperty()
  @IsString({ message: "O atributo 'login' é obrigatório." })
  @IsNotEmpty({ message: "O atributo 'login' é obrigatório." })
  login!: string;
  @ApiPropertyOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: 'URL deve ser uma string.' })
  url?: string;
  @ApiProperty({ format: 'password' })
  @IsString({ message: "O atributo 'password' é obrigatório." })
  @IsNotEmpty({ message: "O atributo 'password' é obrigatório." })
  password!: string;
}

// Null não significa campo omitido: impedir limpeza acidental de campos obrigatórios.
export class UpdatePasswordDto extends PartialType(CreatePasswordDto, {
  skipNullProperties: false,
}) {}

export class PasswordSummaryDto {
  @ApiProperty() _id!: string;
  @ApiProperty() description!: string;
  @ApiProperty() login!: string;
  @ApiPropertyOptional() url?: string;
}

export class RevealedPasswordDto {
  @ApiProperty({ format: 'password' }) password!: string;
}
