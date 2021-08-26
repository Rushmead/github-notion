const core = require("@actions/core");
const fs = require("fs");
const axios = require("axios");
const notionPageEndpoint = 'https://api.notion.com/v1/pages'
const token = core.getInput('token')
const dbID = core.getInput('dbID')

async function createOrUpdateInNotion() {
  let event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf-8"));
  event = event["issue"];
  let existingPage = await findIssue(event.number);
  const respo = await createIssue(event, existingPage);
}

async function findIssue(issueNumber) {
  const config = {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2021-05-13" }
  };
  const body = {
    filter: {
      property: "Issue Number",
      number: {
        equals: issueNumber
      }
    }
  };
  try {
    const resp = await axios.default.post(`https://api.notion.com/v1/databases/${dbID}/query`, body, config);
    console.log("Query Response", JSON.stringify(resp.data, null, 2))
    if(resp.data.object === "list"){
      if(resp.data.results.length === 0){
        return null;
      } else {
        return resp.data.reuslts[0];
      }
    } else if(resp.data.object === "page"){
      return resp.data;
    }
  } catch (e) {
    console.log(e)
  }
  return null;
}

async function createIssue(event, existingPage=null) {
  const config = {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2021-05-13" }
  };
  let body = 
  {
    "properties": {
      "Issue Number": {
          "type": "number",
          "number": event.number
      },
      "Issue URL": {
          "type": "url",
          "url": event.html_url
      },
      "User": {
          "type": "select",
          "select": {
              "name": event.user.login
          }
      },
      "Comments": {
          "type": "number",
          "number": event.comments
      },
      "Assignees": {
          "type": "multi_select",
          "multi_select": event.assignees.map(a => { return {"name": a.login}})
      },
      "State": {
          "type": "select",
          "select": {
              "name": event.state
          }
      },
      "Created at": {
          "type": "date",
          "date": {
              "start": event.created_at?event.created_at.replace("Z", "+00:00"):null
          }
      },
      "Title": {
          "id": "title",
          "type": "title",
          "title": [
              {
                  "type": "text",
                  "text": {
                      "content": event.title
                  },
                  "plain_text": event.title
              }
          ]
      }
    }
  }

  if(event.pull_request) {
    body.properties["PR"] = {
        "type": "url",
        "url": event.pull_request.html_url
    };
  }

  if(event.assignee != null) {
    body.properties["Assignee"] = {
      "type": "select",
      "select": {
          "name": event.assignee.login
      }
    }
  }
  
  if (event.closed_at) {
    body["Closed at"] = {
      "type": "date",
      "date": {
          "start": event.closed_at.replace("Z", "+00:00")
      }
    }
  }

  if (event.updated_at) {
    body["Updated at"] = {
      "type": "date",
      "date": {
          "start": event.updated_at.replace("Z", "+00:00")
      }
    }
  }

  if (event.created_at) {
    body["Created at"] = {
      "type": "date",
      "date": {
          "start": event.created_at.replace("Z", "+00:00")
      }
    }
  }
  
  if(existingPage == null) {
    body["parent"] = {
      "database_id": dbID
    };
  }

  try {
    if(existingPage == null){
      const resp = await axios.default.post(notionPageEndpoint, body, config);
      console.log("Create Response", JSON.stringify(resp.data, null, 2))
      return resp
    } else {
      const resp = await axios.default.patch(`https://api.notion.com/v1/pages/${existingPage.id}`, body, config);
      console.log("Update Response", JSON.stringify(resp.data, null, 2))
      return resp
    }
  } catch (e) {
    console.log(e)
  }
}

createOrUpdateInNotion();


