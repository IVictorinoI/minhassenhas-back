import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ObjectIdPipe } from '../../common/pipes/object-id.pipe.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AuthenticatedUser } from '../auth/token.service.js';
import {
  CreatePasswordDto,
  PasswordSummaryDto,
  RevealedPasswordDto,
  UpdatePasswordDto,
} from './dto/password.dto.js';
import { PasswordsService } from './passwords.service.js';

@ApiTags('Credenciais')
@ApiBearerAuth()
@Controller('api/passwords')
@UseGuards(AuthGuard)
export class PasswordsController {
  constructor(private readonly passwords: PasswordsService) {}
  @Get('myPasswords')
  @ApiOkResponse({ type: PasswordSummaryDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<PasswordSummaryDto[]> {
    return this.passwords.list(user._id);
  }
  @Get('viewPassword')
  @ApiOkResponse({ type: RevealedPasswordDto })
  @ApiQuery({ name: '_id', type: String })
  reveal(
    @Query('_id') id: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RevealedPasswordDto> {
    if (!id) throw new BadRequestException('Informe o _id da senha.');
    return this.passwords.reveal(new ObjectIdPipe().transform(id), user._id);
  }
  @Post()
  @ApiCreatedResponse({ type: PasswordSummaryDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePasswordDto,
  ): Promise<PasswordSummaryDto> {
    return this.passwords.create(user._id, dto);
  }
  @Put(':id')
  @ApiOkResponse({ type: PasswordSummaryDto })
  update(
    @Param('id', ObjectIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePasswordDto,
  ): Promise<PasswordSummaryDto> {
    return this.passwords.update(id, user._id, dto);
  }
  @Delete(':id')
  @ApiOkResponse({ type: PasswordSummaryDto })
  remove(
    @Param('id', ObjectIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PasswordSummaryDto> {
    return this.passwords.remove(id, user._id);
  }
}
