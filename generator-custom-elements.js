class IdInput extends HTMLInputElement {
  constructor() {
    super();
    this.setAttribute("is", "id-input");
    this.setAttribute("pattern", "^[a-zA-Z_]\\w*$");
    this.setAttribute("required", "true");

    this.onkeydown = event => {
      if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_".includes(event.key)) {
        return;
      }
      if ("0123456789".includes(event.key) && this.selectionStart > 0) {
        return;
      }

      if (event.ctrlKey || event.altKey) {
        return;
      }
      if (event.keyCode <= 47 && event.keyCode != 32) {
        return;
      }
      if (event.keyCode == 93) { // DOM_VK_CONTEXT_MENU
        return;
      }
      if (event.keyCode >= 112 && event.keyCode <= 135) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
    };
  }
}

class PrimitiveSelect extends HTMLSelectElement {
  constructor() {
    super();
    this.setAttribute("is", "primitive-select");

    this.appendChild(document.createElement("option")).textContent = "boolean";
    this.appendChild(document.createElement("option")).textContent = "integer";
    this.appendChild(document.createElement("option")).textContent = "string";
    this.appendChild(document.createElement("option")).textContent = "object";
    this.appendChild(document.createElement("option")).textContent = "array of boolean";
    this.appendChild(document.createElement("option")).textContent = "array of integer";
    this.appendChild(document.createElement("option")).textContent = "array of string";
    this.appendChild(document.createElement("option")).textContent = "array of object";
  }

  get valueType() {
    return this.value.substring(this.value.lastIndexOf(" ") + 1);
  }

  get valueTypeIsArray() {
    return this.value.startsWith("array of ");
  }
}

class TypeList extends HTMLUListElement {
  constructor() {
    super();
    this.setAttribute("is", "type-list");

    let addButton = this.appendChild(document.createElement("li")).appendChild(document.createElement("button"));
    addButton.textContent = "+";
    addButton.onclick = () => this.addType();
  }

  addType() {
    this.insertBefore(document.createElement("li", { is: "type-item" }), this.lastElementChild);
  }

  get types() {
    return [...this.children].filter(item => item.getAttribute("is") == "type-item");
  }

  get schema() {
    let types = this.types;
    if (types.length == 0) {
      return undefined;
    }
    return this.types.map(type => type.schema);
  }

  get implementation() {
    return this.types.map(type => type.implementation).join(",\n        ");
  }
}

class TypeItem extends HTMLLIElement {
  constructor() {
    super();
    this.setAttribute("is", "type-item");

    let nameLabel = this.appendChild(document.createElement("label"));
    nameLabel.appendChild(document.createTextNode("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));

    this.appendChild(document.createElement("br"));

    let descriptionLabel = this.appendChild(document.createElement("label"));
    descriptionLabel.appendChild(document.createTextNode("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    this.appendChild(document.createElement("br"));
    this.appendChild(document.createElement("label")).textContent = "parameters:";

    this.paramList = this.appendChild(document.createElement("ul", { is: "parameter-list" }));
    this.paramList.classList.add("object");

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.textContent = "-";
    removeButton.onclick = () => this.remove();
  }

  connectedCallback() {
    this.typeName = "type" + ([...this.parentNode.children].indexOf(this) + 1);
  }

  get typeName() {
    return this.nameControl.value;
  }

  set typeName(value) {
    this.nameControl.value = value;
  }

  get typeDescription() {
    return this.descriptionControl.value;
  }

  get schema() {
    return {
      id: this.typeName,
      type: "object",
      description: this.typeDescription || undefined,
      properties: this.paramList.schema,
    };
  }
}

class FunctionList extends HTMLUListElement {
  constructor() {
    super();
    this.setAttribute("is", "function-list");

    let addButton = this.appendChild(document.createElement("li")).appendChild(document.createElement("button"));
    addButton.textContent = "+";
    addButton.onclick = () => this.addFunction();
  }

  addFunction() {
    this.insertBefore(document.createElement("li", { is: "function-item" }), this.lastElementChild);
  }

  get functions() {
    return [...this.children].filter(item => item.getAttribute("is") == "function-item");
  }

  get schema() {
    let functions = this.functions;
    if (functions.length == 0) {
      return undefined;
    }
    return functions.map(func => func.schema);
  }

  get implementation() {
    return this.functions.map(func => func.implementation);
  }
}

class FunctionItem extends HTMLLIElement {
  constructor() {
    super();
    this.setAttribute("is", "function-item");

    let nameLabel = this.appendChild(document.createElement("label"));
    nameLabel.appendChild(document.createTextNode("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));

    this.appendChild(document.createElement("br"));

    let descriptionLabel = this.appendChild(document.createElement("label"));
    descriptionLabel.appendChild(document.createTextNode("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    this.appendChild(document.createElement("br"));
    this.appendChild(document.createElement("label")).textContent = "parameters:";

    this.paramList = this.appendChild(document.createElement("ul", { is: "parameter-list" }));

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.textContent = "-";
    removeButton.onclick = () => this.remove();
  }

  connectedCallback() {
    let type = this.parentNode.id == "function-list" ? "func" : "event";
    this.funcName = type + ([...this.parentNode.children].indexOf(this) + 1);
  }

  get funcName() {
    return this.nameControl.value;
  }

  set funcName(value) {
    this.nameControl.value = value;
  }

  get funcDescription() {
    return this.descriptionControl.value;
  }

  get schema() {
    return {
      name: this.funcName,
      description: this.funcDescription || undefined,
      type: "function",
      async: this.parentNode.id == "function-list" ? true : undefined,
      parameters: this.paramList.schema,
    };
  }

  get implementation() {
    return `async ${this.funcName}(${this.paramList.implementation}) {
          // implementation
        }`;
  }
}

class EventList extends FunctionList {
  addFunction() {
    this.insertBefore(document.createElement("li", { is: "event-item" }), this.lastElementChild);
  }
}

class EventItem extends FunctionItem {
  get implementation() {
    return `${this.funcName}: new ExtensionCommon.EventManager({
          context,
          name: "myapi.${this.funcName}",
          register(fire) {
            // function callback(event) {
            //   return fire.async(${this.paramList.implementation});
            // }

            // listener.add(callback);
            // return function() {
            //   listener.remove(callback);
            // };
          },
        }).api()`;
  }
}

class ParameterList extends HTMLUListElement {
  constructor() {
    super();
    this.setAttribute("is", "parameter-list");

    let addButton = this.appendChild(document.createElement("li")).appendChild(document.createElement("button"));
    addButton.textContent = "+";
    addButton.onclick = () => this.addParam();
  }

  get isObject() {
    return this.classList.contains("object");
  }

  addParam() {
    this.insertBefore(document.createElement("li", { is: "parameter-item" }), this.lastElementChild);
  }

  get parameters() {
    return [...this.children].filter(item => item.getAttribute("is") == "parameter-item");
  }

  get schema() {
    let parameters = this.parameters;
    if (parameters.length == 0) {
      return undefined;
    }
    if (this.isObject) {
      let properties = {};
      parameters.forEach(param => {
        properties[param.paramName] = param.schema;
        delete properties[param.paramName].name;
      });
      return properties;
    }
    return parameters.map(param => param.schema);
  }

  get implementation() {
    return this.parameters.map(param => param.paramName).join(", ");
  }
}

class ParameterItem extends HTMLLIElement {
  constructor() {
    super();
    this.setAttribute("is", "parameter-item");

    let nameLabel = this.appendChild(document.createElement("label"));
    nameLabel.appendChild(document.createTextNode("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));

    this.appendChild(document.createElement("br"));

    let descriptionLabel = this.appendChild(document.createElement("label"));
    descriptionLabel.appendChild(document.createTextNode("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    this.appendChild(document.createElement("br"));

    let typeLabel = this.appendChild(document.createElement("label"));
    typeLabel.appendChild(document.createTextNode("type:"));
    this.typeControl = typeLabel.appendChild(document.createElement("select", { is: "primitive-select" }));
    this.typeControl.onchange = () => this.paramTypeChanged();

    let optionalLabel = this.appendChild(document.createElement("label"));
    this.optionalControl = optionalLabel.appendChild(document.createElement("input"));
    this.optionalControl.setAttribute("type", "checkbox");
    optionalLabel.appendChild(document.createTextNode("optional"));

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.textContent = "-";
    removeButton.onclick = () => this.remove();
  }

  connectedCallback() {
    let type = this.parentNode.isObject ? "prop" : "param";
    this.paramName = type + ([...this.parentNode.children].indexOf(this) + 1);
  }

  get paramName() {
    return this.nameControl.value;
  }

  set paramName(value) {
    return this.nameControl.value = value;
  }

  get paramDescription() {
    return this.descriptionControl.value;
  }

  get paramType() {
    return this.typeControl.valueType;
  }

  get paramOptional() {
    return this.optionalControl.checked;
  }

  paramTypeChanged() {
    if (this.typeControl.valueType == "object") {
      if (!this.objectDetailsList) {
        this.objectDetailsList = this.appendChild(document.createElement("ul", { is: "parameter-list" }));
        this.objectDetailsList.classList.add("object");
        this.objectDetailsList.addParam();
      }
    } else if (this.objectDetailsList) {
      this.objectDetailsList.remove();
      delete this.objectDetailsList;
    }
  }

  get schema() {
    let result = {
      name: this.paramName,
      description: this.paramDescription || undefined,
      optional: this.paramOptional || undefined,
    }
    let obj = {
      type: this.paramType,
    };
    if (this.paramType == "object") {
      obj.properties = this.objectDetailsList.schema;
    }
    if (this.typeControl.valueTypeIsArray) {
      return {
        ...result,
        type: "array",
        items: {
          ...obj,
        },
      };
    }
    return {
      ...result,
      ...obj,
    };
  }
}

class FileOutput extends HTMLDivElement {
  constructor() {
    super();
    this.setAttribute("is", "file-output");
  }

  connectedCallback() {
    let filename = this.getAttribute("filename");
    let heading = this.appendChild(document.createElement("h2"));
    heading.appendChild(document.createTextNode(filename));
    let copyButton = heading.appendChild(document.createElement("button"));
    copyButton.textContent = "Copy";
    copyButton.onclick = () => {
      textArea.select();
      document.execCommand("copy");
    }
    let textArea = this.appendChild(document.createElement("textarea"));
    textArea.id = filename.replace(".", "-");
  }
}

customElements.define("id-input", IdInput, { extends: "input" });
customElements.define("primitive-select", PrimitiveSelect, { extends: "select" });
customElements.define("type-list", TypeList, { extends: "ul" });
customElements.define("type-item", TypeItem, { extends: "li" });
customElements.define("function-list", FunctionList, { extends: "ul" });
customElements.define("function-item", FunctionItem, { extends: "li" });
customElements.define("event-list", EventList, { extends: "ul" });
customElements.define("event-item", EventItem, { extends: "li" });
customElements.define("parameter-list", ParameterList, { extends: "ul" });
customElements.define("parameter-item", ParameterItem, { extends: "li" });
customElements.define("file-output", FileOutput, { extends: "div" });
