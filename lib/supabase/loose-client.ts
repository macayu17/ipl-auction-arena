type LooseQueryResult<T = unknown> = {
  data: T | null;
  error: Error | null;
};

export interface LooseQuery<T = unknown>
  extends PromiseLike<LooseQueryResult<T>> {
  select(...args: unknown[]): LooseQuery<T>;
  insert(...args: unknown[]): LooseQuery<T>;
  upsert(...args: unknown[]): LooseQuery<T>;
  update(...args: unknown[]): LooseQuery<T>;
  delete(...args: unknown[]): LooseQuery<T>;
  eq(...args: unknown[]): LooseQuery<T>;
  neq(...args: unknown[]): LooseQuery<T>;
  gt(...args: unknown[]): LooseQuery<T>;
  in(...args: unknown[]): LooseQuery<T>;
  order(...args: unknown[]): LooseQuery<T>;
  limit(...args: unknown[]): LooseQuery<T>;
  maybeSingle(): Promise<LooseQueryResult<T>>;
  single(): Promise<LooseQueryResult<T>>;
}

export type LooseSupabaseClient = {
  from(table: string): LooseQuery<unknown>;
};

export function toLooseSupabaseClient(client: unknown) {
  return client as LooseSupabaseClient;
}
