import { SessionId } from "rosa-shared";

export type IdentityId = string;

export interface IdentityDataAccessor {
  getIdentityId(): SessionId;
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<number>;
  del(key: string): Promise<number>;
  incr(key: string, value: number): Promise<void>;
  flush(): Promise<void>;
}
