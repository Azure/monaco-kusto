const schema = {
  Plugins: [
    {
      Name: "pivot",
    },
  ],
  Databases: {
    Samples: {
      Name: "Samples",
      Tables: {
        StormEvents: {
          Name: "StormEvents",
          DocString:
            "A dummy description to test that docstring shows as expected when hovering over a table",
          OrderedColumns: [
            {
              Name: "StartTime",
              Type: "System.DateTime",
              CslType: "datetime",
              DocString: "The start time",
            },
            {
              Name: "EndTime",
              Type: "System.DateTime",
              CslType: "datetime",
              DocString: "The end time",
            },
            {
              Name: "EpisodeId",
              Type: "System.Int32",
              CslType: "int",
            },
            {
              Name: "EventId",
              Type: "System.Int32",
              CslType: "int",
            },
            {
              Name: "State",
              Type: "System.String",
              CslType: "string",
            },
          ],
        },
        ForecastExample: {
          Name: "ForecastExample",
          OrderedColumns: [
            {
              Name: "Timestamp",
              Type: "System.DateTime",
              CslType: "datetime",
            },
            {
              Name: "RequestCount",
              Type: "System.Int64",
              CslType: "long",
            },
          ],
        },
      },
      Functions: {
        MyFunction1: {
          Name: "MyFunction1",
          InputParameters: [],
          Body: "{     StormEvents     | limit 100 }  ",
          Folder: "Demo",
          DocString: "Simple demo function",
          FunctionKind: "Unknown",
          OutputColumns: [],
        },
        MyFunction2: {
          Name: "MyFunction2",
          InputParameters: [
            {
              Name: "myLimit",
              Type: "System.Int64",
              CslType: "long",
              DocString: "Demo for a parameter",
              CslDefaultValue: "6"
            },
          ],
          Body: "{     StormEvents     | limit myLimit }  ",
          Folder: "Demo",
          DocString: "Demo function with parameter",
          FunctionKind: "Unknown",
          OutputColumns: [],
        },
      },
    },
  },
};

/**
 * set the cluster schema to be similar to the help-cluster schema.
 * execute '.show schema as json' against a cluster to get its schema and feed it to worker.setSchemaFromShowSchema.
 * @param editor the editor instance
 */
export function setSchema(editor) {
  window.monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
    const model = editor.getModel();
    workerAccessor(model.uri).then((worker) => {
      worker.setSchemaFromShowSchema(
        schema,
        "https://help.kusto.windows.net",
        "Samples"
      );
    });
  });
}
