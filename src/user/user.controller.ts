import { Controller, Sse, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { interval, map, Observable, switchMap } from 'rxjs';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Sse('stream/:uid')
  stream(@Param('uid', ParseIntPipe) uid: number): Observable<MessageEvent> {
    return interval(2000).pipe(
      switchMap(() => this.userService.getLatest(uid)),
      map((users) => ({
        data: users,
      }) as MessageEvent),
    );
  }

  @Post(':uid')
  create(
    @Body() createUserDto: CreateUserDto,
    @Param('uid', ParseIntPipe) uid: number
  ) {
    return this.userService.create(createUserDto, uid);
  }

  @Get(':uid')
  findAll(@Param('uid', ParseIntPipe) uid: number) {
    return this.userService.findAll(uid);
  }

  @Get(':id/:uid')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) uid: number
  ) {
    return this.userService.findOne(id, uid);
  }

  @Patch(':id/:uid')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) uid: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.update(id, updateUserDto, uid);
  }

  @Delete(':id/:uid')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) uid: number
  ) {
    return this.userService.remove(id, uid);
  }
}