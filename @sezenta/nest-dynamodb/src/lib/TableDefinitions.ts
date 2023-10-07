import { TableDef } from './Database';

class TableDefinition {
  private static TableDefinition: TableDef = undefined as any;
  public static DynamoDbResources: Record<string, any> = undefined as any;
  static getIndexDefinition = (idx: any, t: any) => {
    const hash = idx.KeySchema.find(
      (value: any) => value.KeyType === 'HASH',
    ).AttributeName;
    const hashType = t.Properties.AttributeDefinitions.find(
      (value: any) => value.AttributeName === hash,
    ).AttributeType;
    const range = idx.KeySchema.find(
      (value: any) => value.KeyType === 'RANGE',
    )?.AttributeName;
    const rangeType = t.Properties.AttributeDefinitions.find(
      (value: any) => value.AttributeName === range,
    )?.AttributeType;
    return {
      HASH: hash,
      HASH_TYPE: hashType,
      RANGE: range,
      RANGE_TYPE: rangeType,
    };
  };
  static getDefinition() {
    if (!TableDefinition.TableDefinition) {
      TableDefinition.TableDefinition = Object.fromEntries(
        Object.values(TableDefinition.DynamoDbResources).map((t: any) => [
          `${t.Properties.TableName.replace('${self:custom.prefix}-', '')}`,
          {
            ...TableDefinition.getIndexDefinition(t.Properties, t),
            // HASH: t.Properties.KeySchema.find((value) => value.KeyType === 'HASH').AttributeName,
            // HASH_TYPE: t.Properties.AttributeDefinitions.find((value) => value.KeyType === 'HASH').AttributeType,
            // RANGE: t.Properties.KeySchema.find((value) => value.KeyType === 'RANGE')?.AttributeName,
            // RANGE_TYPE: t.Properties.AttributeDefinitions.find((value) => value.KeyType === 'RANGE')?.AttributeType,
            INDEX: t.Properties.GlobalSecondaryIndexes
              ? Object.fromEntries(
                  t.Properties.GlobalSecondaryIndexes.map((idx: any) => [
                    idx.IndexName,
                    TableDefinition.getIndexDefinition(idx, t),
                  ]),
                )
              : undefined,
          },
        ]),
      );
    }
    return TableDefinition.TableDefinition;
  }
}

// const TableDefinition: TableDef = JSON.parse(`
// {
//   "user": {
//     "HASH": "userId",
//     "ATTRIBUTES": {
//       "userId": "S"
//     }
//   },
//   "user-conv": {
//     "HASH": "userId",
//     "RANGE": "convId",
//     "INDEX": {
//       "lastTime": {
//         "HASH": "userId",
//         "RANGE": "lastTime"
//       }
//     },
//     "ATTRIBUTES": {
//       "userId": "S",
//       "convId": "S",
//       "lastTime": "N"
//     }
//   },
//   "conv-msg": {
//     "HASH": "convId",
//     "RANGE": "msgId",
//     "ATTRIBUTES": {
//       "convId": "S",
//       "msgId": "S"
//     }
//   },
//   "conv": {
//     "HASH": "convId",
//     "ATTRIBUTES": {
//       "convId": "S"
//     }
//   },
//   "user-sub": {
//     "HASH": "userId",
//     "RANGE": "subscriptionId",
//     "ATTRIBUTES": {
//       "userId": "S",
//       "subscriptionId": "S"
//     }
//   }
// }`);

export default TableDefinition;
