function createLabel(label) {
  let nameLabel = document.createElement("label");
  nameLabel.appendChild(document.createElement("span")).appendChild(document.createTextNode(label));
  return nameLabel;
}

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

class TypeSelect extends HTMLSelectElement {
  static updateAll(change) {
    [...document.querySelectorAll('select[is="type-select"]')].forEach(select => {
      if (change) {
        select.change(change.from, change.to);
      } else {
        select.update();
      }
    });
  }

  constructor() {
    super();
    this.setAttribute("is", "type-select");
    this.setAttribute("required", "true");

    this.update();
  }

  get valueType() {
    return this.value.replace("$ref:", "").replace("[]", "");
  }

  get valueIsReference() {
    return this.value.startsWith("$ref:");
  }

  get valueIsArray() {
    return this.value.endsWith("[]");
  }

  change(changeFrom, changeTo) {
    for (let option of this.options) {
      if (option.value == `$ref:${changeFrom}`) {
        option.textContent = changeTo;
        option.value = `$ref:${changeTo}`;
      } else if (option.value == `$ref:${changeFrom}[]`) {
        option.textContent = `array of ${changeTo}`;
        option.value = `$ref:${changeTo}[]`;
      }
    }
  }

  update() {
    let value = this.value;

    let types = [];
    let typeSchema = document.getElementById("type-list").schema;
    if (typeSchema) {
      for (let type of typeSchema) {
        types.push(`$ref:${type.id}`);
      }
    }
    types.push(
      "boolean", "integer", "string", "object",
      "$ref:extensionTypes.Date",
      "$ref:folders.MailFolder",
      "$ref:messages.MessageHeader", "$ref:messages.MessageList"
    );

    while (this.lastElementChild) {
      this.lastElementChild.remove();
    }

    for (let type of types) {
      let option = this.appendChild(document.createElement("option"))
      option.textContent = type.replace("$ref:", "");
      option.value = type;
    }
    for (let type of types) {
      let option = this.appendChild(document.createElement("option"))
      option.textContent = `array of ${type.replace("$ref:", "")}`;
      option.value = `${type}[]`;
    }

    this.value = value;
  }
}

class TypeList extends HTMLUListElement {
  constructor() {
    super();
    this.setAttribute("is", "type-list");
  }

  addType() {
    this.appendChild(document.createElement("li", { is: "type-item" }));
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

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.classList.add("remove-button");
    removeButton.textContent = "-";
    removeButton.onclick = () => {
      this.remove();
      TypeSelect.updateAll();
    }

    let nameLabel = this.appendChild(createLabel("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));
    this.nameControl.onchange = (event) => {
      TypeSelect.updateAll({
        from: this._oldTypeName,
        to: this.typeName,
      });
      this._oldTypeName = this.typeName;
    };

    let descriptionLabel = this.appendChild(createLabel("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    let propLabel = this.appendChild(createLabel("properties:"));
    let propAddButton = propLabel.appendChild(document.createElement("button"));
    propAddButton.classList.add("add-button");
    propAddButton.textContent = "+";
    propAddButton.onclick = () => this.propList.addParam();

    this.propList = this.appendChild(document.createElement("ul", { is: "parameter-list" }));
    this.propList.classList.add("object");
  }

  connectedCallback() {
    this._oldTypeName = this.nameControl.value = "type" + ([...this.parentNode.children].indexOf(this) + 1);
    TypeSelect.updateAll();
  }

  get typeName() {
    return this.nameControl.value;
  }

  get typeDescription() {
    return this.descriptionControl.value;
  }

  get schema() {
    return {
      id: this.typeName,
      type: "object",
      description: this.typeDescription || undefined,
      properties: this.propList.schema,
    };
  }
}

class FunctionList extends HTMLUListElement {
  constructor() {
    super();
    this.setAttribute("is", "function-list");
  }

  addFunction() {
    this.appendChild(document.createElement("li", { is: "function-item" }));
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

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.classList.add("remove-button");
    removeButton.textContent = "-";
    removeButton.onclick = () => this.remove();

    let nameLabel = this.appendChild(createLabel("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));

    let descriptionLabel = this.appendChild(createLabel("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    let paramLabel = this.appendChild(createLabel("parameters:"));
    let paramAddButton = paramLabel.appendChild(document.createElement("button"));
    paramAddButton.classList.add("add-button");
    paramAddButton.textContent = "+";
    paramAddButton.onclick = () => this.paramList.addParam();

    this.paramList = this.appendChild(document.createElement("ul", { is: "parameter-list" }));
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
    this.appendChild(document.createElement("li", { is: "event-item" }));
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
  }

  get isObject() {
    return this.classList.contains("object");
  }

  addParam() {
    this.appendChild(document.createElement("li", { is: "parameter-item" }));
  }

  get parameters() {
    return [...this.children].filter(item => item.getAttribute("is") == "parameter-item");
  }

  get schema() {
    let parameters = this.parameters;
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

    let removeButton = this.appendChild(document.createElement("button"));
    removeButton.classList.add("remove-button");
    removeButton.textContent = "-";
    removeButton.onclick = () => this.remove();

    let nameLabel = this.appendChild(createLabel("name:"));
    this.nameControl = nameLabel.appendChild(document.createElement("input", { is: "id-input" }));

    let descriptionLabel = this.appendChild(createLabel("description:"));
    this.descriptionControl = descriptionLabel.appendChild(document.createElement("input"));

    let optionalLabel = this.appendChild(createLabel("optional:"));
    this.optionalControl = optionalLabel.appendChild(document.createElement("input"));
    this.optionalControl.setAttribute("type", "checkbox");

    let typeLabel = this.appendChild(createLabel("type:"));
    this.typeControl = typeLabel.appendChild(document.createElement("select", { is: "type-select" }));
    this.typeControl.onchange = () => this.paramTypeChanged();
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

  get paramOptional() {
    return this.optionalControl.checked;
  }

  paramTypeChanged() {
    if (this.typeControl.valueType == "object") {
      if (!this.objectDetailsList) {
        this.objectDetailsList = this.appendChild(document.createElement("div"));

        let propLabel = this.objectDetailsList.appendChild(createLabel("properties:"));
        let propAddButton = propLabel.appendChild(document.createElement("button"));
        propAddButton.classList.add("add-button");
        propAddButton.textContent = "+";
        propAddButton.onclick = () => propList.addParam();

        let propList = this.objectDetailsList.appendChild(document.createElement("ul", { is: "parameter-list" }));
        propList.classList.add("object");
        propList.addParam();
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
    let obj = {};
    if (this.typeControl.valueIsReference) {
      obj["$ref"] = this.typeControl.valueType;
    } else {
      obj.type = this.typeControl.valueType;
      if (this.typeControl.valueType == "object") {
        obj.properties = this.objectDetailsList.lastElementChild.schema;
      }
    }
    if (this.typeControl.valueIsArray) {
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
    heading.appendChild(document.createTextNode(`${filename}:`));
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
customElements.define("type-select", TypeSelect, { extends: "select" });
customElements.define("type-list", TypeList, { extends: "ul" });
customElements.define("type-item", TypeItem, { extends: "li" });
customElements.define("function-list", FunctionList, { extends: "ul" });
customElements.define("function-item", FunctionItem, { extends: "li" });
customElements.define("event-list", EventList, { extends: "ul" });
customElements.define("event-item", EventItem, { extends: "li" });
customElements.define("parameter-list", ParameterList, { extends: "ul" });
customElements.define("parameter-item", ParameterItem, { extends: "li" });
customElements.define("file-output", FileOutput, { extends: "div" });
