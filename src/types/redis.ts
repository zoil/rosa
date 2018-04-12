import * as Redis from "redis";
import * as Promise from "bluebird";

export interface RedisAsyncMulti extends Redis.Multi {
  execAsync(): Promise<void>;
}

export interface RedisClientType extends Redis.RedisClient {
  srandmemberAsync(key: string): Promise<any>;
  smembersAsync(key: string): Promise<any[]>;
  sunionAsync(keys: string[]): Promise<any[]>;

  hexistsAsync(key: string, field: string): Promise<any>;
  hdelAsync(key: string, field: string): Promise<void>;
  hgetAsync(key: string, field: string): Promise<any>;
  hmgetAsync(key: string, fields: string[]): Promise<any>;

  hsetAsync(key: string, field: string, value: string): Promise<void>;

  existsAsync(key: string): Promise<any>;
  delAsync(key: string): Promise<void>;

  hincrbyAsync(key: string, field: string, value: number): Promise<any>;
  hincrbyfloatAsync(key: string, field: string, value: number): Promise<any>;

  multi(): RedisAsyncMulti;
}
