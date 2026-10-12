import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';

export class SocketAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: string | string[],
  ) {
    super(app);
  }
  override createIOServer(
    port: number,
    options?: Parameters<IoAdapter['createIOServer']>[1],
  ): ReturnType<IoAdapter['createIOServer']> {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin },
      allowEIO3: true,
    } as NonNullable<typeof options>);
  }
}
