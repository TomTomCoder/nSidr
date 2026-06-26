import { Module } from '@nestjs/common';
import { AuthorityMatrixController } from './authority-matrix.controller';
import { AuthorityMatrixService } from './authority-matrix.service';

@Module({
  providers: [AuthorityMatrixService],
  controllers: [AuthorityMatrixController],
  exports: [AuthorityMatrixService],
})
export class AuthorityMatrixModule {}
