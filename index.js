const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { QuickDB } = require("quick.db");
const db = new QuickDB();

app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));


(async () => {
  if (!(await db.get("user_collection"))) {
    db.push("user_collection", {});
    db.push("task_collection", {})
  }
})();

function generateUID() {
  length = 16
  const timestamp = Date.now().toString(36);
  const randomNum = Math.random().toString(36).slice(2, 2 + length);
  return timestamp + randomNum;
}


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/users", async (req,res) => {
  let user_collection = await db.get("user_collection")
  let user = user_collection.find(user => user.username == req.body.username)

  if (user) {
    return res.send({ username: user.username , _id: user._id})
  } else {
    let new_user_id = generateUID()
    let new_user = req.body.username; 

   await db.push("user_collection", { username : new_user, _id : new_user_id })

  return res.send({ username : new_user, _id : new_user_id })
  }
})

app.get("/api/users", async(req,res) => {
  let user_collection = await db.get("user_collection")
  user_collection = user_collection.filter(user => user.username)
  return res.send(user_collection)
})



app.post("/api/users/:_id/exercises", async (req,res) => {
  const userId = req.params._id;
  const exerciseData = req.body;

  if (!exerciseData.date) {
    const currentDate = new Date();
    const formattedDate = currentDate.toDateString();

    exerciseData.date = formattedDate
  } else {
    const currentDate = new Date(exerciseData.date);
    const formattedDate = currentDate.toDateString();

    exerciseData.date = formattedDate

  }

  let user_collection = await db.get("user_collection")
  let found_user = user_collection.find(user => user._id == userId)


  if (!found_user) return;


  let new_task = {}
  new_task.description = exerciseData.description
  new_task.duration = parseInt(exerciseData.duration)
  new_task.date = exerciseData.date
  new_task._id = userId
  new_task.username = found_user.username


  await db.push(`task_collection`, new_task)

  return res.send(new_task)

})

/*
app.get("/api/users/:_id/logs", async (req,res) => {
    let task_collection = await db.get("task_collection");
    let userId = req.params._id


    let logs = []
    let count = 0
    let user0 = {}
    task_collection.forEach(task => {
      if (task._id == userId) {
        logs.push({ description: task.description, duration: task.duration, date: task.date })
        count++
        user0.username = task.username
        user0._id = task._id
      }     
    })

    user0.log = logs
    user0.count = count

    return res.send(user0)
})
*/

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query; 
  const userId = req.params._id;
  
  let task_collection = await db.get("task_collection");

  let logs = [];
  let user0 = {};

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  task_collection.forEach(task => {
    if (task._id === userId) {
      const taskDate = new Date(task.date);
      
      if ((!fromDate || taskDate >= fromDate) && (!toDate || taskDate <= toDate)) {
        logs.push({ description: task.description, duration: task.duration, date: task.date });
      }
    }
  });

  logs.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (limit) {
    logs = logs.slice(0, parseInt(limit));
  }

    const user_collection = await db.get("user_collection");
    const found_user = user_collection.find(user => user._id == userId);

    if (found_user) {
      user0.username = found_user.username;
      user0._id = found_user._id;
    }

  user0.log = logs;
  user0.count = logs.length;

  return res.send(user0);
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
