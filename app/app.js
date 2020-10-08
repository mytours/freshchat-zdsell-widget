window.currentUserDetails = {};

$(document).ready(function () {
  app.initialized().then(function (_client) {
    window.client = _client;
    client.events.on("app.activated", onAppActivatedCallback);
    client.events.on("user.onSaveEmailClick", reFetchContactLead);
    client.instance.receive(function (event) {
      var result = event.helper.getData();
      console.log("received data from modal", result);
      startFetching();
      if (result) {
        let type = result.meta.type;
        let data = result.data;
        if (type == "contact") {
          populateContactDetails(data, currentUserDetails["Freshchat User ID"]);
          updateContactId(data.id, currentUserDetails["Freshchat User ID"]);
        } else if (type == "lead") {
          populateLeadDetails(data, currentUserDetails["Freshchat User ID"]);
          updateLeadId(data.id, currentUserDetails["Freshchat User ID"]);
        } else {
          populateEmptyDetails();
        }
      } else {
        populateEmptyDetails();
      }
    });
  });
});

function onAppActivatedCallback() {
  startFetching();
  client.iparams.get().then(
    (iparamsResponse) => {
      window.iparams = iparamsResponse;
      client.data.get("user").then(
        function (data) {
          if (data.user) {
            let user = data.user;
            populateUserDetails(user);
            let IDs = getID(user);
            let user_email = user.email;
            if (IDs && (IDs.contactId || IDs.leadId)) {
              console.log("fetching from ID!!");
              fetchFromZendeskById(IDs.contactId, IDs.leadId).then(
                (result) => {
                  if (result) {
                    let type = result.meta.type;
                    let data = result.data;
                    if (type == "contact") {
                      populateContactDetails(data, user);
                    } else if (type == "lead") {
                      populateLeadDetails(data, user);
                    } else {
                      populateEmptyDetails();
                      removeContactLeadID(
                        currentUserDetails["Freshchat User ID"]
                      );
                    }
                  } else {
                    populateEmptyDetails();
                    removeContactLeadID(
                      currentUserDetails["Freshchat User ID"]
                    );
                  }
                },
                (err) => {
                  console.log("error while getting details from zendesk", err);
                }
              );
            } else if (user_email) {
              console.log("fetching from Email!!");
              fetchFromZendeskByEmail(user_email, "lead").then(
                (result) => {
                  if (result) {
                    let type = result.meta.type;
                    let data = result.data;
                    if (type == "contact") {
                      populateContactDetails(data, user);
                      updateContactId(data.id, user.id);
                    } else if (type == "lead") {
                      populateLeadDetails(data, user);
                      updateLeadId(data.id, user.id);
                    } else {
                      populateEmptyDetails();
                      removeContactLeadID(
                        currentUserDetails["Freshchat User ID"]
                      );
                    }
                  } else {
                    populateEmptyDetails();
                    removeContactLeadID(
                      currentUserDetails["Freshchat User ID"]
                    );
                  }
                },
                (err) => {
                  console.log("error while getting details from zendesk", err);
                }
              );
            } else {
              console.log("No email id found!!");
              noEmailAlert();
            }
            /* getContactLeadId(user.id, (contactId, leadId) => {
              
            }); */
          }
        },
        function (error) {
          console.log("error while getting conversation detail", error);
        }
      );
    },
    (errr) => {
      console.log(errr);
    }
  );
}

function reFetchContactLead(event) {
  startFetching();
  populateUserDetails({ email: event.data });
  fetchFromZendeskByEmail(event.data, "lead").then(
    (result) => {
      if (result) {
        let type = result.meta.type;
        let data = result.data;
        if (type == "contact") {
          populateContactDetails(data, currentUserDetails["Freshchat User ID"]);
          updateContactId(data.id, currentUserDetails["Freshchat User ID"]);
        } else if (type == "lead") {
          populateLeadDetails(data, currentUserDetails["Freshchat User ID"]);
          updateLeadId(data.id, currentUserDetails["Freshchat User ID"]);
        } else {
          populateEmptyDetails();
          removeContactLeadID(currentUserDetails["Freshchat User ID"]);
        }
      } else {
        populateEmptyDetails();
        removeContactLeadID(currentUserDetails["Freshchat User ID"]);
      }
    },
    (err) => {
      console.log("error while getting details from zendesk", err);
    }
  );
}

function fetchFromZendeskByEmail(email, type) {
  let url;
  if (type == "contact") {
    url = `https://api.getbase.com/v2/contacts?email=${email}`;
  } else {
    url = `https://api.getbase.com/v2/leads?email=${email}`;
  }

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
      (res) => {
        let response = JSON.parse(res.response);
        if (response.items.length > 0) {
          let user = response.items[0];
          resolve(user);
        } else {
          if (type == "lead") {
            fetchFromZendeskByEmail(email, "contact").then(
              (result) => {
                if (result) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              },
              (errr) => {
                reject(errr);
              }
            );
          } else {
            resolve(false);
          }
        }
      },
      (err) => {
        console.log("error while getting contact/lead", err);
        reject(err);
      }
    );
  });
}

function fetchFromZendeskById(contactId, leadId) {
  let url;
  if (contactId) {
    url = `https://api.getbase.com/v2/contacts/${contactId}`;
  } else if (leadId) {
    url = `https://api.getbase.com/v2/leads/${leadId}`;
  }

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
      (res) => {
        let response = JSON.parse(res.response);
        if (response.data) {
          resolve(response);
        } else {
          resolve(false);
        }
      },
      (err) => {
        console.log("error while getting contact/lead", err);
        reject(err);
      }
    );
  });
}

function getID(user) {
  let contactId = null,
    leadId = null;
  user.properties.forEach((property) => {
    if (property.name == "zendesk_contact_id" && property.value != "N/A")
      contactId = property.value;
    if (property.name == "zendesk_lead_id" && property.value != "N/A")
      leadId = property.value;
  });
  return {
    contactId: contactId,
    leadId: leadId,
  };
}

/* function getContactLeadId(id, done) {
  let url = `https://api.freshchat.com/v2/users/${id}`;
  let options = {
    headers: {
      Authorization: `Bearer <%=iparam.freshchat_api_token %>`,
      "Content-Type": "application/json",
    },
  };
  client.request.get(url, options).then(
    (response) => {
      console.log(response);
      let contactId = null,
        leadId = null;
      let userDetails = JSON.parse(response.response);
      userDetails.properties.forEach((property) => {
        if (property.name == "zendesk_contact_id" && property.value != "N/A") contactId = property.value;
        if (property.name == "zendesk_lead_id" && property.value != "N/A") leadId = property.value;
      });
      done(contactId, leadId);
    },
    (err) => {
      console.log(err);
      done(null, null);
    }
  );
} */

function removeContactLeadID(id) {
  var url = `https://api.freshchat.com/v2/users/${id}`;
  var options = {
    headers: {
      Authorization: `Bearer <%=iparam.freshchat_api_token %>`,
      "Content-Type": "application/json",
    },
  };
  client.request.get(url, options).then(
    (response) => {
      console.log(response);
      let userDetails = JSON.parse(response.response);
      let ids = userDetails.properties.filter(
        (property) =>
          property.name == "zendesk_contact_id" ||
          property.name == "zendesk_lead_id"
      );
      ids = ids.map((property) => {
        property.value = "N/A";
        return property;
      });
      options.body = JSON.stringify({
        properties: ids,
      });
      client.request.put(url, options).then(
        (response) => {
          console.log(response);
          showNotification(
            "success",
            "Removed Contact ID and Lead ID from the custom properties"
          );
        },
        (err) => {
          console.log(err);
          showNotification(
            "warning",
            "Error occured while removing Contact ID and Lead ID to the custom properties"
          );
        }
      );
    },
    (err) => {
      console.log(err);
      done(null, null);
    }
  );
}
function populateContactDetails(contact, userId) {
  $("#fetching").hide();
  $("#lead-panel").hide();
  $("#contact-panel").hide();
  $("#contact-lead-un-available").hide();
  $("#email-not-found").hide();
  checkUserID(contact, userId, "contact");
  DisplayContactDetails(contact);
  $("#contact-panel").show();
}

function populateLeadDetails(lead, userId) {
  $("#fetching").hide();
  $("#lead-panel").hide();
  $("#contact-panel").hide();
  $("#contact-lead-un-available").hide();
  $("#email-not-found").hide();
  checkUserID(lead, userId, "lead");
  DisplayLeadDetails(lead);
  $("#lead-panel").show();
}

function populateEmptyDetails() {
  $("#fetching").hide();
  $("#lead-details").empty();
  $("#contact-details").empty();
  $("#email-not-found").hide();
  $("#contact-lead-un-available").show();
}

function noEmailAlert() {
  $("#fetching").hide();
  $("#lead-details").empty();
  $("#contact-details").empty();
  $("#lead-panel").hide();
  $("#contact-panel").hide();
  $("#contact-lead-un-available").hide();
  $("#email-not-found").show();
}

function populateUserDetails(user) {
  if (!currentUserDetails["Freshchat User ID"])
    currentUserDetails["Freshchat User ID"] = user.id;
  if (user.email) currentUserDetails["email"] = user.email;
  if (user.phone) currentUserDetails["phone"] = user.phone;
  if (user.first_name) currentUserDetails["first_name"] = user.first_name;
  if (user.last_name) currentUserDetails["last_name"] = user.last_name;
}

function updateContactId(contactId, userId) {
  let url = `https://api.freshchat.com/v2/users/${userId}`;
  let options = {
    headers: {
      Authorization: `Bearer <%=iparam.freshchat_api_token %>`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: [
        {
          name: "zendesk_contact_id",
          value: contactId,
        },
        {
          name: "zendesk_lead_id",
          value: "N/A",
        },
      ],
    }),
  };
  client.request.put(url, options).then(
    (response) => {
      console.log("updated contact id", response);
      showNotification(
        "success",
        "Updated Contact ID to the custom properties"
      );
    },
    (err) => {
      console.log(err);
      showNotification(
        "warning",
        "Error occured while updating Contact ID to the custom properties"
      );
    }
  );
}

function updateLeadId(leadId, userId) {
  let url = `https://api.freshchat.com/v2/users/${userId}`;
  let options = {
    headers: {
      Authorization: `Bearer <%=iparam.freshchat_api_token %>`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: [
        {
          name: "zendesk_lead_id",
          value: leadId,
        },
        {
          name: "zendesk_contact_id",
          value: "N/A",
        },
      ],
    }),
  };
  client.request.put(url, options).then(
    (response) => {
      console.log("updated lead id", response);
      showNotification("success", "Updated Lead ID to the custom properties");
    },
    (err) => {
      console.log(err);
      showNotification(
        "warning",
        "Error occured while updating Lead ID to the custom properties"
      );
    }
  );
}

function DisplayContactDetails(contact) {
  $("#contact-details").empty();
  let hyperlink = ``;
  hyperlink += `<a href="https://app.futuresimple.com/crm/contacts/${contact.id}" target="_blank">View in Zendesk<i class="fas fa-external-link-square-alt"></i></a>`;
  $("#contact-link-panel").html(hyperlink);

  let tableElement = `<table class="detail-table">`;
  iparams.selected_contact_fields.forEach((contacts) => {
    tableElement += `<tr>`;
    let label = (contacts.charAt(0).toUpperCase() + contacts.slice(1)).replace(
      /_|-/g,
      " "
    );
    if (contact[contacts]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${contact[contacts]}">${contact[contacts]}</td>`;
    } else if (contact.custom_fields[contacts]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${contact.custom_fields[contacts]}">${contact.custom_fields[contacts]}</td>`;
    } else if (contact.address[contacts]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${contact.address[contacts]}">${contact.address[contacts]}</td>`;
    } else if (contact.tags[contacts]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${contact.tags[contacts]}">${contact.tags[contacts]}</td>`;
    } else {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value">N/A</td>`;
    }
    tableElement += `</tr>`;
  });
  tableElement += `</table>`;
  $("#contact-details").html(tableElement);
}

function DisplayLeadDetails(lead) {
  $("#lead-details").empty();
  let hyperlink = ``;
  hyperlink += `<a href="https://app.futuresimple.com/leads/${lead.id}" target="_blank">View in Zendesk<i class="fas fa-external-link-square-alt"></i></a>`;
  $("#lead-link-panel").html(hyperlink);

  let tableElement = `<table class="detail-table">`;
  iparams.selected_lead_fields.forEach((leads) => {
    tableElement += `<tr>`;
    let label = (leads.charAt(0).toUpperCase() + leads.slice(1)).replace(
      /_|-/g,
      " "
    );
    if (lead[leads]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${lead[leads]}">${lead[leads]}</td>`;
    } else if (lead.custom_fields[leads]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${lead.custom_fields[leads]}">${lead.custom_fields[leads]}</td>`;
    } else if (lead.address[leads]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${lead.address[leads]}">${lead.address[leads]}</td>`;
    } else if (lead.tags[leads]) {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value" title="${lead.tags[leads]}">${lead.tags[leads]}</td>`;
    } else {
      tableElement += `<td class="property" title="${label}">${label}:</td><td class="value">N/A</td>`;
    }
    tableElement += `</tr>`;
  });
  tableElement += `</table>`;
  $("#lead-details").html(tableElement);
}

function checkUserID(user, userId, userType) {
  if (!user.custom_fields["Freshchat User ID"]) {
    if (userType === "contact") {
      url = `https://api.getbase.com/v2/contacts/${user.id}`;
    } else {
      url = `https://api.getbase.com/v2/leads/${user.id}`;
    }
    let options = {
      headers: {
        Authorization: `Bearer <%=iparam.zendesk_access_token %>`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "PostmanRuntime/7.26.5",
        Accept: "*/*",
      },
      body: JSON.stringify({
        data: {
          custom_fields: {
            "Freshchat User ID": userId,
          },
        },
      }),
    };

    client.request.put(url, options).then(
      (res) => {
        console.log("UUID  Created", res);
        showNotification("success", "Added Freshchat User UUID in Zendesk");
      },
      (err) => {
        console.log("error while creating UUID", err);
        showNotification(
          "warning",
          "Error occcured while adding Freshchat User UUID in Zendesk"
        );
      }
    );
  }
}

function startFetching() {
  $("#contact-details").empty();
  $("#lead-details").empty();
  $("#fetching").show();
  $("#lead-panel").hide();
  $("#contact-panel").hide();
  $("#email-not-found").hide();
  $("#contact-lead-un-available").hide();
}
function showNotification(type, message) {
  client.interface.trigger("showNotify", {
    type: type,
    message: message,
  });
}
function CreateContact() {
  client.interface.trigger("showModal", {
    title: "Create Contact/Lead",
    template: "modal/createContact.html",
    data: currentUserDetails,
  });
}
/* 
function CreateLead() {
  client.interface.trigger("showModal", {
    title: "Create lead",
    template: "modal/createLead.html",
    data: currentUserDetails,
  });
} */
