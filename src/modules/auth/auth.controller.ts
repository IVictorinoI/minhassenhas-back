import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  LoginDto,
  SignupDto,
  TokenValidationDto,
  ValidateTokenDto,
} from './dto/auth.dto.js';

@ApiTags('Autenticação')
@Controller('oapi')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }
  @Post('signup')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.auth.signup(dto);
  }
  @Post('validateToken')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenValidationDto })
  validateToken(@Body() dto: ValidateTokenDto): TokenValidationDto {
    return this.auth.validateToken(dto.token);
  }
}
