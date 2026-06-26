import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DataLoaderCacheInterceptor } from './data-loader-cache.interceptor';
import { DataLoaderService } from './data-loader.service';
import { FieldLoaderService } from './resource/field-loader.service';
import { TableLoaderService } from './resource/table-loader.service';
import { ViewLoaderService } from './resource/view-loader.service';

@Global()
@Module({
  providers: [
    DataLoaderService,
    TableLoaderService,
    FieldLoaderService,
    ViewLoaderService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DataLoaderCacheInterceptor,
    },
  ],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
