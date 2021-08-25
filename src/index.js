const core = require("@actions/core");
const fs = require("fs");
const axios = require("axios");
const notionPageEndpoint = 'https://api.notion.com/v1/pages'

async function createOrUpdateInNotion() {
  let event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf-8"));
  console.log(JSON.stringify(event, null, 2))
  event = event["issue"];
  const respo = await createIssue(event);
}

async function createIssue(event) {
  const token = core.getInput('token')
  const dbID = core.getInput('dbID')
  const config = {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2021-08-16" }
  };

  const body = 
  {
    "parent": {
      "database_id": dbID
    },
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

  try {
    const resp = await axios.default.post(notionPageEndpoint, body, config);
    console.log("Response", JSON.stringify(resp.data, null, 2))
    return resp
  } catch (e) {
    console.log(e)
  }
}

createOrUpdateInNotion();


