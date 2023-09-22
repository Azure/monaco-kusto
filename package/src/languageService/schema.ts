// Definition of schema object in the context of language services. This model is exposed to consumers of this library.

export interface Column {
    name: string;
    type: string;
    docstring?: string;
    examples?: string[];
}
export interface Table {
    name: string;
    entityType?: TableEntityType;
    columns: Column[];
    docstring?: string;
}

export interface MaterializedViewTable extends Table {
    entityType: 'MaterializedViewTable';
    mvQuery?: string;
}

export interface ScalarParameter {
    name: string;
    type?: string;
    cslType?: string;
    docstring?: string;
    cslDefaultValue?: string;
    examples?: string[];
}

export interface TabularParameter {
    name: string;
    columns: Column[];
    docstring?: string;
}

/**
 * An input parameter either be a scalar in which case it has a name, type and
 * cslType, or it can be columnar, in which case it will have a name, and a list
 * of scalar types which are the column types.
 */
export interface InputParameter extends ScalarParameter {
    columns?: ScalarParameter[];
}

export interface Function {
    name: string;
    body: string;
    inputParameters: InputParameter[];
    docstring?: string;
}

export interface EntityGroup {
    name: string;
    members: string[];
}

export interface Database {
    name: string;
    alternateName: string;
    tables: Table[];
    functions: Function[];
    entityGroups: EntityGroup[];
    majorVersion: number;
    minorVersion: number;
}

export type ClusterType = 'Engine' | 'DataManagement' | 'ClusterManager';

export interface EngineSchema {
    clusterType: 'Engine';
    cluster: {
        connectionString: string;
        databases: Database[];
    };
    database: Database | undefined; // a reference to the database that's in current context.
    globalScalarParameters?: ScalarParameter[];
    globalTabularParameters?: TabularParameter[];
}

export type TableEntityType = 'Table' | 'ExternalTable' | 'MaterializedViewTable';

export interface ClusterMangerSchema {
    clusterType: 'ClusterManager';
    accounts: string[];
    services: string[];
    connectionString: string;
}

export interface DataManagementSchema {
    clusterType: 'DataManagement';
}

/**
 * Schema types:
 * Engine – The main schema type. Contains clusters, databases, tables, table columns and functions.
 * Cluster Manager – Internal only. A schema for clusters that manages other clusters.
 * Data Management – Internal only. A schema for ingestion point operations.
 */
export type Schema = EngineSchema | ClusterMangerSchema | DataManagementSchema;

const dotnetTypeToKustoType = {
    'System.SByte': 'bool',
    'System.Byte': 'uint8',
    'System.Int16': 'int16',
    'System.UInt16': 'uint16',
    'System.Int32': 'int',
    'System.UInt32': 'uint',
    'System.Int64': 'long',
    'System.UInt64': 'ulong',
    'System.String': 'string',
    'System.Single': 'float',
    'System.Double': 'real',
    'System.DateTime': 'datetime',
    'System.TimeSpan': 'timespan',
    'System.Guid': 'guid',
    'System.Boolean': 'bool',
    'Newtonsoft.Json.Linq.JArray': 'dynamic',
    'Newtonsoft.Json.Linq.JObject': 'dynamic',
    'Newtonsoft.Json.Linq.JToken': 'dynamic',
    'System.Object': 'dynamic',
    'System.Data.SqlTypes.SqlDecimal': 'decimal',
};
export const getCslTypeNameFromClrType = (clrType: string): string => dotnetTypeToKustoType[clrType] || clrType;

const kustoTypeToEntityDataType = {
    object: 'Object',
    bool: 'Boolean',
    uint8: 'Byte',
    int16: 'Int16',
    uint16: 'UInt16',
    int: 'Int32',
    uint: 'UInt32',
    long: 'Int64',
    ulong: 'UInt64',
    float: 'Single',
    real: 'Double',
    decimal: 'Decimal',
    datetime: 'DateTime',
    string: 'String',
    dynamic: 'Dynamic',
    timespan: 'TimeSpan',
};
export const getEntityDataTypeFromCslType = (cslType: string): string => kustoTypeToEntityDataType[cslType] || cslType;

export const getCallName = (fn: Function): string =>
    `${fn.name}(${fn.inputParameters.map((p) => `{${p.name}}`).join(',')})`;

export const getExpression = (fn: Function): string =>
    `let ${fn.name} = ${getInputParametersAsCslString(fn.inputParameters)} ${fn.body}`;

export const getInputParametersAsCslString = (inputParameters: InputParameter[]): any =>
    `(${inputParameters.map((inputParameter) => getInputParameterAsCslString(inputParameter)).join(',')})`;

const getInputParameterAsCslString = (inputParameter: InputParameter): string => {
    // If this is a tabular parameter
    if (inputParameter.columns && inputParameter.columns.length > 0) {
        const attributesAsString = inputParameter.columns
            .map((col) => `${col.name}:${col.cslType || getCslTypeNameFromClrType(col.type)}`)
            .join(',');
        return `${inputParameter.name}:${attributesAsString === '' ? '*' : attributesAsString}`;
    } else {
        return `${inputParameter.name}:${inputParameter.cslType || getCslTypeNameFromClrType(inputParameter.type)}`;
    }
};

/**
 * This is the schema of the output of kusto command
 * .show schema as json
 */
export namespace showSchema {
    export interface Column {
        Name: string;
        Type: string;
        CslType: string;
        DocString?: string;
        Examples?: string[];
    }

    export interface Table {
        Name: string;
        EntityType: TableEntityType;
        OrderedColumns: Column[];
        DocString?: string;
    }

    export interface Tables {
        [tableName: string]: Table;
    }

    export interface ScalarParameter {
        Name: string;
        Type?: string;
        CslType?: string;
        DocString?: string;
        CslDefaultValue?: string;
    }

    export interface TabularParameter {
        Name: string;
        Columns: Column[];
        DocString?: string;
    }

    export type InputParameter = ScalarParameter & { Columns?: ScalarParameter[] };

    export interface Function {
        Name: string;
        InputParameters: InputParameter[];
        Body: string;
        Folder: string;
        DocString: string;
        FunctionKind: string;
        OutputColumns: any[];
    }

    export interface Functions {
        [functionName: string]: Function;
    }

    export interface Database {
        Name: string;
        Tables: Tables;
        ExternalTables: Tables;
        MaterializedViews: Table;
        EntityGroups: Record<string, string[]>;
        MajorVersion: number;
        MinorVersion: number;
        Functions: Functions;
        DatabaseAccessMode: string;
    }

    export interface Databases {
        [dbName: string]: Database;
    }

    export interface Result {
        Plugins: Plugin[];
        Databases: Databases;
    }
}
