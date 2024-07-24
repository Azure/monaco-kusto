// Definition of schema object in the context of language services. This model is exposed to consumers of this library.

export interface Column {
    readonly name: string;
    readonly type: string;
    readonly docstring?: string;
    readonly examples?: readonly string[];
}
export interface Table {
    readonly name: string;
    readonly entityType?: TableEntityType;
    readonly columns: readonly Column[];
    readonly docstring?: string;
}

export interface MaterializedViewTable extends Table {
    readonly entityType: 'MaterializedViewTable';
    readonly mvQuery?: string;
}

export interface ScalarParameter {
    readonly name: string;
    readonly type?: string;
    readonly cslType?: string;
    readonly docstring?: string;
    readonly cslDefaultValue?: string;
    readonly examples?: readonly string[];
}

export interface TabularParameter {
    readonly name: string;
    readonly columns: readonly Column[];
    readonly docstring?: string;
}

/**
 * An input parameter either be a scalar in which case it has a name, type and
 * cslType, or it can be columnar, in which case it will have a name, and a list
 * of scalar types which are the column types.
 */
export interface InputParameter extends ScalarParameter {
    readonly columns?: ScalarParameter[];
}

export interface Function {
    readonly name: string;
    readonly body: string;
    readonly inputParameters: readonly InputParameter[];
    readonly docstring?: string;
}

export interface EntityGroup {
    readonly name: string;
    readonly members: readonly string[];
}

export interface Database {
    readonly name: string;
    readonly alternateName?: string;
    readonly tables: readonly Table[];
    readonly functions: readonly Function[];
    readonly entityGroups: readonly EntityGroup[];
    readonly majorVersion: number;
    readonly minorVersion: number;
}

export type ClusterType = 'Engine' | 'DataManagement' | 'ClusterManager';

export interface EngineSchema {
    readonly clusterType: 'Engine';
    readonly cluster: {
        readonly connectionString: string;
        readonly databases: readonly Database[];
    };
    readonly database: Database | undefined; // a reference to the database that's in current context.
    globalScalarParameters?: readonly ScalarParameter[];
    globalTabularParameters?: readonly TabularParameter[];
}

export type TableEntityType = 'Table' | 'ExternalTable' | 'MaterializedViewTable';

export interface ClusterMangerSchema {
    readonly clusterType: 'ClusterManager';
    readonly accounts: readonly string[];
    readonly services: readonly string[];
    readonly connectionString: string;
}

export interface DataManagementSchema {
    readonly clusterType: 'DataManagement';
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

export const getInputParametersAsCslString = (inputParameters: readonly InputParameter[]): any =>
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
        readonly Name: string;
        readonly Type: string;
        readonly CslType: string;
        readonly DocString?: string;
        readonly Examples?: readonly string[];
    }

    export interface Table {
        readonly Name: string;
        readonly EntityType: TableEntityType;
        readonly OrderedColumns: readonly Column[];
        readonly DocString?: string;
    }

    export interface Tables {
        readonly [tableName: string]: Table;
    }

    export interface ScalarParameter {
        readonly Name: string;
        readonly Type?: string;
        readonly CslType?: string;
        readonly DocString?: string;
        readonly CslDefaultValue?: string;
    }

    export interface TabularParameter {
        readonly Name: string;
        readonly Columns: readonly Column[];
        readonly DocString?: string;
    }

    export interface InputParameter extends ScalarParameter {
        readonly Columns?: readonly ScalarParameter[];
    }

    export interface Function {
        readonly Name: string;
        readonly InputParameters: readonly InputParameter[];
        readonly Body: string;
        readonly Folder: string;
        readonly DocString: string;
        readonly FunctionKind: string;
        readonly OutputColumns: readonly any[];
    }

    export interface Functions {
        readonly [functionName: string]: Function;
    }

    export interface Database {
        readonly Name: string;
        readonly Tables: Tables;
        readonly ExternalTables: Tables;
        readonly MaterializedViews: Table;
        readonly EntityGroups: Readonly<Record<string, readonly string[]>>;
        readonly MajorVersion: number;
        readonly MinorVersion: number;
        readonly Functions: Functions;
        readonly DatabaseAccessMode: string;
    }

    export interface Databases {
        readonly [dbName: string]: Database;
    }

    export interface Result {
        readonly Plugins: readonly unknown[]; // TODO: define Plugin
        readonly Databases: Databases;
    }
}
