document.getElementById("make-output").onclick = () => {
  let apiName = document.getElementById("api-name").value;
  let manifest = {
    manifest_version: 2,
    name: "Extension containing an experimental API",
    version: "1",
    experiment_apis: {
      [apiName]: {
        schema: "schema.json",
        parent: {
          scopes: ["addon_parent"],
          paths: [[apiName]],
          script: "implementation.js"
        }
      }
    }
  };
  document.getElementById("manifest-json").value = JSON.stringify(manifest, undefined, 2) + "\n";

  let typeList = document.getElementById("type-list");
  let functionList = document.getElementById("function-list");
  let eventList = document.getElementById("event-list");
  let schema = [
    {
      namespace: apiName,
      types: typeList.schema,
      functions: functionList.schema,
      events: eventList.schema,
    }
  ];
  document.getElementById("schema-json").value = JSON.stringify(schema, undefined, 2) + "\n";

  let implementation = "";
  let functions = functionList.implementation.concat(eventList.implementation);
  if (functions.length) {
    implementation = `
        ${functions.join(",\n        ")}
      `;
  }
  document.getElementById("implementation-js").value = `var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var ${apiName} = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      ${apiName}: {${implementation}}
    }
  }
};
`;
}
