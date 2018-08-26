import * as Redis from "redis";

export interface RedisAsyncMulti extends Redis.Multi {
  execAsync(): Promise<void>;
}

// export interface RedisClientType extends Redis.RedisClient {
//   srandmemberAsync(key: string): Promise<any>;
//   smembersAsync(key: string): Promise<any[]>;
//   sunionAsync(keys: string[]): Promise<any[]>;

//   hexistsAsync(key: string, field: string): Promise<any>;
//   hdelAsync(key: string, field: string): Promise<void>;
//   hgetAsync(key: string, field: string): Promise<any>;
//   hmgetAsync(key: string, fields: string[]): Promise<any>;

//   hsetAsync(key: string, field: string, value: string): Promise<void>;

//   existsAsync(key: string): Promise<any>;
//   delAsync(key: string): Promise<void>;

//   hincrbyAsync(key: string, field: string, value: number): Promise<any>;
//   hincrbyfloatAsync(key: string, field: string, value: number): Promise<any>;

//   multi(): RedisAsyncMulti;
// }

export interface IPromiseRedisClientBase {
  hget: (key: string, field: string) => Promise<any>;
  hmget: (key: string, fields: string[]) => Promise<any[]>;
  hgetall: (key: string) => Promise<any[]>;
  hlen: (key: string) => Promise<number>;
  hdel: (key: string, field: string) => Promise<number>;
  hset: (key: string, field: string, value: any) => Promise<number>;
  hincrby: (key: string, field: string, value: number) => Promise<void>;
  hincrbyfloat: (key: string, field: string, value: number) => Promise<void>;

  exists: (key: string) => Promise<boolean>;
  set: (key: string, value: any) => Promise<number>;
  del: (key: string) => Promise<number>;

  zadd: (key: string, value: string) => Promise<void>;
  zrem: (key: string, value: string) => Promise<void>;
  zcount: (key: string) => Promise<number>;
  zrange: (key: string, start: number, stop: number) => Promise<number>;

  lpush: (key: string, value: string) => Promise<void>;
  lrem: (key: string, count: number, value: string) => Promise<void>;
  lrange: (key: string, start: number, stop: number) => Promise<number>;

  sadd: (key: string, value: string) => Promise<number>;
  srem: (key: string, value: string) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  srandmember: (key: string) => Promise<string>;
  sunion: (keys: string[]) => Promise<string[]>;
}

export interface IPromiseRedisClient extends IPromiseRedisClientBase {
  multi: () => Redis.RedisClient & {
    exec: () => Promise<void>;
  };
}

export interface IPromiseRedisClientSub extends Redis.RedisClient {}
