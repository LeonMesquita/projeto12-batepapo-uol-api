import dayjs from 'dayjs';
dayjs().format()

import express from 'express';
import cors from 'cors';
import {MongoClient} from 'mongodb';


console.log(dayjs().format("hh:mm:ss"));

const client = new MongoClient("mongodb://127.0.0.1:27017");

let db;
client.connect().then(() => {
    db = client.db("uol_chat_db");
});


const app = express();
app.use(express.json());
app.use(cors());


//const participants = [];

app.post("/participants", async (req, res) => {
    const user = {...req.body, lastStatus: Date.now()};
    
    if(!user.name || user.name==="") return res.status(422).send("O nome de usuário deve ser informado.");
    const participants = await db.collection("participants").find().toArray();
    if(participants.find((participant) => participant.name == user.name)) return res.status(409).send("Este nome de usuário já existe.");
    try{
        await db.collection("participants").insertOne(user);
        res.status(201).send("OK"); 
    }
    catch (error){
        res.status(400).send("Error");
    }

});


app.get("/participants", async (req, res) =>{
    try{
        const participantsList = await db.collection("participants").find().toArray();
        res.send(participantsList);
    } catch(error){
        res.status(400).send("Error!");
    }

});

app.post("/messages", async (req, res) => {
    const message = {...req.body, from: req.headers.user, time: dayjs().format("hh:mm:ss")}
    try{
        await db.collection("messages").insertOne(message);
         console.log(message);
        res.status(201).send("OK");
    } catch(error){
        res.status(400).send(error);
    }
});


app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query["limit"]);
    let contMessages = 0;
    const newMessagesList = [];
    const user = req.headers.user;
    try{
        const messagesList = await db.collection("messages").find().toArray();
        if(!limit) res.send(messagesList);
        for(let count = messagesList.length-1; count >= 0; count--){
            const message = messagesList[count];
            if(message.type === "message" || message.from === user || message.to === user){
                newMessagesList.push(message);
                contMessages++;
            }
            if(contMessages === limit)
                break;
        }
        res.send(newMessagesList);


    } catch(error){

    }

});

app.listen(5000, ()=> console.log("servidor rodando"));
