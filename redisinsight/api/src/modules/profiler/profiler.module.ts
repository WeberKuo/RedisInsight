import { Module } from '@nestjs/common';
import { SharedModule } from 'src/modules/shared/shared.module';
import { LogFileProvider } from 'src/modules/profiler/providers/log-file.provider';
import { ProfilerController } from 'src/modules/profiler/profiler.controller';
import { RedisObserverProvider } from 'src/modules/profiler/providers/redis-observer.provider';
import { ProfilerClientProvider } from 'src/modules/profiler/providers/profiler-client.provider';
import { ProfilerGateway } from './profiler.gateway';
import { ProfilerService } from './profiler.service';

@Module({
  imports: [SharedModule],
  providers: [
    RedisObserverProvider,
    ProfilerClientProvider,
    LogFileProvider,
    ProfilerGateway,
    ProfilerService,
  ],
  controllers: [ProfilerController],
})
export class ProfilerModule {}
