import {
  Controller,
  Sse,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { interval, map, Observable, switchMap } from 'rxjs';
import { ActivityService } from 'src/activity/activity.service';
import { type AuthRequest, JwtAuthGuard } from 'lib/jwt.strategy';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly activityService: ActivityService,
  ) { }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(2000).pipe(
      switchMap(() => this.userService.getLatest()),
      map((users) => ({
        data: users,
      }) as MessageEvent),
    );
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Req() req: AuthRequest) {
    const actor = req.user;

    const response = await this.userService.create(createUserDto);

    await this.activityService.create({
      action: 'CREATE',
      entity: 'USER',
      description: `${actor.email || 'Unknown'} created a user`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  @Get()
  async findAll(@Req() req: AuthRequest) {
    const actor = req.user;

    const response = await this.userService.findAll();

    await this.activityService.create({
      action: 'VIEW',
      entity: 'USER',
      description: `${actor.email || 'Unknown'} viewed all users`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const actor = req.user;

    const response = await this.userService.findOne(id);

    await this.activityService.create({
      action: 'VIEW',
      entity: 'USER',
      description: `${actor.email || 'Unknown'} viewed user ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    const actor = req.user;

    const response = await this.userService.update(id, updateUserDto);

    await this.activityService.create({
      action: 'UPDATE',
      entity: 'USER',
      description: `${actor.email || 'Unknown'} updated user ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const actor = req.user;

    const response = await this.userService.remove(id);

    await this.activityService.create({
      action: 'DELETE',
      entity: 'USER',
      description: `${actor.email || 'Unknown'} deleted user ${id}`,
      actorType: actor.role,
      actorId: String(actor.id),
    });

    return response;
  }
}
