import {
  DeleteRequest,
  DynamoDB,
  KeysAndAttributes,
  PutRequest,
  WriteRequest,
} from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommandInput,
  DeleteCommandInput,
  DynamoDBDocument,
  GetCommandInput,
  PutCommandInput,
  QueryCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import Database, {
  BatchGetRequest,
  BatchGetResultSet,
  BeginsWithOptions,
  DeleteOptions,
  GetAllOptions,
  GetFirstOptions,
  KeyType,
  PutOptions,
  TableDef,
  UpdateOptions,
  ValueType,
} from './Database';

import DynamoDbDatabaseTransaction from './DynamoDbDatabaseTransaction';
import TableDefinition from './TableDefinitions';
// import BatchWriteItemRequestMap = DocumentClient.BatchWriteItemRequestMap;
// import BatchGetRequestMap = DocumentClient.BatchGetRequestMap;
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { Inject } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './dynamodb.definitions';

interface DynamoDbModuleOptions {
  prefix: string;
  region: string;
  tables: Record<string, any>;
}

type BatchWriteItemRequestMap = Record<
  string,
  (Omit<WriteRequest, 'PutRequest' | 'DeleteRequest'> & {
    PutRequest?: Omit<PutRequest, 'Item'> & {
      Item: Record<string, NativeAttributeValue> | undefined;
    };
    DeleteRequest?: Omit<DeleteRequest, 'Key'> & {
      Key: Record<string, NativeAttributeValue> | undefined;
    };
  })[]
>;

type BatchGetRequestMap = Record<
  string,
  Omit<KeysAndAttributes, 'Keys'> & {
    Keys: Record<string, NativeAttributeValue>[] | undefined;
  }
>;

export class DynamoDbDatabase implements Database {
  documentClient: DynamoDBDocument;
  prefix: string;
  getBatchSize: number;
  putBatchSize: number;
  deleteBatchSize: number;
  private readonly tables: TableDef;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: DynamoDbModuleOptions,
  ) {
    TableDefinition.DynamoDbResources = options.tables;
    this.prefix = options.prefix;
    this.putBatchSize = 25;
    this.deleteBatchSize = 25;
    this.getBatchSize = 100;
    this.tables = TableDefinition.getDefinition();
    const ddbClient = new DynamoDB({
      region: options.region,
    });
    this.documentClient = DynamoDBDocument.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    // this.documentClient = new DynamoDB.DocumentClient({
    //   ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
    //     endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    //     sslEnabled: false,
    //     region: 'local',
    //   }),
    // });
  }

  consoleLog = (name: string, params: [string, any][]) => {
    console.log(
      `db.${name}(${params
        .map((value) => [value[0], JSON.stringify(value[1])])
        .map((value) => value.join(': '))
        .join(', ')})`,
    );
  };

  get = async <T>(table: string, key: KeyType, attributes?: string[]) => {
    this.consoleLog('get', [
      ['table', table],
      ['key', key],
      ['attributes', attributes],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const param: GetCommandInput = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      AttributesToGet: attributes,
    };
    const result = await this.documentClient.get(param);
    return result.Item ? (result.Item as T) : undefined;
  };

  put = async (table: string, value: ValueType, options?: PutOptions) => {
    this.consoleLog('put', [
      ['table', table],
      ['data', value],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error('Table not found');
    }
    const params: PutCommandInput = {
      TableName: `${this.prefix}-${table}`,
      Item: value,
      ConditionExpression: options?.expression,
      ExpressionAttributeNames: options?.names,
      ExpressionAttributeValues: options?.values,
    };
    await this.documentClient.put(params);
  };

  delete = async (table: string, key: KeyType, options?: DeleteOptions) => {
    this.consoleLog('delete', [
      ['table', table],
      ['key', key],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const params: DeleteCommandInput = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      ConditionExpression: options?.expression,
      ExpressionAttributeNames: options?.names,
      ExpressionAttributeValues: options?.values,
    };
    await this.documentClient.delete(params);
  };

  update = async (
    table: string,
    updates: ValueType,
    options?: UpdateOptions,
  ) => {
    this.consoleLog('update', [
      ['table', table],
      ['updates', updates],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const key: KeyType = {};
    key[tableDef.HASH] = updates[tableDef.HASH];
    delete updates[tableDef.HASH];
    if (tableDef.RANGE) {
      key[tableDef.RANGE] = updates[tableDef.RANGE];
      delete updates[tableDef.RANGE];
    }
    const names: { [key: string]: any } = {};
    const val: { [key: string]: any } = {};
    const changes: string[] = [];
    const deletions: string[] = [];
    for (const v of Object.keys(updates)) {
      if (updates[v] !== undefined) {
        val[`:${v}`] = updates[v];
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
      for (const v of Object.keys(options.values)) {
        val[`:${v}`] = options.values[v];
      }
      if (options.names) {
        for (const v of Object.keys(options.names)) {
          names[`#${v}`] = options.names[v];
        }
      }
      cond = options.expression;
    }
    const params: UpdateCommandInput = {
      TableName: `${this.prefix}-${table}`,
      Key: key,
      UpdateExpression: expression,
      ExpressionAttributeValues: Object.keys(val).length > 0 ? val : undefined,
      ExpressionAttributeNames: names,
      ConditionExpression: cond,
    };
    console.log('DB Update Params: ', JSON.stringify(params, null, 2));
    await this.documentClient.update(params);
  };

  putBatch = async (values: { [table: string]: ValueType | ValueType[] }) => {
    // this.consoleLog('putBatch', [['values', values]]);
    for (const table of Object.keys(values)) {
      const tableDef = this.tables[table];
      if (!tableDef) {
        throw Error(`Table ${table} not found`);
      }
    }
    const requests: BatchWriteItemRequestMap[] = [{}];
    let reqIndex = 0;
    let batchIndex = 0;
    for (const table of Object.keys(values)) {
      const tableName = `${this.prefix}-${table}`;
      const vals = Array.isArray(values[table])
        ? (values[table] as ValueType[])
        : [values[table]];
      for (const val of vals) {
        if (requests.length <= batchIndex) {
          requests.push({});
        }
        if (!requests[batchIndex][tableName]) {
          requests[batchIndex][tableName] = [];
        }
        requests[batchIndex][tableName].push({ PutRequest: { Item: val } });
        reqIndex += 1;
        if (reqIndex === this.putBatchSize) {
          reqIndex = 0;
          batchIndex += 1;
        }
      }
    }
    console.log(`Putting ${requests.length} batches`);
    batchIndex = 0;
    for (const request of requests) {
      const params: BatchWriteCommandInput = { RequestItems: request };
      await this.documentClient.batchWrite(params);
      batchIndex += 1;
      console.log(`Completed ${batchIndex} batch/${requests.length} batches`);
    }
  };

  deleteBatch = async (keys: { [table: string]: KeyType | KeyType[] }) => {
    this.consoleLog('deleteBatch', [['keys', keys]]);
    for (const table of Object.keys(keys)) {
      const tableDef = this.tables[table];
      if (!tableDef) {
        throw Error(`Table ${table} not found`);
      }
    }
    const requests: BatchWriteItemRequestMap[] = [{}];
    let reqIndex = 0;
    let batchIndex = 0;
    for (const table of Object.keys(keys)) {
      const tableName = `${this.prefix}-${table}`;
      const vals = Array.isArray(keys[table])
        ? (keys[table] as KeyType[])
        : [keys[table]];
      for (const val of vals) {
        if (requests.length <= batchIndex) {
          requests.push({});
        }
        if (!requests[batchIndex][tableName]) {
          requests[batchIndex][tableName] = [];
        }
        requests[batchIndex][tableName].push({ DeleteRequest: { Key: val } });
        reqIndex += 1;
        if (reqIndex === this.deleteBatchSize) {
          reqIndex = 0;
          batchIndex += 1;
        }
      }
    }
    if (reqIndex === 0 && batchIndex === 0) {
      return;
    }
    batchIndex = 0;
    for (const request of requests) {
      const params: BatchWriteCommandInput = { RequestItems: request };
      await this.documentClient.batchWrite(params);
      batchIndex += 1;
      console.log(`Completed ${batchIndex} batch/batches`);
    }
  };

  getBatch = async (keys: { [table: string]: BatchGetRequest }) => {
    this.consoleLog('getBatch', [['keys', keys]]);

    const requests: BatchGetRequestMap[] = [{}];
    let reqIndex = 0;
    let batchIndex = 0;
    for (const table of Object.keys(keys)) {
      const tableDef = this.tables[table];
      if (!tableDef) {
        throw Error(`Table ${table} not found`);
      }
      const tableName = `${this.prefix}-${table}`;
      const req = keys[table];
      if (req.keys.length === 0) {
        continue;
      }
      const keysAdded = new Set<string>();
      let attributes: string[] | undefined = undefined;
      if (req.attributes) {
        const attrSet = new Set<string>(req.attributes);
        attrSet.add(tableDef.HASH);
        if (tableDef.RANGE) {
          attrSet.add(tableDef.RANGE);
        }
        attributes = [...attrSet];
      }

      for (const key of req.keys) {
        const keyString = JSON.stringify(key);
        if (keysAdded.has(keyString)) {
          continue;
        }
        if (requests.length <= batchIndex) {
          requests.push({});
        }
        if (!requests[batchIndex][tableName]) {
          requests[batchIndex][tableName] = {
            Keys: [],
            AttributesToGet: attributes,
          };
        }
        requests[batchIndex][tableName].Keys?.push(key);
        keysAdded.add(keyString);
        reqIndex += 1;
        if (reqIndex === this.getBatchSize) {
          reqIndex = 0;
          batchIndex += 1;
        }
      }
    }
    console.log(`Getting ${requests.length} batches`);
    if (Object.keys(requests[0]).length === 0) {
      return new BatchGetResultSet();
    }
    const result: { [table: string]: ValueType[] } = {};
    for (const request of requests) {
      const responses: any = (
        await this.documentClient.batchGet({ RequestItems: request })
      ).Responses;
      for (const key of Object.keys(responses)) {
        const tableName = key.replace(`${this.prefix}-`, '');
        if (!result[tableName]) {
          result[tableName] = [];
        }
        result[tableName] = result[tableName].concat(responses[key]);
      }
    }
    const rs = new BatchGetResultSet();
    rs.all = result;
    return rs;
  };

  beginsWith = async <T = any>(
    table: string,
    key: KeyType,
    options?: BeginsWithOptions,
  ) => {
    this.consoleLog('beginsWith', [
      ['table', table],
      ['hashKey', key],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }

    let def: { HASH: string; RANGE?: string } = tableDef;
    if (options?.index) {
      if (!tableDef?.INDEX?.[options.index]) {
        throw Error(`Index ${options.index} not found`);
      }
      def = tableDef.INDEX[options.index];
    }

    if (!key[def.HASH]) {
      throw Error(`Invalid HASH key. "${def.HASH}" required`);
    }
    if (!def.RANGE) {
      throw Error('This operation not supported. Use getAll.');
    }
    if (!key[def.RANGE]) {
      throw Error(`Invalid RANGE key. "${def.HASH}" required`);
    }

    const condition: any = {};
    condition[def.HASH] = {
      ComparisonOperator: 'EQ',
      AttributeValueList: [key[def.HASH]],
    };
    condition[def.RANGE] = {
      ComparisonOperator: 'BEGINS_WITH',
      AttributeValueList: [key[def.RANGE]],
    };

    const param: QueryCommandInput = {
      TableName: `${this.prefix}-${table}`,
      KeyConditions: condition,
      ScanIndexForward: options?.sort === 'ascending',
      AttributesToGet: options?.attributes,
      IndexName: options?.index,
    };

    if (options?.startKey) {
      const startKey: any = {};
      startKey[def.HASH] = key[def.HASH];
      startKey[def.RANGE] = options.startKey;
      param.ExclusiveStartKey = startKey;
    }

    if (options?.limit) {
      param.Limit = options.limit;
      return (await this.documentClient.query(param)).Items as T[];
    } else {
      param.Limit = 25;
      const data: T[] = [];
      do {
        const results: any = await this.documentClient.query(param);
        data.push(...(results.Items as T[]));
        if (results.Count < 25) {
          break;
        }
        param.ExclusiveStartKey = results.LastEvaluatedKey;
        console.log('Querying further');
        // eslint-disable-next-line no-constant-condition
      } while (true);
      return data;
    }
  };

  getFirst = async <T = any>(
    table: string,
    index: string,
    key: KeyType,
    options?: GetFirstOptions,
  ) => {
    this.consoleLog('getFirst', [
      ['table', table],
      ['index', index],
      ['hashKey', key],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    const indexDef: any = tableDef.INDEX?.[index];
    const condition: any = {};
    condition[indexDef.HASH] = {
      ComparisonOperator: 'EQ',
      AttributeValueList: [key[indexDef.HASH]],
    };
    if (indexDef.RANGE) {
      condition[indexDef.RANGE] = {
        ComparisonOperator: 'EQ',
        AttributeValueList: [key[indexDef.RANGE]],
      };
    }
    console.log('Condition', condition);
    const param: QueryCommandInput = {
      TableName: `${this.prefix}-${table}`,
      KeyConditions: condition,
      ScanIndexForward: options?.sort === 'ascending',
      AttributesToGet: options?.attributes,
      IndexName: index,
      Limit: 1,
    };

    if (options?.startKey) {
      if (Object.keys(options.startKey).length !== 1) {
        throw Error('Invalid RANGE key');
      }

      const startKey: any = {};
      startKey[indexDef.HASH] = key[indexDef.HASH];
      startKey[indexDef.RANGE] = options.startKey[indexDef.RANGE];
      param.ExclusiveStartKey = startKey;
    }
    console.log('Param', param);
    const items = (await this.documentClient.query(param)).Items as T[];
    return items.length === 0 ? undefined : items[0];
  };

  getAll = async <T = any>(
    table: string,
    hashKey: KeyType,
    options?: GetAllOptions,
  ) => {
    this.consoleLog('getAll', [
      ['table', table],
      ['hashKey', hashKey],
      ['options', options],
    ]);
    const tableDef = this.tables[table];
    if (!tableDef) {
      throw Error(`Table ${table} not found`);
    }
    if (Object.keys(hashKey).length !== 1) {
      throw Error('Invalid HASH key');
    }
    const condition: any = {};
    const hashKeyName = Object.keys(hashKey)[0];
    condition[hashKeyName] = {
      ComparisonOperator: 'EQ',
      AttributeValueList: [hashKey[hashKeyName]],
    };
    if (options?.index && options?.startKey) {
      const rk: string = tableDef.INDEX?.[options.index].RANGE as string;
      condition[rk] = {
        ComparisonOperator: options?.sort === 'ascending' ? 'GT' : 'LT',
        AttributeValueList: [options.startKey[rk]],
      };
    }

    const param: QueryCommandInput = {
      TableName: `${this.prefix}-${table}`,
      KeyConditions: condition,
      ScanIndexForward: options?.sort === 'ascending',
      AttributesToGet: options?.attributes,
      IndexName: options?.index,
    };

    if (!options?.index && options?.startKey) {
      if (Object.keys(options.startKey).length !== 1) {
        throw Error('Invalid RANGE key');
      }
      const rangeKeyName = Object.keys(options.startKey)[0];
      const startKey: any = {};
      startKey[hashKeyName] = hashKey[hashKeyName];
      startKey[rangeKeyName] = options.startKey[rangeKeyName];
      param.ExclusiveStartKey = startKey;
    }

    if (options?.limit) {
      param.Limit = options.limit;
      console.log(JSON.stringify(param, null, 2));
      return (await this.documentClient.query(param)).Items as T[];
    } else {
      param.Limit = 25;
      console.log(JSON.stringify(param, null, 2));
      const data: T[] = [];
      do {
        const results: any = await this.documentClient.query(param);
        data.push(...(results.Items as T[]));
        if (results.Count < 25) {
          break;
        }
        param.ExclusiveStartKey = results.LastEvaluatedKey;
        console.log('Querying further');
        // eslint-disable-next-line no-constant-condition
      } while (true);
      return data;
    }
  };

  increment = async (
    table: string,
    key: KeyType,
    increment: { [key: string]: number },
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
    const params: UpdateCommandInput = {
      TableName: `${this.prefix}-${table}`,
      ReturnValues: 'UPDATED_NEW',
      Key: key,
      UpdateExpression: `ADD #incfield :r`,
      ExpressionAttributeValues: {
        ':r': increment[incfield],
      },
      ExpressionAttributeNames: { [`#incfield`]: incfield },
    };
    return (await this.documentClient.update(params)).Attributes?.[incfield];
  };

  createTransaction = () => {
    return new DynamoDbDatabaseTransaction(this.prefix, this.documentClient);
  };
  // getNextId = async (type: string) => {
  //   const obj = new ServiceBase(undefined);
  //   return await obj.getNextId(type);
  // };
}
