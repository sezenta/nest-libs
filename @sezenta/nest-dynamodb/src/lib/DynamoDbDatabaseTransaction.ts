import Database, {
  DatabaseTransaction,
  DeleteOptions,
  KeyType,
  PutOptions,
  TableDef,
  UpdateOptions,
  ValueType,
} from './Database';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
// import TransactWriteItem = DocumentClient.TransactWriteItem;
// import Delete = DocumentClient.Delete;
// import Update = DocumentClient.Update;
import TableDefinition from './TableDefinitions';
import {
  ConditionCheck as _ConditionCheck,
  Delete as _Delete,
  Put as _Put,
  TransactWriteItem as _TransactWriteItem,
  Update as _Update,
} from '@aws-sdk/client-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';

type ConditionCheck = Omit<
  _ConditionCheck,
  'Key' | 'ExpressionAttributeValues'
> & {
  Key: Record<string, NativeAttributeValue> | undefined;
  ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
};
type Put = Omit<_Put, 'Item' | 'ExpressionAttributeValues'> & {
  Item: Record<string, NativeAttributeValue> | undefined;
  ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
};
type Delete = Omit<_Delete, 'Key' | 'ExpressionAttributeValues'> & {
  Key: Record<string, NativeAttributeValue> | undefined;
  ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
};
type Update = Omit<_Update, 'Key' | 'ExpressionAttributeValues'> & {
  Key: Record<string, NativeAttributeValue> | undefined;
  ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
};
type TransactWriteItem = Omit<
  _TransactWriteItem,
  'ConditionCheck' | 'Put' | 'Delete' | 'Update'
> & {
  ConditionCheck?: ConditionCheck;
  Put?: Put;
  Delete?: Delete;
  Update?: Update;
};
export default class DynamoDbDatabaseTransaction
  implements DatabaseTransaction
{
  documentClient: DynamoDBDocument;
  prefix = '';
  transactItems: TransactWriteItem[] = [];
  private readonly tables: TableDef;

  constructor(prefix: string, documentClient: DynamoDBDocument) {
    this.prefix = prefix;
    this.documentClient = documentClient;
    this.tables = TableDefinition.getDefinition();
  }

  consoleLog = (name: string, params: [string, any][]) => {
    console.log(
      `tx.${name}(${params
        .map((value) => [value[0], JSON.stringify(value[1])])
        .map((value) => value.join(': '))
        .join(', ')})`,
    );
  };

  delete = (table: string, key: KeyType, options?: UpdateOptions) => {
    this.consoleLog('delete', [
      ['table', table],
      ['key', key],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const params: Delete = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      ConditionExpression: options?.expression,
      ExpressionAttributeNames: options?.names,
      ExpressionAttributeValues: options?.values,
    };
    const item: TransactWriteItem = {
      Delete: params,
    };
    this.transactItems.push(item);
  };

  increment = (
    table: string,
    key: KeyType,
    increment: { [p: string]: number },
  ) => {
    this.consoleLog('increment', [
      ['table', table],
      ['key', key],
      ['increment', increment],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    if (Object.keys(increment).length !== 1) {
      throw Error('Invalid increment key');
    }
    const incfield = Object.keys(increment)[0];
    const params: Update = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      UpdateExpression: `ADD #incfield :r`,
      ExpressionAttributeValues: {
        ':r': increment[incfield],
      },
      ExpressionAttributeNames: { [`#incfield`]: incfield },
    };
    const item: TransactWriteItem = {
      Update: params,
    };
    this.transactItems.push(item);
  };

  put = (table: string, value: ValueType, options?: PutOptions) => {
    this.consoleLog('put', [
      ['table', table],
      ['data', value],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const params: Put = {
      TableName: `${this.prefix}-${table}`,
      Item: value,
      ConditionExpression: options?.expression,
      ExpressionAttributeNames: options?.names,
      ExpressionAttributeValues: options?.values,
    };
    const item: TransactWriteItem = {
      Put: params,
    };
    this.transactItems.push(item);
  };

  update = (table: string, updates: ValueType, options?: UpdateOptions) => {
    const patch = { ...updates };
    this.consoleLog('update', [
      ['table', table],
      ['updates', patch],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const key: KeyType = {};
    key[tableDef.HASH] = patch[tableDef.HASH];
    delete patch[tableDef.HASH];
    if (tableDef.RANGE) {
      key[tableDef.RANGE] = patch[tableDef.RANGE];
      delete patch[tableDef.RANGE];
    }

    const names: { [key: string]: any } = {};
    const val: { [key: string]: any } = {};
    const changes: string[] = [];
    const deletions: string[] = [];
    for (const v of Object.keys(patch)) {
      if (patch[v] !== undefined) {
        val[`:${v}`] = patch[v];
        names[`#${v}`] = v;
        changes.push(v);
      } else {
        names[`#${v}`] = v;
        deletions.push(v);
      }
    }
    let expression = '';
    if (changes.length > 0) {
      expression = `SET ${changes.map((v) => `#${v} = :${v}`).join(', ')}`;
    }

    if (deletions.length > 0) {
      expression = `${expression} REMOVE ${deletions
        .map((v) => `#${v}`)
        .join(', ')}`;
    }

    let cond = undefined;
    if (options?.expression && options?.values) {
      for (const v of Object.keys(options?.values)) {
        val[`:${v}`] = options?.values[v];
      }
      if (options?.names) {
        for (const v of Object.keys(options?.names)) {
          names[`#${v}`] = options?.names[v];
        }
      }
      cond = options?.expression;
    }
    const params: Update = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      UpdateExpression: expression,
      ExpressionAttributeValues: val,
      ExpressionAttributeNames: names,
      ConditionExpression: cond,
    };
    const item: TransactWriteItem = {
      Update: params,
    };
    this.transactItems.push(item);
  };

  commit = async () => {
    this.consoleLog('commit', []);
    await this.documentClient.transactWrite({
      TransactItems: this.transactItems,
    });
  };
}
