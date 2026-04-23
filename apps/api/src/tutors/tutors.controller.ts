import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TutorsService } from './tutors.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Post()
  create(@Body() dto: CreateTutorDto) {
    return this.tutorsService.create(dto);
  }

  @Get()
  list() {
    return this.tutorsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tutorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTutorDto) {
    return this.tutorsService.update(id, dto);
  }
}
