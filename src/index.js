import dayjs from 'dayjs';
dayjs().format()

import express from 'express';
import cors from 'cors';
import {MongoClient, ObjectId} from 'mongodb';
import joi from 'joi';


console.log(dayjs().format("hh:mm:ss"));

const client = new MongoClient("mongodb://127.0.0.1:27017");

let db;
client.connect().then(() => {
    db = client.db("uol_chat_db");
});


const app = express();
app.use(express.json());
app.use(cors());


const participantSchema = joi.object({
    name: joi.string().required()
});

/*
    email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
*/


const messageSchema = joi.object(
    {
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.any().valid('message', 'private_message'),
        from: joi.string().required(),
        time: joi.string().required()
    }
)


app.post("/participants", async (req, res) => {
    const user = {...req.body, lastStatus: Date.now()};
    const messageBody ={
        from: user.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format("hh:mm:ss")
    };
    
    const validateParticipant = participantSchema.validate(req.body);
    if(validateParticipant.error){
        console.log(user.name)
        res.status(422).send("O nome de usuário deve ser informado.");
        return;
    }
    
    const participants = await db.collection("participants").find().toArray();
    if(participants.find((participant) => participant.name == user.name)) return res.status(409).send("Este nome de usuário já existe.");
    try{
        await db.collection("participants").insertOne(user);
        await db.collection("messages").insertOne(messageBody);
        updateParticipants();
        setInterval(updateParticipants, 15000);
        res.status(201).send("OK"); 
    }
    catch (error){
        res.status(400).send("Error");
    }

});


async function updateParticipants() {
    
    try{
        const participantsList = await db.collection("participants").find().toArray();
        for (let count = 0; count < participantsList.length; count++){
            const participant = participantsList[count];
            const currentTime = Date.now();
            const messageBody ={
                from: participant.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format("hh:mm:ss")
            };
            if(currentTime - participant.lastStatus > 10000){
                await db.collection("participants").deleteOne({name: participant.name});
                await db.collection("messages").insertOne(messageBody);
            }
        }
    } catch(error){

    }
}


app.get("/participants", async (req, res) =>{
    try{
        const participantsList = await db.collection("participants").find().toArray();
        res.send(participantsList);
    } catch(error){
        res.status(400).send("Error!");
    }

});

app.post("/messages", async (req, res) => {
    const messageFrom = await db.collection("participants").findOne({name: req.headers.user});
    const message = {...req.body, from: messageFrom.name, time: dayjs().format("hh:mm:ss")}

    const validateMessage = messageSchema.validate(message);
    if(validateMessage.error){
        res.sendStatus(422);
        return;
    }

    try{
        await db.collection("messages").insertOne(message);
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
        //const messagesList = await db.collection("messages").find({to: user}).toArray();
        if(!limit) res.send(messagesList);
        for(let count = messagesList.length-1; count >= 0; count--){
            const message = messagesList[count];
            if(message.type === "message" || message.type === "status" || message.from === user || message.to === user){
                newMessagesList.unshift(message);
                contMessages++;
            }
            if(contMessages === limit)
                break;
        }
        res.send(newMessagesList);


    } catch(error){

    }

});

app.post("/status", async (req, res) => {
    const userName = req.headers.user;
    const participant = await db.collection("participants").findOne({name: userName});
    if(!participant) {
        return res.sendStatus(404);
    }
    const participantID = participant._id;    
    try{

        await db.collection('participants').updateOne(
            {
                _id: ObjectId(participantID)
            },
            {
                $set: {
                    lastStatus: Date.now()
                }
            }
        );
        res.sendStatus(200);
    } catch(error){
        res.send(400);
    }
});

app.delete("/messages/:message_id", async (req, res) => {
    const messageID = req.params.message_id;
    try{
        const message = await db.collection('messages').findOne({_id: new ObjectId(messageID)});
        if(!message){
            res.sendStatus(404);
            return
        }
        if(message.from !== req.headers.user){
            res.sendStatus(401);
            return
        }
        await db.collection('messages').deleteOne({_id: message._id});
        res.status(200).send("OK");
    }catch(error){
        res.status(400).send("error");
    }
});


app.put("/messages/:message_id", async (req, res) => {
    const messageID = new ObjectId(req.params.message_id);
    const from = req.headers.user;
    const messageBody = {...req.body, from, time: dayjs().format("hh:mm:ss")};

    const validateMessage = messageSchema.validate(messageBody);
    if(validateMessage.error){
        res.sendStatus(422);
        return;
    }
    try{
        const message = await db.collection('messages').findOne({_id: messageID});
        if(!message){
            res.sendStatus(404);
            return
        }
        if(message.from !== from){
            res.sendStatus(401);
            return
        }
        await db.collection('messages').updateOne(
            {_id: message._id},
            {
                $set: { messageBody }
            }
            );
        res.status(200).send("OK");
    }catch(error){
        res.status(400).send("error");
    }
});

app.listen(5000, ()=> console.log("servidor rodando"));
