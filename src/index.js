import express from 'express';
import cors from 'cors';
import {MongoClient} from 'mongodb';

const client = new MongoClient("mongodb://127.0.0.1:27017");

let db;
client.connect().then(() => {
    db = client.db("uol_chat_db");
});


const app = express();
app.use(express.json());
app.use(cors());


const participants = [];

app.post("/participants", async (req, res) => {
    const user = req.body;
    if(!user.name || user.name==="") return res.status(422).send("O nome de usuário deve ser informado.");
    if(participants.find((participant) => participant.name == user.name)) return res.status(409).send("Este nome de usuário já existe.");
    try{
        await db.collection("participants").insertOne(user);
        res.status(201).send("OK"); 
    }
    catch (error){
        res.status(400).send("Error");
    }

});



app.listen(5000, ()=> console.log("servidor rodando"));
