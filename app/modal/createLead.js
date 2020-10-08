window.customFieldNames = [];

$(document).ready(function () {

  $(".form-control").change(() => {
    removeWarnings();
  });

  app.initialized().then(
    function (_client) {
      window.client = _client;
      var methodExecuter = [];
      methodExecuter.push(client.iparams.get());
      methodExecuter.push(client.instance.context());

      Promise.all(methodExecuter).then(responses => {
        window.iparams = responses[0];
        window.currentUser = responses[1].data;

        getFields("https://api.getbase.com/v2/lead/custom_fields").then(result => {
          let customLeadFields = JSON.parse(result.response);
          createFields(customLeadFields.items);
          populateFields();
        }, err => {
          console.log("--->", err);
        });
      }, errors => {
        console.log("--->", errors);
      });
    });
});

function populateFields() {
  if (currentUser) {
    for (const property in currentUser) {
      if (document.getElementById(property)) document.getElementById(property).value = currentUser[property];
    }
  }
}

function getFields(url) {
  let options = {
    headers: {
      Authorization: `Bearer <%=iparam.zendesk_access_token %>`,
      "Content-Type": "application/json",
      "User-Agent": "PostmanRuntime/7.26.5",
      "Accept": "*/*",
    }
  };
  return new Promise((resolve, reject) => {
    client.request.get(url, options).then(result => {
      console.log("--->", result);
      resolve(result);
    }, err => {
      console.log("00--->", err);
      reject(err);
    });
  });
}

function createFields(customFields) {
  customFields.forEach(field => {
    let fieldDetails = field.data;
    let inputElement = ``;
    switch (fieldDetails.type) {
      case "multi_select_list":
        inputElement = `<fw-select id="${fieldDetails.name}" label="${fieldDetails.name}" placeholder="Select ${fieldDetails.name}" multiple>`;
        fieldDetails.choices.forEach(choice => {
          inputElement += `<fw-select-option value="${choice.name}">${choice.name}</fw-select-option>`;
        });
        inputElement += `</fw-select>`;
        customFieldNames.push(fieldDetails.name);
        break;
      case "list":
        inputElement = `<fw-select id="${fieldDetails.name}" label="${fieldDetails.name}" placeholder="Select ${fieldDetails.name}">`;
        fieldDetails.choices.forEach(choice => {
          inputElement += `<fw-select-option value="${choice.name}">${choice.name}</fw-select-option>`;
        });
        inputElement += `</fw-select>`;
        customFieldNames.push(fieldDetails.name);
        break;
      case "string":
        inputElement += `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="text" class="form-control" id="${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        customFieldNames.push(fieldDetails.name);
        break;
      case "date":
        inputElement += `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="date" class="form-control" id="${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        customFieldNames.push(fieldDetails.name);
        break;
      case "address":
        inputElement += `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="text" class="form-control" id="${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        customFieldNames.push(fieldDetails.name);
        break;
      default:
        break;
    }
    $("#cutom-field-panel").append(inputElement);
  });
}

function createLead() {
  let leadDetails = getLeadDetails();
  if (leadDetails) {
    let url = `https://api.getbase.com/v2/leads`;
    let options = {
      headers: {
        Authorization: `Bearer <%=iparam.zendesk_access_token %>`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "PostmanRuntime/7.26.5",
        Accept: "*/*",
      },
      body: JSON.stringify(leadDetails),
    };
    client.request.post(url, options).then(
      (res) => {
        console.log("Lead  Created", res);
      },
      (err) => {
        console.log("error while creating lead", err);
      }
    );
  }
}

function getLeadDetails() {
  let first_name = $("#first_name").val();
  let last_name = $("#last_name").val();
  let email = $("#email").val();
  let phone = $("#phone").val();
  let leadData = {
    data: {},
  };
  if (last_name != "") {
    leadData.data["last_name"] = last_name;
    if (first_name != "") leadData.data["first_name"] = first_name;
    if (phone != "") leadData.data["phone"] = phone;
    if (email != "") leadData.data["email"] = email;

    customFieldNames.forEach((field) => {
      let customValue = $(`#${field}`).val();
      if (leadData.data.custom_fields == undefined) {
        leadData.data.custom_fields = {};
      }
      if (customValue != "") {
        leadData.data.custom_fields[field] = customValue;
      }
    });
    return leadData;
  } else {
    showWarnings(["last-name"]);
    return null;
  }
}

// show warning by highlighting the form group 
function showWarnings(errors) {
  errors.forEach(error => {
      $(`#${error}`).addClass("invalid-group");
  });
}

function removeWarnings() {
  let invalid_groups = document.getElementsByClassName("invalid-group");
  while (invalid_groups.length > 0) {
      invalid_groups[0].className = "form-group";
  }
}

