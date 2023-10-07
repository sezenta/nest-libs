export type KeyType = { [key: string]: string | number };
export type ValueType = { [key: string]: any };
export type ConditionKeyType = { [key: string]: string };
export type BeginsWithOptions = {
  limit?: number;
  startKey?: string;
  sort?: 'ascending' | 'descending';
  attributes?: string[];
  index?: string;
};

export type TableDef = {
  [table: string]: { HASH: string; HASH_TYPE: string; RANGE_TYPE?: string; RANGE?: string; INDEX?: TableDef };
};

export type GetAllOptions = {
  limit?: number;
  startKey?: KeyType;
  sort?: 'ascending' | 'descending';
  attributes?: string[];
  index?: string;
};
export type GetFirstOptions = {
  startKey?: KeyType;
  sort?: 'ascending' | 'descending';
  attributes?: string[];
};
export type BatchGetRequest = {
  keys: KeyType[];
  attributes?: string[];
};

export type PutOptions = {
  expression?: string;
  names?: { [key: string]: string };
  values?: { [key: string]: any };
};

export type UpdateOptions = {
  expression?: string;
  names?: { [key: string]: string };
  values?: { [key: string]: any };
};
export type DeleteOptions = {
  expression?: string;
  names?: { [key: string]: string };
  values?: { [key: string]: any };
};

export class BatchGetResultSet {
  all: { [table: string]: ValueType[] } = {};
  values = <T = any>(table: string): T[] => {
    return (this.all?.[table] ?? []) as any;
  };
  value = <T = any>(table: string, key: KeyType): T | undefined => {
    for (const value of this.values(table)) {
      if (Object.entries(key).filter((e) => value[e[0]] !== e[1]).length === 0) {
        return value;
      }
    }
    return undefined;
  };
}

export default interface Database {
  get: <T = any>(table: string, key: KeyType, attributes?: string[]) => Promise<T | undefined>;
  put: (table: string, value: ValueType, options?: PutOptions) => Promise<void>;
  update: (table: string, updates: ValueType, options?: UpdateOptions) => Promise<void>;
  delete: (table: string, key: KeyType, options?: DeleteOptions) => Promise<void>;
  getBatch: (keys: { [table: string]: BatchGetRequest }) => Promise<BatchGetResultSet>;
  putBatch: (values: { [table: string]: ValueType | ValueType[] }) => Promise<void>;
  deleteBatch: (values: { [table: string]: KeyType | KeyType[] }) => Promise<void>;
  beginsWith: <T = any>(table: string, key: KeyType, options?: BeginsWithOptions) => Promise<T[]>;
  getAll: <T = any>(table: string, hashKey: KeyType, options?: GetAllOptions) => Promise<T[]>;
  getFirst: <T = any>(table: string, index: string, key: KeyType, options?: GetFirstOptions) => Promise<T | undefined>;
  increment: (table: string, key: KeyType, increment: { [key: string]: number }) => Promise<number>;
  createTransaction: () => DatabaseTransaction;
  // getNextId: (type: string) => Promise<string>;
}

export interface DatabaseTransaction {
  put: (table: string, value: ValueType, options?: PutOptions) => void;
  update: (table: string, updates: ValueType, options?: UpdateOptions) => void;
  increment: (table: string, key: KeyType, increment: { [key: string]: number }) => void;
  delete: (table: string, key: KeyType, options?: DeleteOptions) => void;
  commit: () => Promise<void>;
}
