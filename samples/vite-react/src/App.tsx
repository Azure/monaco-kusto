import React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main";
import { WorkerAccessor, getKustoWorker } from "@kusto/monaco-kusto";
import kustoWorkerUrl from "./monacoConfigHelperKustoWorker?url";
import editorWorker from "./monacoConfigHelperEditorWorker?url";

window.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    switch (label) {
      case "kusto":
        return new Worker(kustoWorkerUrl, { type: "module" });
      default:
        return new Worker(editorWorker, { type: "module" });
    }
  },
};

const schema = {
  Plugins: [],
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
              Name: "State",
              Type: "System.String",
              CslType: "string",
            },
          ],
        },
      },
      Functions: {},
    },
  },
};

function App() {
  const divRef = React.useRef(null);

  React.useLayoutEffect(() => {
    let disposed = false;

    const editor = monaco.editor.create(divRef.current, {
      value: "StormEvents | take 10",
      language: "kusto",
      theme: "kusto-light",
    });

    getKustoWorker().then((workerAccessor: WorkerAccessor) => {
      if (disposed) {
        return;
      }
      const model = editor.getModel();
      workerAccessor(model.uri).then((worker) => {
        if (disposed) {
          return;
        }
        worker.setSchemaFromShowSchema(
          schema,
          "https://help.kusto.windows.net",
          "Samples"
        );
      });
    });

    return () => {
      disposed = true;
      editor.dispose();
    };
  });

  return <div className="editor" ref={divRef} />;
}

export default App;
