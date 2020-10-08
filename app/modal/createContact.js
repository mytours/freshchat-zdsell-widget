window.customContactFields = [];
window.customLeadFields = [];

window.toBeCreated = 2;

$(document).ready(function () {
  $(".form-control").change(() => {
    removeWarnings();
  });

  app.initialized().then(function (_client) {
    window.client = _client;
    var methodExecuter = [];
    methodExecuter.push(client.iparams.get());
    methodExecuter.push(client.instance.context());

    Promise.all(methodExecuter).then(
      (responses) => {
        window.iparams = responses[0];
        window.currentUser = responses[1].data;

        var fieldGetter = [];
        fieldGetter.push(
          getFields("https://api.getbase.com/v2/contact/custom_fields")
        );
        fieldGetter.push(
          getFields("https://api.getbase.com/v2/lead/custom_fields")
        );

        Promise.all(fieldGetter).then(
          (fieldResponses) => {
            let customContactFieldsResponse = JSON.parse(
              fieldResponses[0].response
            );
            createFields(customContactFieldsResponse.items, "contact");

            let customLeadFieldsResponse = JSON.parse(
              fieldResponses[1].response
            );
            createFields(customLeadFieldsResponse.items, "lead");
            populateFields();
          },
          (fieldErrors) => {
            console.log(
              "error while getting fields",
              JSON.stringify(fieldErrors)
            );
          }
        );
      },
      (errors) => {
        console.log("--->", errors);
      }
    );
  });
});

function populateFields() {
  if (currentUser) {
    enableFields();
    for (const property in currentUser) {
      if (property == "Freshchat User ID") {
        if (document.getElementById(`contact-${property}`)) {
          document.getElementById(`contact-${property}`).value =
            currentUser[property];
        }
        if (document.getElementById(`lead-${property}`)) {
          document.getElementById(`lead-${property}`).value =
            currentUser[property];
        }
      } else if (document.getElementById(property) && property == "email") {
        document.getElementById(property).value = currentUser[property];
      } else if (document.getElementById(property)) {
        document.getElementById(property).value = currentUser[property];
      }
    }
    disableFields();
  }
}

function getFields(url) {
  let options = {
    headers: {
      Authorization: `Bearer <%=iparam.zendesk_access_token %>`,
      "Content-Type": "application/json",
      "User-Agent": "PostmanRuntime/7.26.5",
      Accept: "*/*",
    },
  };
  return new Promise((resolve, reject) => {
    client.request.get(url, options).then(
      (result) => {
        console.log("--->", result);
        resolve(result);
      },
      (err) => {
        console.log("00--->", err);
        reject(err);
      }
    );
  });
}

function createFields(customFields, type) {
  let requiredFields = [];
  customFields.forEach((field) => {
    let fieldDetails = field.data;
    let inputElement = ``;
    switch (fieldDetails.type) {
      case "multi_select_list":
        inputElement = `<fw-select id="${type}-${fieldDetails.name}" label="${fieldDetails.name}" placeholder="Select ${fieldDetails.name}" multiple>`;
        fieldDetails.choices.forEach((choice) => {
          inputElement += `<fw-select-option value="${choice.name}">${choice.name}</fw-select-option>`;
        });
        inputElement += `</fw-select>`;
        requiredFields.push(fieldDetails.name);
        break;
      case "list":
        inputElement = `<fw-select id="${type}-${fieldDetails.name}" label="${fieldDetails.name}" placeholder="Select ${fieldDetails.name}">`;
        fieldDetails.choices.forEach((choice) => {
          inputElement += `<fw-select-option value="${choice.name}">${choice.name}</fw-select-option>`;
        });
        inputElement += `</fw-select>`;
        requiredFields.push(fieldDetails.name);
        break;
      case "string":
        inputElement +=
          `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="text" class="form-control" id="${type}-${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        requiredFields.push(fieldDetails.name);
        break;
      case "date":
        inputElement +=
          `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="date" class="form-control" id="${type}-${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        requiredFields.push(fieldDetails.name);
        break;
      case "address":
        inputElement +=
          `<div class="form-group"><label>${fieldDetails.name}</label>` +
          `<input type="text" class="form-control" id="${type}-${fieldDetails.name}" placeholder="Enter ${fieldDetails.name}">` +
          `</div>`;
        requiredFields.push(fieldDetails.name);
        break;
      default:
        break;
    }
    if (type == "contact") {
      $("#custom-contact-field-panel").append(inputElement);
    } else {
      $("#custom-lead-field-panel").append(inputElement);
    }
  });
  if (type == "contact") {
    customContactFields = requiredFields;
  } else {
    customLeadFields = requiredFields;
  }
}

function createContactLead() {
  let contactDetails = getContactLeadDetails();
  if (contactDetails) {
    let url;
    if (toBeCreated == 1) {
      url = `https://api.getbase.com/v2/contacts`;
    } else {
      url = `https://api.getbase.com/v2/leads`;
    }
    let options = {
      headers: {
        Authorization: `Bearer <%=iparam.zendesk_access_token %>`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "PostmanRuntime/7.26.5",
        Accept: "*/*",
      },
      body: JSON.stringify(contactDetails),
    };
    client.request.post(url, options).then(
      (res) => {
        console.log("Contact  Created", res.response);
        showNotification("success", "Contact/Lead is created");
        setTimeout(() => {
          client.instance.send({
            message: JSON.parse(res.response),
          });
          client.instance.close();
        }, 1000);
      },
      (err) => {
        console.log("error while creating Contact", err);
        showNotification("warning", "Error while creating Contact/Lead");
      }
    );
  }
}

function getContactLeadDetails() {
  enableFields();
  let first_name = $("#first_name").val();
  let last_name = $("#last_name").val();
  let email = $("#email").val();
  let phone = $("#phone").val();
  let contactLeadData = {
    data: {},
  };
  if (last_name != "") {
    contactLeadData.data["last_name"] = last_name;
    if (first_name != "") contactLeadData.data["first_name"] = first_name;
    if (phone != "") contactLeadData.data["phone"] = phone;
    if (email != "") contactLeadData.data["email"] = email;

    let customFieldNames = [];
    let type = "";
    if (toBeCreated == 1) {
      customFieldNames = customContactFields;
      type = "contact";
    } else {
      customFieldNames = customLeadFields;
      type = "lead";
    }

    customFieldNames.forEach((field) => {
      let customValue = document.getElementById(`${type}-${field}`).value;
      if (contactLeadData.data.custom_fields == undefined) {
        contactLeadData.data.custom_fields = {};
      }
      if (customValue != "") {
        contactLeadData.data.custom_fields[field] = customValue;
      }
    });
    return contactLeadData;
  } else {
    disableFields();
    showWarnings(["last-name"]);
    return null;
  }
}

function changeType(type) {
  if (type === 1) {
    removeTabHighlight();
    $("#type-contact").addClass("selected");
    $("#custom-contact-field-panel").show();
    $("#custom-lead-field-panel").hide();
    toBeCreated = 1;
  } else {
    removeTabHighlight();
    $("#type-lead").addClass("selected");
    $("#custom-contact-field-panel").hide();
    $("#custom-lead-field-panel").show();
    toBeCreated = 2;
  }
}

function removeTabHighlight() {
  $("#type-contact").removeClass("selected");
  $("#type-lead").removeClass("selected");
}

// show warning by highlighting the form group
function showWarnings(errors) {
  errors.forEach((error) => {
    $(`#${error}`).addClass("invalid-group");
  });
}

function removeWarnings() {
  let invalid_groups = document.getElementsByClassName("invalid-group");
  while (invalid_groups.length > 0) {
    invalid_groups[0].className = "form-group";
  }
}

function showNotification(type, message) {
  client.interface.trigger("showNotify", {
    type: type,
    message: message,
  });
}

function enableFields() {
  document.getElementById(`contact-Freshchat User ID`).disabled = false;
  document.getElementById(`lead-Freshchat User ID`).disabled = false;
  document.getElementById(`email`).disabled = false;
}

function disableFields() {
  document.getElementById(`contact-Freshchat User ID`).disabled = true;
  document.getElementById(`lead-Freshchat User ID`).disabled = true;
  document.getElementById(`email`).disabled = true;
}
