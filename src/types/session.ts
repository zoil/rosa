import * as Promise from "bluebird";
import { SessionId } from "rosa-shared";

export interface SessionDataAccessor {
  getSessionId(): SessionId;
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, value: number): Promise<void>;
  incrByFloat(key: string, value: number): Promise<void>;
  flush(): Promise<void>;
}
